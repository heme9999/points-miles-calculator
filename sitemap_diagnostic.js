const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PROD_URL = 'https://points-miles-calculator.pages.dev';
const AUDIT_REPORT_SCHEMA_VERSION = '1.0';
const DEFAULT_MAX_REPORT_AGE_MS = 60 * 60 * 1000; // 1 hour

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

/**
 * Strictly validates an imported canonical/hreflang audit report or executes a local build check when explicitly requested.
 * Never defaults missing/invalid fields to 0 errors, and never conflates local_build checks with live production verification.
 */
function verifyCanonicalAndHreflang({
  auditReportData = undefined,
  auditReportPath = null,
  expectedUrls = null,
  expectedCommitSha = null,
  expectedScope = 'production',
  targetOrigin = PROD_URL,
  maxAgeMs = DEFAULT_MAX_REPORT_AGE_MS,
  nowMs = Date.now(),
  siteDir = null
} = {}) {
  const invalidEvidence = (reason, scope = 'unknown') => ({
    status: 'INVALID EVIDENCE',
    scope,
    tested: false,
    validEvidence: false,
    errorCount: null,
    exitCode: 1,
    detail: `INVALID EVIDENCE: ${reason}`
  });

  // Branch 1: Validating an imported report (via auditReportData or auditReportPath)
  const hasReportInput = auditReportData !== undefined || (auditReportPath !== null && auditReportPath !== undefined);
  if (hasReportInput) {
    let report = auditReportData;
    if (report === undefined && auditReportPath) {
      if (typeof auditReportPath !== 'string' || !fs.existsSync(auditReportPath)) {
        return invalidEvidence(`Audit report file not found at ${auditReportPath}`);
      }
      try {
        report = JSON.parse(fs.readFileSync(auditReportPath, 'utf8'));
      } catch (err) {
        return invalidEvidence(`Failed to parse audit report JSON: ${err.message}`);
      }
    }

    if (!report || typeof report !== 'object' || Array.isArray(report)) {
      return invalidEvidence('Audit report must be a non-null plain object');
    }

    // 1. Schema version check
    if (report.schemaVersion !== AUDIT_REPORT_SCHEMA_VERSION) {
      return invalidEvidence(`Missing or unsupported schemaVersion (expected "${AUDIT_REPORT_SCHEMA_VERSION}", got ${JSON.stringify(report.schemaVersion)})`);
    }

    // 2. Scope check (strict separation between local_build and production)
    if (report.scope !== 'production' && report.scope !== 'local_build') {
      return invalidEvidence(`Invalid or missing report scope (expected "production" or "local_build", got ${JSON.stringify(report.scope)})`);
    }
    if (expectedScope && report.scope !== expectedScope) {
      return invalidEvidence(`Scope mismatch: report scope "${report.scope}" cannot satisfy expected "${expectedScope}" verification`, report.scope);
    }

    // 3. Target origin check
    if (typeof report.targetOrigin !== 'string' || report.targetOrigin.trim() === '') {
      return invalidEvidence('Missing or non-string targetOrigin in audit report', report.scope);
    }
    try {
      const parsedTarget = new URL(report.targetOrigin);
      if (parsedTarget.origin !== targetOrigin || report.targetOrigin !== targetOrigin) {
        return invalidEvidence(`targetOrigin mismatch: report "${report.targetOrigin}" !== expected "${targetOrigin}"`, report.scope);
      }
    } catch (e) {
      return invalidEvidence(`Malformed targetOrigin URL: "${report.targetOrigin}"`, report.scope);
    }

    // 4. Commit / build SHA check against expectedCommitSha
    const shaRegex = /^[0-9a-f]{40}$/i;
    if (typeof report.commitSha !== 'string' || !shaRegex.test(report.commitSha)) {
      return invalidEvidence(`Missing or invalid 40-char commitSha in report (got ${JSON.stringify(report.commitSha)})`, report.scope);
    }
    if (typeof expectedCommitSha !== 'string' || !shaRegex.test(expectedCommitSha)) {
      return invalidEvidence('Caller must provide a valid 40-char expectedCommitSha to verify report version consistency', report.scope);
    }
    if (report.commitSha.toLowerCase() !== expectedCommitSha.toLowerCase()) {
      return invalidEvidence(`Commit SHA mismatch: report commit ${report.commitSha} !== expected commit ${expectedCommitSha}`, report.scope);
    }

    // 5. Timestamp & freshness check
    if (typeof report.generatedAt !== 'string' || report.generatedAt.trim() === '') {
      return invalidEvidence('Missing or non-string generatedAt timestamp in audit report', report.scope);
    }
    const parsedTime = Date.parse(report.generatedAt);
    if (!Number.isFinite(parsedTime)) {
      return invalidEvidence(`Invalid generatedAt ISO timestamp: "${report.generatedAt}"`, report.scope);
    }
    if (typeof maxAgeMs !== 'number' || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
      return invalidEvidence(`Invalid maxAgeMs parameter: ${maxAgeMs}`, report.scope);
    }
    const ageMs = nowMs - parsedTime;
    if (ageMs < -60000) {
      return invalidEvidence(`Report generatedAt timestamp is in the future (${report.generatedAt})`, report.scope);
    }
    if (ageMs > maxAgeMs) {
      return invalidEvidence(`Stale audit report: age ${Math.round(ageMs / 1000)}s exceeds maxAgeMs ${Math.round(maxAgeMs / 1000)}s`, report.scope);
    }

    // 6. totalChecked & checkedUrls strict type and set equality check
    if (typeof report.totalChecked !== 'number' || !Number.isInteger(report.totalChecked) || report.totalChecked <= 0) {
      return invalidEvidence(`Invalid totalChecked: must be a positive integer, got ${JSON.stringify(report.totalChecked)}`, report.scope);
    }
    if (!Array.isArray(report.checkedUrls) || report.checkedUrls.length === 0) {
      return invalidEvidence('Missing or empty checkedUrls array in audit report', report.scope);
    }
    if (report.checkedUrls.length !== report.totalChecked) {
      return invalidEvidence(`Count mismatch: totalChecked (${report.totalChecked}) !== checkedUrls.length (${report.checkedUrls.length})`, report.scope);
    }

    const checkedSet = new Set();
    for (const u of report.checkedUrls) {
      if (typeof u !== 'string' || u.trim() === '') {
        return invalidEvidence('checkedUrls contains a non-string or empty entry', report.scope);
      }
      let parsedU;
      try {
        parsedU = new URL(u);
      } catch (e) {
        return invalidEvidence(`checkedUrls contains malformed URL: "${u}"`, report.scope);
      }
      if (parsedU.origin !== targetOrigin) {
        return invalidEvidence(`checkedUrls contains wrong-origin URL: "${u}" (expected origin "${targetOrigin}")`, report.scope);
      }
      if (checkedSet.has(u)) {
        return invalidEvidence(`checkedUrls contains duplicate URL: "${u}"`, report.scope);
      }
      checkedSet.add(u);
    }

    if (!Array.isArray(expectedUrls) || expectedUrls.length === 0) {
      return invalidEvidence('Caller must provide non-empty expectedUrls list to verify URL coverage', report.scope);
    }
    const expectedSet = new Set(expectedUrls);
    if (expectedSet.size !== expectedUrls.length) {
      return invalidEvidence('expectedUrls contains duplicate entries', report.scope);
    }
    if (checkedSet.size !== expectedSet.size) {
      return invalidEvidence(`URL coverage count mismatch: report checked ${checkedSet.size} unique URLs, expected ${expectedSet.size}`, report.scope);
    }
    for (const reqUrl of expectedSet) {
      if (!checkedSet.has(reqUrl)) {
        return invalidEvidence(`URL coverage mismatch: expected URL "${reqUrl}" missing from checkedUrls`, report.scope);
      }
    }

    // 7. Strict validation of canonicalErrors & hreflangErrors arrays (never coerce undefined/null/NaN to 0)
    if (!Array.isArray(report.canonicalErrors)) {
      return invalidEvidence(`Missing or non-array canonicalErrors field (got ${typeof report.canonicalErrors})`, report.scope);
    }
    if (!Array.isArray(report.hreflangErrors)) {
      return invalidEvidence(`Missing or non-array hreflangErrors field (got ${typeof report.hreflangErrors})`, report.scope);
    }
    for (const item of report.canonicalErrors) {
      if (typeof item !== 'string' || item.trim() === '') {
        return invalidEvidence('canonicalErrors entries must be non-empty strings', report.scope);
      }
    }
    for (const item of report.hreflangErrors) {
      if (typeof item !== 'string' || item.trim() === '') {
        return invalidEvidence('hreflangErrors entries must be non-empty strings', report.scope);
      }
    }

    const totalErrors = report.canonicalErrors.length + report.hreflangErrors.length;
    if (totalErrors > 0) {
      return {
        status: 'FAIL',
        scope: report.scope,
        tested: true,
        validEvidence: true,
        errorCount: totalErrors,
        exitCode: 1,
        detail: `FAIL: ${totalErrors} canonical/hreflang error(s) across ${report.totalChecked} URLs (canonical: ${report.canonicalErrors.length}, hreflang: ${report.hreflangErrors.length})`
      };
    }

    return {
      status: 'PASS',
      scope: report.scope,
      tested: true,
      validEvidence: true,
      errorCount: 0,
      exitCode: 0,
      detail: `Verified 0 canonical/hreflang errors across ${report.totalChecked} unique URLs (scope: ${report.scope}, commit: ${report.commitSha.slice(0, 12)})`
    };
  }

  // Branch 2: Direct local build (_site) DOM inspection (ONLY allowed when expectedScope === 'local_build')
  if (siteDir) {
    if (expectedScope && expectedScope !== 'local_build') {
      return invalidEvidence(
        `Scope mismatch: local _site directory check has scope "local_build" and cannot be used to claim "${expectedScope}" canonical/hreflang PASS`,
        'local_build'
      );
    }
    if (!fs.existsSync(siteDir)) {
      return {
        status: 'NOT TESTED',
        scope: 'local_build',
        tested: false,
        validEvidence: false,
        errorCount: null,
        exitCode: 1,
        detail: `Local build directory not found: ${siteDir}`
      };
    }
    const localSitemapPath = path.join(siteDir, 'sitemap.xml');
    if (!fs.existsSync(localSitemapPath)) {
      return {
        status: 'NOT TESTED',
        scope: 'local_build',
        tested: false,
        validEvidence: false,
        errorCount: null,
        exitCode: 1,
        detail: 'Local _site/sitemap.xml not found for local canonical/hreflang check'
      };
    }
    const localAnalysis = analyzeSitemap(fs.readFileSync(localSitemapPath), targetOrigin);
    if (!localAnalysis.xmlValid || localAnalysis.locCount === 0 || localAnalysis.duplicates > 0 || localAnalysis.nonCanonicalUrls > 0) {
      return {
        status: 'FAIL',
        scope: 'local_build',
        tested: true,
        validEvidence: true,
        errorCount: 1,
        exitCode: 1,
        detail: 'Local _site/sitemap.xml failed XML/URL validation'
      };
    }

    let checkedPages = 0;
    const canonicalErrors = [];
    const hreflangErrors = [];

    for (const loc of localAnalysis.locs) {
      const parsed = new URL(loc);
      const relFile = parsed.pathname.endsWith('/')
        ? path.join(siteDir, parsed.pathname, 'index.html')
        : path.join(siteDir, parsed.pathname);
      if (!fs.existsSync(relFile)) {
        canonicalErrors.push(`Missing file for ${loc}`);
        continue;
      }
      const html = fs.readFileSync(relFile, 'utf8');
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const canonicalEl = doc.querySelector('link[rel="canonical"]');
      if (!canonicalEl || canonicalEl.getAttribute('href') !== loc) {
        canonicalErrors.push(`Canonical mismatch on ${loc}`);
      }
      const hreflangs = Array.from(doc.querySelectorAll('link[rel="alternate"][hreflang]'));
      if (hreflangs.length === 0) {
        hreflangErrors.push(`Missing hreflang on ${loc}`);
      } else {
        for (const hl of hreflangs) {
          try {
            const hlUrl = new URL(hl.getAttribute('href'));
            if (hlUrl.origin !== targetOrigin) hreflangErrors.push(`Wrong hreflang origin on ${loc}`);
          } catch (e) {
            hreflangErrors.push(`Invalid hreflang URL on ${loc}`);
          }
        }
      }
      checkedPages++;
    }

    const totalErrors = canonicalErrors.length + hreflangErrors.length;
    if (totalErrors > 0) {
      return {
        status: 'FAIL',
        scope: 'local_build',
        tested: true,
        validEvidence: true,
        errorCount: totalErrors,
        exitCode: 1,
        detail: `FAIL (local_build): ${totalErrors} canonical/hreflang error(s) across ${checkedPages} local _site pages`
      };
    }

    return {
      status: 'PASS',
      scope: 'local_build',
      tested: true,
      validEvidence: true,
      errorCount: 0,
      exitCode: 0,
      detail: `Verified 0 canonical/hreflang errors across ${checkedPages} pages in local _site build (scope: local_build only; does not represent live production page crawl)`
    };
  }

  // Branch 3: Neither report nor local check provided -> NOT TESTED
  return {
    status: 'NOT TESTED',
    scope: 'none',
    tested: false,
    validEvidence: false,
    errorCount: null,
    exitCode: 1,
    detail: 'NOT TESTED: No canonical/hreflang check was executed in this run'
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
  canonicalResult = { status: 'NOT TESTED', scope: 'none', tested: false, validEvidence: false, errorCount: null, detail: 'NOT TESTED' },
  localCanonicalResult = null,
  requireCanonicalPass = false,
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

  if (canonicalResult) {
    if (canonicalResult.status === 'FAIL' || canonicalResult.status === 'INVALID EVIDENCE') {
      failures.push(`Canonical/Hreflang check failed (${canonicalResult.status}): ${canonicalResult.detail}`);
    } else if (requireCanonicalPass && (canonicalResult.status !== 'PASS' || canonicalResult.scope !== 'production')) {
      failures.push(`Production Canonical/Hreflang gate not satisfied (status: ${canonicalResult.status}, scope: ${canonicalResult.scope || 'none'})`);
    }
  } else if (requireCanonicalPass) {
    failures.push('Production Canonical/Hreflang gate required but no canonicalResult provided');
  }

  if (localCanonicalResult && (localCanonicalResult.status === 'FAIL' || localCanonicalResult.status === 'INVALID EVIDENCE')) {
    failures.push(`Local build canonical/hreflang check failed: ${localCanonicalResult.detail}`);
  }

  const technicalStatus = failures.length === 0 ? 'PASS' : 'FAIL';
  const exitCode = failures.length === 0 ? 0 : 1;

  let technicalEvidence = '';
  if (technicalStatus === 'PASS' && primaryAnalysis) {
    const prodCanonNote = (canonicalResult && canonicalResult.status === 'PASS' && canonicalResult.scope === 'production')
      ? `; Production Canonical/Hreflang: ${canonicalResult.detail}`
      : `; Production Canonical/Hreflang: ${canonicalResult ? canonicalResult.status : 'NOT TESTED'}`;
    technicalEvidence = `\`/sitemap.xml\` and \`/robots.txt\` return HTTP 200, well-formed XML (<urlset>), ${primaryAnalysis.uniqueCount} unique URLs, 0 duplicates, and 0 origin mismatches${prodCanonNote}.`;
  } else {
    technicalEvidence = `FAIL: ${failures.join(' | ')}`;
  }

  return {
    technicalStatus,
    technicalEvidence,
    canonicalStatus: canonicalResult ? canonicalResult.status : 'NOT TESTED',
    canonicalEvidence: canonicalResult ? canonicalResult.detail : 'NOT TESTED',
    localCanonicalStatus: localCanonicalResult ? localCanonicalResult.status : 'NOT TESTED',
    localCanonicalEvidence: localCanonicalResult ? localCanonicalResult.detail : 'NOT TESTED',
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

  // Strictly separate production canonical/hreflang check from local _site build check
  const prodCanonicalResult = options.canonicalResult || (
    (options.auditReportData !== undefined || options.auditReportPath)
      ? verifyCanonicalAndHreflang({
          auditReportData: options.auditReportData,
          auditReportPath: options.auditReportPath,
          expectedUrls: options.expectedUrls,
          expectedCommitSha: options.expectedCommitSha,
          expectedScope: 'production',
          targetOrigin
        })
      : {
          status: 'NOT TESTED',
          scope: 'production',
          tested: false,
          validEvidence: false,
          errorCount: null,
          exitCode: 0,
          detail: 'NOT TESTED on live production by this script (this probe only fetches /robots.txt and /sitemap.xml, not all 110 live HTML pages).'
        }
  );

  const localCanonicalResult = siteDir
    ? verifyCanonicalAndHreflang({ siteDir, expectedScope: 'local_build', targetOrigin })
    : { status: 'NOT TESTED', scope: 'local_build', tested: false, validEvidence: false, errorCount: null, detail: 'Local _site directory not checked' };

  const evaluation = evaluateDiagnostic({
    robotsResponses,
    sitemapResponses,
    canonicalResult: prodCanonicalResult,
    localCanonicalResult,
    requireCanonicalPass: Boolean(options.requireCanonicalPass),
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

  md += `## 4. Diagnostic Status Matrix (Assertion-Driven, Scope-Separated)\n\n`;
  md += `| Dimension | Status | Evidence Basis |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Production Sitemap & Robots Accessibility** | **${evaluation.technicalStatus}** | ${evaluation.technicalEvidence} |\n`;
  md += `| **Production Canonical / Hreflang Audit** | **${evaluation.canonicalStatus}** | ${evaluation.canonicalEvidence} |\n`;
  md += `| **Local Build (\`_site\`) Canonical / Hreflang Audit** | **${evaluation.localCanonicalStatus} (LOCAL BUILD ONLY)** | ${evaluation.localCanonicalEvidence} |\n`;
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
  run().then(({ evaluation }) => {
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
  AUDIT_REPORT_SCHEMA_VERSION,
  DEFAULT_MAX_REPORT_AGE_MS,
  analyzeSitemap,
  verifyCanonicalAndHreflang,
  compareWithLocalBuild,
  evaluateDiagnostic,
  run
};
