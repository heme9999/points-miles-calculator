const { JSDOM } = require('jsdom');
const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Production Verification Bot)'
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function verifyLiveProduction() {
  const prodBase = 'https://points-miles-calculator.pages.dev';
  const ts = Date.now();
  console.log(`=== STARTING LIVE PRODUCTION VERIFICATION (${prodBase}) ===\n`);

  let failures = 0;

  // 1. Sitemap Check
  console.log(`1. Fetching live sitemap.xml?audit=${ts}...`);
  const smRes = await fetch(`${prodBase}/sitemap.xml?audit=${ts}`);
  if (smRes.status !== 200) {
    console.error(`ERROR: sitemap.xml returned ${smRes.status}`);
    failures++;
  }
  const sitemapUrls = [...smRes.data.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  console.log(`Live Sitemap URL count: ${sitemapUrls.length}`);
  if (sitemapUrls.length !== 98) {
    console.error(`ERROR: Expected 98 URLs in production sitemap.xml, found ${sitemapUrls.length}`);
    failures++;
  }

  // 2. English Blog Verification
  const enBlogs = [
    '/en/blog/xinyongka-jifen-zhuan-yazhouwanlitong/',
    '/en/blog/yazhouwanlitong-licheng-jiazhi/',
    '/en/blog/zhaohang-jifen-huan-licheng/'
  ];

  console.log('\n2. Verifying 3 English Blog Posts on Production...');
  for (const blogPath of enBlogs) {
    const res = await fetch(`${prodBase}${blogPath}?audit=${ts}`);
    console.log(`Testing ${blogPath} -> Status ${res.status}`);
    if (res.status !== 200) {
      console.error(`ERROR: ${blogPath} returned HTTP ${res.status}`);
      failures++;
      continue;
    }

    const dom = new JSDOM(res.data, { url: `${prodBase}${blogPath}` });
    const doc = dom.window.document;

    // Check lang
    const htmlLang = doc.documentElement.getAttribute('lang');
    if (htmlLang !== 'en') {
      console.error(`ERROR: ${blogPath} html lang is '${htmlLang}', expected 'en'`);
      failures++;
    }

    // Check not 404
    const h1 = doc.querySelector('h1')?.textContent || '';
    if (h1.toLowerCase().includes('page not found') || doc.title.toLowerCase().includes('not found')) {
      console.error(`ERROR: ${blogPath} is custom 404 page`);
      failures++;
    }

    // Check noindex
    const robots = doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
    if (robots.includes('noindex')) {
      console.error(`ERROR: ${blogPath} contains noindex`);
      failures++;
    }

    // Check canonical
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    if (canonical !== `${prodBase}${blogPath}`) {
      console.error(`ERROR: ${blogPath} canonical mismatch. Expected ${prodBase}${blogPath}, got ${canonical}`);
      failures++;
    }

    // Check JSON-LD
    const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    let foundArticle = false;
    let foundBreadcrumbs = false;
    for (const script of jsonLdScripts) {
      try {
        const parsed = JSON.parse(script.textContent);
        if (parsed['@type'] === 'Article') foundArticle = true;
        if (parsed['@type'] === 'BreadcrumbList') foundBreadcrumbs = true;
      } catch (e) {
        console.error(`ERROR: ${blogPath} has invalid JSON-LD: ${e.message}`);
        failures++;
      }
    }
    if (!foundArticle) {
      console.error(`ERROR: ${blogPath} missing Article schema`);
      failures++;
    }
    if (!foundBreadcrumbs) {
      console.error(`ERROR: ${blogPath} missing BreadcrumbList schema`);
      failures++;
    }

    // Check bidirectional hreflang to Chinese page
    const zhPath = blogPath.replace('/en/', '/');
    const altZh = doc.querySelector('link[rel="alternate"][hreflang="zh-CN"]')?.getAttribute('href');
    if (altZh !== `${prodBase}${zhPath}`) {
      console.error(`ERROR: ${blogPath} alternate zh-CN does not point to ${prodBase}${zhPath}, got ${altZh}`);
      failures++;
    }

    // Check that Chinese page points back
    const zhRes = await fetch(`${prodBase}${zhPath}?audit=${ts}`);
    const zhDom = new JSDOM(zhRes.data, { url: `${prodBase}${zhPath}` });
    const altEnFromZh = zhDom.window.document.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href');
    if (altEnFromZh !== `${prodBase}${blogPath}`) {
      console.error(`ERROR: ${zhPath} alternate en does not point back to ${prodBase}${blogPath}, got ${altEnFromZh}`);
      failures++;
    }
  }

  // 3. Transfer Bonus Example Links and Calculator DOM verification
  console.log('\n3. Verifying Transfer Bonus Example Links and Calculator Functionality...');
  const cnExRes = await fetch(`${prodBase}/examples/transfer-bonus-break-even/?audit=${ts}`);
  const cnExDom = new JSDOM(cnExRes.data);
  const cnBtnHref = cnExDom.window.document.querySelector('.btn')?.getAttribute('href') || '';
  console.log(`CN Example Link: ${cnBtnHref}`);
  if (!cnBtnHref.includes('targetMiles=60000') || !cnBtnHref.includes('baseRatio=1') || !cnBtnHref.includes('bonusPercent=20') || !cnBtnHref.includes('increment=1000')) {
    console.error(`ERROR: CN Example does not use standardized params: ${cnBtnHref}`);
    failures++;
  }

  const enExRes = await fetch(`${prodBase}/en/examples/transfer-bonus-break-even/?audit=${ts}`);
  const enExDom = new JSDOM(enExRes.data);
  const enBtnHref = enExDom.window.document.querySelector('.btn')?.getAttribute('href') || '';
  console.log(`EN Example Link: ${enBtnHref}`);
  if (!enBtnHref.includes('targetMiles=60000') || !enBtnHref.includes('baseRatio=1') || !enBtnHref.includes('bonusPercent=20') || !enBtnHref.includes('increment=1000')) {
    console.error(`ERROR: EN Example does not use standardized params: ${enBtnHref}`);
    failures++;
  }

  // Live Calculator DOM execution with Standard Params
  console.log('\n4. Verifying Standard Params execution on live calculator...');
  const stdCalcUrl = `${prodBase}/calculators/transfer-bonus/?targetMiles=60000&baseRatio=1&bonusPercent=20&increment=1000&audit=${ts}`;
  const stdCalcRes = await fetch(stdCalcUrl);
  const stdDom = new JSDOM(stdCalcRes.data, { runScripts: "dangerously", url: stdCalcUrl });
  await new Promise(r => setTimeout(r, 200));
  const stdDoc = stdDom.window.document;

  const stdTarget = stdDoc.getElementById('targetMiles')?.value;
  const stdRatio = stdDoc.getElementById('baseRatio')?.value;
  const stdBonus = stdDoc.getElementById('bonusPercent')?.value;
  const stdInc = stdDoc.getElementById('increment')?.value;
  const stdRaw = stdDoc.getElementById('rawPoints')?.textContent;
  const stdActual = stdDoc.getElementById('actualPoints')?.textContent;
  const stdCanonical = stdDoc.querySelector('link[rel="canonical"]')?.getAttribute('href');

  console.log(`Standard Params Result: targetMiles=${stdTarget}, baseRatio=${stdRatio}, bonusPercent=${stdBonus}, increment=${stdInc}, rawPoints=${stdRaw}, actualPoints=${stdActual}`);

  if (stdTarget !== '60000' || stdRatio !== '1' || stdBonus !== '20' || stdInc !== '1000') {
    console.error(`ERROR: Input values incorrect in standard params DOM test`);
    failures++;
  }
  if (stdRaw !== '50,000' || stdActual !== '50,000') {
    console.error(`ERROR: Calculated points incorrect in standard params DOM test (expected 50,000 / 50,000)`);
    failures++;
  }
  if (!stdCanonical || stdCanonical.includes('?')) {
    console.error(`ERROR: Canonical contains query parameters: ${stdCanonical}`);
    failures++;
  }

  // Live Calculator DOM execution with Legacy Params
  console.log('\n5. Verifying Legacy Params backward compatibility on live calculator...');
  const legCalcUrl = `${prodBase}/calculators/transfer-bonus/?req=60000&ratio=1&bonus=20&inc=1000&audit=${ts}`;
  const legCalcRes = await fetch(legCalcUrl);
  const legDom = new JSDOM(legCalcRes.data, { runScripts: "dangerously", url: legCalcUrl });
  await new Promise(r => setTimeout(r, 200));
  const legDoc = legDom.window.document;

  const legTarget = legDoc.getElementById('targetMiles')?.value;
  const legRatio = legDoc.getElementById('baseRatio')?.value;
  const legBonus = legDoc.getElementById('bonusPercent')?.value;
  const legInc = legDoc.getElementById('increment')?.value;
  const legRaw = legDoc.getElementById('rawPoints')?.textContent;
  const legActual = legDoc.getElementById('actualPoints')?.textContent;

  console.log(`Legacy Params Result: targetMiles=${legTarget}, baseRatio=${legRatio}, bonusPercent=${legBonus}, increment=${legInc}, rawPoints=${legRaw}, actualPoints=${legActual}`);

  if (legTarget !== '60000' || legRatio !== '1' || legBonus !== '20' || legInc !== '1000') {
    console.error(`ERROR: Input values incorrect in legacy params DOM test`);
    failures++;
  }
  if (legRaw !== '50,000' || legActual !== '50,000') {
    console.error(`ERROR: Calculated points incorrect in legacy params DOM test (expected 50,000 / 50,000)`);
    failures++;
  }

  // 6. Full Sitemap Audit (All 98 URLs live)
  console.log(`\n6. Full Audit of all ${sitemapUrls.length} Live Sitemap URLs...`);
  let auditCount = 0;
  for (const u of sitemapUrls) {
    const res = await fetch(`${u}?audit=${ts}`);
    if (res.status !== 200) {
      console.error(`ERROR: Sitemap URL ${u} returned HTTP ${res.status}`);
      failures++;
      continue;
    }
    const dom = new JSDOM(res.data, { url: u });
    const doc = dom.window.document;

    // Check canonical
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (!canonical || canonical.href.includes('?')) {
      console.error(`ERROR: Invalid canonical at ${u}`);
      failures++;
    }

    // Check JSON-LD
    const jsonlds = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    for (const j of jsonlds) {
      try {
        JSON.parse(j.textContent);
      } catch (e) {
        console.error(`ERROR: Invalid JSON-LD at ${u}: ${e.message}`);
        failures++;
      }
    }

    // Check hreflang
    const links = Array.from(doc.querySelectorAll('link[rel="alternate"][hreflang]'));
    for (const link of links) {
      const href = link.href;
      if (!href.startsWith('https://points-miles-calculator.pages.dev')) continue;
      const altRes = await fetch(`${href}?audit=${ts}`);
      if (altRes.status !== 200) {
        console.error(`ERROR: Alternate ${href} returned ${altRes.status} from ${u}`);
        failures++;
      }
    }
    auditCount++;
  }
  console.log(`Successfully audited ${auditCount} live pages with 0 status errors.`);

  if (failures > 0) {
    console.error(`\nFAILED WITH ${failures} ERRORS.`);
    process.exit(1);
  }

  console.log('\nPASSED WITH 0 ERRORS');
}

verifyLiveProduction().catch(e => {
  console.error('\nFAILED');
  console.error(e);
  process.exit(1);
});
