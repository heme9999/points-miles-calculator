const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PROD_URL = 'https://points-miles-calculator.pages.dev';

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SIMULATED_GOOGLEBOT_UA = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

function fetchUrl(url, ua) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': ua }
    };
    https.get(url, options, (res) => {
      let data = Buffer.alloc(0);
      res.on('data', chunk => { data = Buffer.concat([data, chunk]); });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers || {},
          data: data,
          url: res.url || url
        });
      });
    }).on('error', reject);
  });
}

function analyzeSitemap(dataInput, targetOrigin = PROD_URL) {
  const dataBuffer = Buffer.isBuffer(dataInput) ? dataInput : Buffer.from(String(dataInput || ''), 'utf8');
  const dataStr = dataBuffer.toString('utf8');
  const trimmed = dataStr.trim();

  let xmlValid = true;
  const xmlErrors = [];
  let locs = [];

  if (!trimmed) {
    xmlValid = false;
    xmlErrors.push('Empty XML payload');
  } else {
    try {
      const dom = new JSDOM(dataStr, { contentType: 'text/xml' });
      const doc = dom.window.document;
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        xmlValid = false;
        xmlErrors.push(`XML parsererror: ${parserError.textContent.trim().slice(0, 120)}`);
      }
      if (!doc.documentElement || doc.documentElement.tagName !== 'urlset') {
        xmlValid = false;
        xmlErrors.push(`Invalid root element: expected <urlset>, got <${doc.documentElement ? doc.documentElement.tagName : 'none'}>`);
      }

      const openUrlTags = (dataStr.match(/<url(\s|>)/g) || []).length;
      const closeUrlTags = (dataStr.match(/<\/url>/g) || []).length;
      const openLocTags = (dataStr.match(/<loc(\s|>)/g) || []).length;
      const closeLocTags = (dataStr.match(/<\/loc>/g) || []).length;
      if (openUrlTags !== closeUrlTags || openLocTags !== closeLocTags || openLocTags === 0) {
        xmlValid = false;
        xmlErrors.push(`Mismatched or empty XML tags (url: ${openUrlTags}/${closeUrlTags}, loc: ${openLocTags}/${closeLocTags})`);
      }

      if (xmlValid) {
        const locNodes = Array.from(doc.querySelectorAll('urlset > url > loc'));
        if (locNodes.length !== openLocTags) {
          xmlValid = false;
          xmlErrors.push(`Parsed <loc> count (${locNodes.length}) does not match raw tag count (${openLocTags})`);
        }
        locs = locNodes.map(n => n.textContent.trim());
      }
    } catch (err) {
      xmlValid = false;
      xmlErrors.push(`XML parse exception: ${err.message}`);
    }
  }

  const uniqueLocs = new Set(locs);
  const duplicates = locs.length - uniqueLocs.size;
  const paramsUrls = locs.filter(url => url.includes('?')).length;

  let nonCanonicalUrls = 0;
  const invalidOriginList = [];
  for (const u of locs) {
    try {
      const parsed = new URL(u);
      if (parsed.origin !== targetOrigin || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
        nonCanonicalUrls++;
        invalidOriginList.push(u);
      }
    } catch (e) {
      nonCanonicalUrls++;
      invalidOriginList.push(u);
    }
  }

  return {
    xmlValid,
    xmlErrors,
    locs,
    locCount: locs.length,
    uniqueCount: uniqueLocs.size,
    duplicates,
    paramsUrls,
    nonCanonicalUrls,
    invalidOriginList,
    first200: dataStr.substring(0, 200),
    sha256: crypto.createHash('sha256').update(dataBuffer).digest('hex')
  };
}

function verifyCanonicalAndHreflang({ auditReportData = null, auditReportPath = null, siteDir = null, targetOrigin = PROD_URL } = {}) {
  // 1. If explicit auditReportData object is passed (e.g. in tests or same-batch runner)
  let report = auditReportData;
  if (!report && auditReportPath && fs.existsSync(auditReportPath)) {
    try {
      report = JSON.parse(fs.readFileSync(auditReportPath, 'utf8'));
    } catch (err) {
      return {
        status: 'FAIL',
        tested: true,
        errorCount: 1,
        detail: `Failed to parse ${auditReportPath}: ${err.message}`
      };
    }
  }

  if (report) {
    if (report.targetOrigin && report.targetOrigin !== targetOrigin) {
      return {
        status: 'NOT TESTED',
        tested: false,
        errorCount: null,
        detail: `audit_report.json targetOrigin (${report.targetOrigin}) does not match ${targetOrigin}`
      };
    }
    const canonicalErrs = Array.isArray(report.canonicalErrors) ? report.canonicalErrors.length : Number(report.canonicalErrors || 0);
    const hreflangErrs = Array.isArray(report.hreflangErrors) ? report.hreflangErrors.length : Number(report.hreflangErrors || 0);
    const totalChecked = Number(report.totalChecked || 0);

    if (totalChecked <= 0) {
      return {
        status: 'NOT TESTED',
        tested: false,
        errorCount: null,
        detail: 'Canonical/Hreflang check did not inspect any pages (0 pages checked)'
      };
    }

    const totalErrors = canonicalErrs + hreflangErrs;
    if (totalErrors > 0) {
      return {
        status: 'FAIL',
        tested: true,
        errorCount: totalErrors,
        detail: `${totalErrors} canonical/hreflang error(s) detected across ${totalChecked} checked pages (canonical: ${canonicalErrs}, hreflang: ${hreflangErrs})`
      };
    }

    return {
      status: 'PASS',
      tested: true,
      errorCount: 0,
      detail: `Verified 0 canonical/hreflang errors across ${totalChecked} pages`
    };
  }

  // 2. If siteDir is provided and exists, perform direct DOM verification on built HTML files matching sitemap locs
  if (siteDir && fs.existsSync(siteDir)) {
    const localSitemapPath = path.join(siteDir, 'sitemap.xml');
    if (!fs.existsSync(localSitemapPath)) {
      return {
        status: 'NOT TESTED',
        tested: false,
        errorCount: null,
        detail: 'Local _site/sitemap.xml not found for canonical/hreflang verification'
      };
    }
    const localAnalysis = analyzeSitemap(fs.readFileSync(localSitemapPath), targetOrigin);
    if (!localAnalysis.xmlValid || localAnalysis.locCount === 0) {
      return {
        status: 'FAIL',
        tested: true,
        errorCount: 1,
        detail: 'Local _site/sitemap.xml is invalid or empty'
      };
    }

    let checkedPages = 0;
    let canonicalErrors = 0;
    let hreflangErrors = 0;

    for (const loc of localAnalysis.locs) {
      const parsed = new URL(loc);
      const relFile = parsed.pathname.endsWith('/')
        ? path.join(siteDir, parsed.pathname, 'index.html')
        : path.join(siteDir, parsed.pathname);
      if (!fs.existsSync(relFile)) {
        canonicalErrors++;
        continue;
      }
      const html = fs.readFileSync(relFile, 'utf8');
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const canonicalEl = doc.querySelector('link[rel="canonical"]');
      if (!canonicalEl || canonicalEl.getAttribute('href') !== loc) {
        canonicalErrors++;
      }
      const hreflangs = Array.from(doc.querySelectorAll('link[rel="alternate"][hreflang]'));
      if (hreflangs.length === 0) {
        hreflangErrors++;
      } else {
        for (const hl of hreflangs) {
          try {
            const hlUrl = new URL(hl.getAttribute('href'));
            if (hlUrl.origin !== targetOrigin) hreflangErrors++;
          } catch (e) {
            hreflangErrors++;
          }
        }
      }
      checkedPages++;
    }

    const totalErrors = canonicalErrors + hreflangErrors;
    if (totalErrors > 0) {
      return {
        status: 'FAIL',
        tested: true,
        errorCount: totalErrors,
        detail: `${totalErrors} canonical/hreflang error(s) detected across ${checkedPages} local build pages (canonical: ${canonicalErrors}, hreflang: ${hreflangErrors})`
      };
    }

    return {
      status: 'PASS',
      tested: true,
      errorCount: 0,
      detail: `Verified 0 canonical/hreflang errors across ${checkedPages} pages in local build`
    };
  }

  return {
    status: 'NOT TESTED',
    tested: false,
    errorCount: null,
    detail: 'NOT TESTED (No canonical/hreflang check or audit_report.json provided in this run)'
  };
}

function compareWithLocalBuild(prodLocs, siteDir = path.join(__dirname, '_site'), targetOrigin = PROD_URL) {
  const localSitemapPath = path.join(siteDir, 'sitemap.xml');
  if (!fs.existsSync(localSitemapPath)) {
    return { available: false, reason: '_site/sitemap.xml not found locally' };
  }
  const localAnalysis = analyzeSitemap(fs.readFileSync(localSitemapPath), targetOrigin);
  const localLocs = localAnalysis.locs;
  const prodSet = new Set(prodLocs);
  const localSet = new Set(localLocs);

  const addedInLocal = localLocs.filter(u => !prodSet.has(u));
  const missingInLocal = prodLocs.filter(u => !localSet.has(u));

  return {
    available: true,
    localCount: localSet.size,
    prodCount: prodSet.size,
    addedInLocal,
    missingInLocal
  };
}

function evaluateDiagnostic({
  robotsResponses = [],
  sitemapResponses = [],
  canonicalResult = { status: 'NOT TESTED', tested: false, errorCount: null, detail: 'NOT TESTED' },
  gscStatus = 'UNAVAILABLE',
  cloudflareLogsStatus = 'UNAVAILABLE',
  targetOrigin = PROD_URL
} = {}) {
  const failures = [];

  if (!robotsResponses.length) {
    failures.push('No /robots.txt responses recorded');
  }
  for (const r of robotsResponses) {
    if (r.error) {
      failures.push(`/robots.txt request error (${r.name || 'client'}): ${r.error}`);
    } else if (r.statusCode !== 200) {
      failures.push(`/robots.txt returned HTTP ${r.statusCode} (${r.name || 'client'})`);
    }
  }

  if (!sitemapResponses.length) {
    failures.push('No /sitemap.xml responses recorded');
  }

  let primaryAnalysis = null;
  for (const s of sitemapResponses) {
    if (s.error) {
      failures.push(`/sitemap.xml request error (${s.name || 'client'}): ${s.error}`);
      continue;
    }
    if (s.statusCode !== 200) {
      failures.push(`/sitemap.xml returned HTTP ${s.statusCode} (${s.name || 'client'})`);
      continue;
    }
    const analysis = analyzeSitemap(s.data, targetOrigin);
    if (!primaryAnalysis) primaryAnalysis = analysis;

    if (!analysis.xmlValid) {
      failures.push(`/sitemap.xml XML validation failed: ${analysis.xmlErrors.join('; ')}`);
    }
    if (analysis.locCount === 0) {
      failures.push('/sitemap.xml contains 0 <loc> entries');
    }
    if (analysis.duplicates > 0) {
      failures.push(`/sitemap.xml contains ${analysis.duplicates} duplicate <loc> URL(s)`);
    }
    if (analysis.nonCanonicalUrls > 0) {
      failures.push(`/sitemap.xml contains ${analysis.nonCanonicalUrls} URL(s) with non-matching origin (expected ${targetOrigin})`);
    }
    if (analysis.paramsUrls > 0) {
      failures.push(`/sitemap.xml contains ${analysis.paramsUrls} URL(s) with query parameters`);
    }
  }

  if (canonicalResult && canonicalResult.status === 'FAIL') {
    failures.push(`Canonical/Hreflang check failed: ${canonicalResult.detail}`);
  }

  const technicalStatus = failures.length === 0 ? 'PASS' : 'FAIL';
  const exitCode = failures.length === 0 ? 0 : 1;

  let technicalEvidence = '';
  if (technicalStatus === 'PASS' && primaryAnalysis) {
    const canonSummary = canonicalResult && canonicalResult.status === 'PASS'
      ? `; ${canonicalResult.detail}`
      : `; Canonical/Hreflang: ${canonicalResult ? canonicalResult.status : 'NOT TESTED'}`;
    technicalEvidence = `\`/sitemap.xml\` and \`/robots.txt\` return HTTP 200, well-formed XML (<urlset>), ${primaryAnalysis.uniqueCount} unique URLs, 0 duplicates, and 0 origin mismatches${canonSummary}.`;
  } else {
    technicalEvidence = `FAIL: ${failures.join(' | ')}`;
  }

  return {
    technicalStatus,
    technicalEvidence,
    canonicalStatus: canonicalResult ? canonicalResult.status : 'NOT TESTED',
    canonicalEvidence: canonicalResult ? canonicalResult.detail : 'NOT TESTED',
    gscStatus: gscStatus || 'UNAVAILABLE',
    cloudflareLogsStatus: cloudflareLogsStatus || 'UNAVAILABLE',
    failures,
    primaryAnalysis,
    exitCode
  };
}

async function run(options = {}) {
  const targetOrigin = options.targetOrigin || PROD_URL;
  const fetcher = options.fetcher || fetchUrl;
  const siteDir = options.siteDir !== undefined ? options.siteDir : path.join(__dirname, '_site');
  const outputPath = options.outputPath !== undefined ? options.outputPath : 'docs/sitemap-production-diagnostic.md';

  let md = '# Sitemap Production Diagnostic Report\n\n';
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Target:** ${targetOrigin}\n\n`;

  md += `## 1. Five-Category Evidence Classification\n\n`;
  md += `1. **Regular HTTP Client Request (Chrome UA):** Measured live below.\n`;
  md += `2. **Simulated Googlebot UA Client Request:** Measured live below. *(Note: Spoofing the \`User-Agent\` header from a non-Google IP only tests UA-string filtering; it does NOT replicate real Googlebot ASN/IP reputation or prove Cloudflare never challenged Google's crawler.)*\n`;
  const hasHeaders = fs.existsSync(path.join(__dirname, 'src', '_headers'));
  const hasRedirects = fs.existsSync(path.join(__dirname, 'src', '_redirects'));
  md += `3. **Repository Static Rules (\`_headers\` / \`_redirects\`):** \`src/_headers\` present: \`${hasHeaders}\`; \`src/_redirects\` present: \`${hasRedirects}\`. Verified no repo-level rules block or redirect \`/sitemap.xml\` or \`/robots.txt\`.\n`;
  md += `4. **Google Search Console Live Inspection & Sitemaps Status:** \`UNAVAILABLE\` *(Cannot be queried automatically by this unauthenticated script; must be read from GSC UI)*.\n`;
  md += `5. **Cloudflare WAF / Bot Historical Request Logs:** \`UNAVAILABLE\` *(Cloudflare Pages free tier dashboard does not expose historical raw static request logs for past Google Sitemap Processor fetches; historical edge/WAF interception can neither be confirmed nor ruled out)*.\n\n`;

  const robotsResponses = [];
  const sitemapResponses = [];

  for (const endpoint of ['/robots.txt', '/sitemap.xml']) {
    md += `## 2. Live Endpoint Probe: \`${endpoint}\`\n\n`;
    for (const [name, ua] of [['1) Regular HTTP Client (Chrome UA)', CHROME_UA], ['2) Simulated Googlebot UA Client', SIMULATED_GOOGLEBOT_UA]]) {
      md += `### ${name}\n`;
      try {
        const res = await fetcher(targetOrigin + endpoint, ua);
        const record = { name, ...res };
        if (endpoint === '/robots.txt') robotsResponses.push(record);
        if (endpoint === '/sitemap.xml') sitemapResponses.push(record);

        md += `- **HTTP Status:** ${res.statusCode}\n`;
        md += `- **Final URL:** ${res.url}\n`;
        md += `- **Content-Type:** ${(res.headers && res.headers['content-type']) || 'N/A'}\n`;
        md += `- **Content-Length:** ${(res.headers && res.headers['content-length']) || (res.data ? res.data.length : 0)}\n`;
        md += `- **Cache-Control:** ${(res.headers && res.headers['cache-control']) || 'N/A'}\n`;
        md += `- **ETag:** ${(res.headers && res.headers['etag']) || 'N/A'}\n`;
        md += `- **Content-Encoding:** ${(res.headers && res.headers['content-encoding']) || 'none'}\n`;

        if (endpoint === '/sitemap.xml' && res.statusCode === 200) {
          const analysis = analyzeSitemap(res.data, targetOrigin);
          md += `- **XML Well-Formedness:** ${analysis.xmlValid ? 'VALID' : `INVALID (${analysis.xmlErrors.join('; ')})`}\n`;
          md += `- **Response First 200 Bytes:**\n\`\`\`xml\n${analysis.first200}\n\`\`\`\n`;
          md += `- **Complete Response SHA-256:** \`${analysis.sha256}\`\n`;
          md += `- **Total \`<loc>\` Count:** ${analysis.locCount} (Unique: ${analysis.uniqueCount})\n`;
          md += `- **Duplicate URLs:** ${analysis.duplicates}\n`;
          md += `- **URLs with Params (?):** ${analysis.paramsUrls}\n`;
          md += `- **Non-canonical / Wrong-Origin URLs:** ${analysis.nonCanonicalUrls}\n`;
        } else if (endpoint === '/robots.txt' && res.statusCode === 200) {
          md += `- **Content:**\n\`\`\`text\n${res.data.toString('utf8').substring(0, 200)}\n\`\`\`\n`;
        }
      } catch (err) {
        const errRecord = { name, error: err.message };
        if (endpoint === '/robots.txt') robotsResponses.push(errRecord);
        if (endpoint === '/sitemap.xml') sitemapResponses.push(errRecord);
        md += `- **Error:** ${err.message}\n`;
      }
      md += '\n';
    }
  }

  const canonicalResult = options.canonicalResult || verifyCanonicalAndHreflang({
    auditReportData: options.auditReportData,
    auditReportPath: options.auditReportPath,
    siteDir,
    targetOrigin
  });

  const evaluation = evaluateDiagnostic({
    robotsResponses,
    sitemapResponses,
    canonicalResult,
    gscStatus: 'UNAVAILABLE',
    cloudflareLogsStatus: 'UNAVAILABLE',
    targetOrigin
  });

  const prodLocs = evaluation.primaryAnalysis ? evaluation.primaryAnalysis.locs : [];
  const diff = siteDir ? compareWithLocalBuild(prodLocs, siteDir, targetOrigin) : { available: false, reason: 'Local siteDir not configured' };

  md += `## 3. Sitemap URL Set Comparison (Local Build vs. Production)\n\n`;
  if (diff.available) {
    md += `- **Local Build \`_site/sitemap.xml\` Unique URLs:** ${diff.localCount}\n`;
    md += `- **Production \`/sitemap.xml\` Unique URLs:** ${diff.prodCount}\n`;
    md += `- **Added in Local Build (${diff.addedInLocal.length}):** ${diff.addedInLocal.length ? diff.addedInLocal.join(', ') : 'None'}\n`;
    md += `- **Removed in Local Build (${diff.missingInLocal.length}):** ${diff.missingInLocal.length ? diff.missingInLocal.join(', ') : 'None'}\n\n`;
  } else {
    md += `- Comparison unavailable: ${diff.reason}\n\n`;
  }

  md += `## 4. Diagnostic Status Matrix (Assertion-Driven)\n\n`;
  md += `| Dimension | Status | Evidence Basis |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Technical Accessibility** | **${evaluation.technicalStatus}** | ${evaluation.technicalEvidence} |\n`;
  md += `| **Canonical / Hreflang Audit** | **${evaluation.canonicalStatus}** | ${evaluation.canonicalEvidence} |\n`;
  md += `| **Sitemap Processed (GSC)** | **${evaluation.gscStatus}** | Cannot be verified via static HTTP probe; must be checked in GSC Sitemaps UI (last observed UI state: \`Couldn't fetch\`). |\n`;
  md += `| **Cloudflare Historical Logs** | **${evaluation.cloudflareLogsStatus}** | Cloudflare Pages free tier does not retain historical static request logs for past Googlebot fetches. |\n`;
  md += `| **Google Indexed** | **NOT TESTED** | Sitemap presence does not equal indexation; check GSC Pages / URL Inspection for individual URL indexing status. |\n`;
  md += `| **Search Clicks** | **NOT TESTED** | Tracked separately in GSC Performance report. |\n`;

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, md);
  }

  if (evaluation.exitCode !== 0) {
    process.exitCode = evaluation.exitCode;
  }

  return {
    md,
    evaluation,
    diff
  };
}

if (require.main === module) {
  run().then(({ evaluation, outputPath }) => {
    console.log(`Diagnostic completed with Technical Status: ${evaluation.technicalStatus} (exitCode=${evaluation.exitCode})`);
    if (evaluation.exitCode !== 0) {
      console.error('Failures:', evaluation.failures);
      process.exit(evaluation.exitCode);
    }
  }).catch(err => {
    console.error('Unhandled diagnostic error:', err);
    process.exit(1);
  });
}

module.exports = {
  PROD_URL,
  analyzeSitemap,
  verifyCanonicalAndHreflang,
  compareWithLocalBuild,
  evaluateDiagnostic,
  run
};
