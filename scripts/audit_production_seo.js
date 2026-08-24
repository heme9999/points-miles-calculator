const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const REGULAR_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const PROD_BASE = 'https://points-miles-calculator.pages.dev';
const targetBase = process.argv[2] || PROD_BASE;

async function runAudit() {
  console.log(`=== STARTING PHASE 9.3 SEO PRODUCTION AUDIT [Target: ${targetBase}] ===`);
  const report = {
    target: targetBase,
    timestamp: new Date().toISOString(),
    totalUrls: 0,
    sitemapUaChecks: {},
    urlStatusSummary: {},
    soft404Count: 0,
    canonicalIssues: 0,
    hreflangIssues: 0,
    jsonLdIssues: 0,
    titleDuplicateCount: 0,
    h1Issues: 0,
    failures: []
  };

  let failures = [];

  // Helper for requests using native fetch
  const fetchWithUA = async (url, ua = REGULAR_UA) => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': ua }
      });
      const text = await res.text();
      return {
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        data: text
      };
    } catch (err) {
      return {
        status: 0,
        headers: {},
        data: '',
        error: err.message
      };
    }
  };

  // 1. Robots.txt check with both UAs
  console.log('\n1. Checking robots.txt...');
  for (const [uaName, ua] of [['Regular UA', REGULAR_UA], ['Googlebot UA', GOOGLEBOT_UA]]) {
    const res = await fetchWithUA(`${targetBase}/robots.txt?audit=${Date.now()}`, ua);
    if (res.status !== 200 || !res.data.includes('Sitemap:')) {
      failures.push(`robots.txt check failed for ${uaName}: Status ${res.status}`);
    } else {
      console.log(`- robots.txt (${uaName}): OK`);
    }
  }

  // 2. Fetch and Validate Sitemap with both UAs
  console.log('\n2. Fetching & Validating sitemap.xml...');
  let sitemapXml = '';
  for (const [uaName, ua] of [['Regular UA', REGULAR_UA], ['Googlebot UA', GOOGLEBOT_UA]]) {
    const res = await fetchWithUA(`${targetBase}/sitemap.xml?audit=${Date.now()}`, ua);
    const cType = res.headers['content-type'] || '';
    report.sitemapUaChecks[uaName] = { status: res.status, contentType: cType };
    if (res.status !== 200) {
      failures.push(`sitemap.xml returned status ${res.status} for ${uaName}`);
    }
    if (!cType.includes('xml')) {
      failures.push(`sitemap.xml content-type is '${cType}', expected xml for ${uaName}`);
    }
    if (uaName === 'Regular UA') sitemapXml = res.data;
    console.log(`- sitemap.xml (${uaName}): Status ${res.status}, Content-Type: ${cType}`);
  }

  // Parse XML using regex to extract <loc>...</loc>
  const urlMatches = sitemapXml.match(/<loc>(.*?)<\/loc>/g) || [];
  const urls = urlMatches.map(m => m.replace(/<\/?loc>/g, '').trim());
  report.totalUrls = urls.length;
  console.log(`- Total URLs in sitemap: ${urls.length}`);

  if (urls.length !== 104) {
    failures.push(`Sitemap URL count mismatch: Expected 104, got ${urls.length}`);
  }

  // Check unique & no query params & no preview domains
  const seenUrls = new Set();
  urls.forEach(u => {
    if (seenUrls.has(u)) {
      failures.push(`Duplicate URL found in sitemap: ${u}`);
    }
    seenUrls.add(u);

    if (u.includes('?') || u.includes('#')) {
      failures.push(`URL contains parameters/fragments in sitemap: ${u}`);
    }
    if (u.includes('.pages.dev') && !u.startsWith(PROD_BASE)) {
      failures.push(`Preview or incorrect domain found in sitemap: ${u}`);
    }
  });

  // 3. User-Agent Dual Checks on Key Entrypoints
  console.log('\n3. Dual UA verification on key pages...');
  const keyPages = [
    '/',
    '/en/',
    '/en/calculators/points-to-dollars/',
    '/en/calculators/points-vs-cash/',
    '/en/calculators/cents-per-point/',
    '/en/calculators/transfer-bonus/'
  ];

  for (const kp of keyPages) {
    const pageUrl = `${targetBase}${kp}`;
    for (const [uaName, ua] of [['Regular', REGULAR_UA], ['Googlebot', GOOGLEBOT_UA]]) {
      const res = await fetchWithUA(`${pageUrl}?ua_audit=${Date.now()}`, ua);
      if (res.status !== 200) {
        failures.push(`Key page ${kp} failed on ${uaName} UA: Status ${res.status}`);
      }
    }
    console.log(`- Verified key page dual UA: ${kp}`);
  }

  // 4. Audit all 98 URLs concurrently in batches
  console.log('\n4. Comprehensive audit of all sitemap URLs...');
  const titlesMap = new Map();
  const descriptionsMap = new Map();

  const BATCH_SIZE = 12;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (rawUrl) => {
      const requestUrl = rawUrl.replace(PROD_BASE, targetBase) + `?audit_ts=${Date.now()}`;
      const res = await fetchWithUA(requestUrl);
      
      report.urlStatusSummary[rawUrl] = res.status;
      if (res.status !== 200) {
        failures.push(`URL ${rawUrl} returned status ${res.status}`);
        return;
      }

      const html = res.data;
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      // Soft 404 and characteristic error phrases check
      const bodyText = doc.body ? doc.body.textContent || '' : '';
      const lowerBody = bodyText.toLowerCase();
      const soft404Patterns = [
        'page not found',
        '页面不存在',
        '404 error'
      ];
      
      for (const pat of soft404Patterns) {
        if (lowerBody.includes(pat) && !rawUrl.includes('404')) {
          failures.push(`Potential Soft 404 phrase detected on ${rawUrl}: "${pat}"`);
          report.soft404Count++;
          break;
        }
      }

      // Robots noindex check
      const robotsMeta = doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
      if (robotsMeta.includes('noindex')) {
        failures.push(`Page in sitemap contains 'noindex': ${rawUrl}`);
      }

      // Title check
      const title = doc.querySelector('title')?.textContent?.trim() || '';
      if (!title) {
        failures.push(`Missing title on ${rawUrl}`);
      } else {
        if (titlesMap.has(title)) {
          failures.push(`Duplicate title "${title}" on ${rawUrl} (already seen on ${titlesMap.get(title)})`);
          report.titleDuplicateCount++;
        } else {
          titlesMap.set(title, rawUrl);
        }
      }

      // Description check
      const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
      if (!desc) {
        failures.push(`Missing description on ${rawUrl}`);
      } else {
        if (descriptionsMap.has(desc)) {
          failures.push(`Duplicate description on ${rawUrl} (already seen on ${descriptionsMap.get(desc)})`);
        } else {
          descriptionsMap.set(desc, rawUrl);
        }
      }

      // H1 count check
      const h1Elements = doc.querySelectorAll('h1');
      if (h1Elements.length !== 1) {
        failures.push(`Expected exactly 1 H1 on ${rawUrl}, found ${h1Elements.length}`);
        report.h1Issues++;
      }

      // Canonical check
      const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
      if (!canonical) {
        failures.push(`Missing canonical on ${rawUrl}`);
        report.canonicalIssues++;
      } else {
        if (canonical.includes('?') || canonical.includes('#')) {
          failures.push(`Canonical contains parameters on ${rawUrl}: ${canonical}`);
          report.canonicalIssues++;
        }
        const canPath = new URL(canonical, PROD_BASE).pathname;
        const expectedPath = new URL(rawUrl, PROD_BASE).pathname;
        if (canPath !== expectedPath) {
          failures.push(`Canonical mismatch on ${rawUrl}: Expected ${expectedPath}, got ${canPath}`);
          report.canonicalIssues++;
        }
      }

      // Hreflang checks (zh-CN, en, x-default)
      const hreflangs = Array.from(doc.querySelectorAll('link[rel="alternate"]')).map(el => ({
        lang: el.getAttribute('hreflang'),
        href: el.getAttribute('href')
      })).filter(h => h.lang && h.href);

      const hasZh = hreflangs.some(h => h.lang === 'zh-CN');
      const hasEn = hreflangs.some(h => h.lang === 'en');
      const hasXDefault = hreflangs.some(h => h.lang === 'x-default');

      if (!hasZh || !hasEn || !hasXDefault) {
        failures.push(`Incomplete hreflangs on ${rawUrl} (hasZh: ${hasZh}, hasEn: ${hasEn}, hasXDefault: ${hasXDefault})`);
        report.hreflangIssues++;
      }

      // JSON-LD parse check
      const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
      jsonLdScripts.forEach((s, idx) => {
        try {
          const parsed = JSON.parse(s.textContent);
          if (!parsed['@context']) {
            failures.push(`JSON-LD #${idx} missing @context on ${rawUrl}`);
            report.jsonLdIssues++;
          }
        } catch (err) {
          failures.push(`Invalid JSON-LD on ${rawUrl}: ${err.message}`);
          report.jsonLdIssues++;
        }
      });
    }));
  }

  // 5. Test True 404 Pages
  console.log('\n5. Checking true 404 response on /non-existent-page...');
  const notFoundRes = await fetchWithUA(`${targetBase}/non-existent-random-page-test-404`);
  console.log(`- 404 Test Status: ${notFoundRes.status}`);

  // Finish Report
  report.failures = failures;
  finishReport(report);

  if (failures.length > 0) {
    console.error(`\nFAILED WITH ${failures.length} ERRORS:\n`);
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('\n========================================');
    console.log('SEO PRODUCTION AUDIT: PASSED WITH 0 ERRORS');
    console.log('========================================\n');
    process.exit(0);
  }
}

function finishReport(report) {
  const jsonPath = path.join(__dirname, '../audit_report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Machine-readable JSON report written to: ${jsonPath}`);
}

runAudit().catch(err => {
  console.error('Unhandled audit error:', err);
  process.exit(1);
});
