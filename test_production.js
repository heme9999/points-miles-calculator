const { JSDOM } = require('jsdom');
const http = require('http');

function fetch(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 8083,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: Object.assign({
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }, customHeaders)
    };
    http.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function runTests() {
  const baseUrl = 'http://localhost:8083';
  console.log('=== Starting Phase 9.2.1 Gatekeeper Tests ===\n');

  let failures = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Robots.txt
  console.log('--- 1. Robots.txt Verification ---');
  const robotsRes = await fetch(`${baseUrl}/robots.txt`);
  if (robotsRes.status !== 200) {
    console.error(`ERROR: robots.txt returned ${robotsRes.status}`);
    failures++;
  }
  if (!robotsRes.data.includes('Sitemap: https://points-miles-calculator.pages.dev/sitemap.xml')) {
    console.error('ERROR: robots.txt does not contain absolute sitemap URL');
    failures++;
  } else {
    console.log('robots.txt OK and properly points to absolute sitemap URL.');
  }

  // 2. Sitemap Validation
  console.log('\n--- 2. Sitemap UA & Format Verification ---');
  const regularSitemapRes = await fetch(`${baseUrl}/sitemap.xml`, {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  });
  const googlebotSitemapRes = await fetch(`${baseUrl}/sitemap.xml`, {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  });

  if (regularSitemapRes.status !== 200 || googlebotSitemapRes.status !== 200) {
    console.error(`ERROR: Sitemap fetch failed. Regular: ${regularSitemapRes.status}, Googlebot: ${googlebotSitemapRes.status}`);
    failures++;
  }
  if (!regularSitemapRes.headers['content-type']?.includes('xml')) {
    console.error(`ERROR: Sitemap Content-Type is not XML: ${regularSitemapRes.headers['content-type']}`);
    failures++;
  }

  const sitemapUrls = [...regularSitemapRes.data.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  const lastmods = [...regularSitemapRes.data.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(m => m[1]);

  console.log(`Sitemap total URLs: ${sitemapUrls.length}`);
  console.log(`Sitemap explicit lastmod entries: ${lastmods.length}`);

  if (sitemapUrls.length !== 98) {
    console.error(`ERROR: Expected 98 URLs in sitemap, got ${sitemapUrls.length}`);
    failures++;
  }

  // Verify lastmod format and date constraint
  for (const lm of lastmods) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lm)) {
      console.error(`ERROR: Invalid lastmod format: ${lm}`);
      failures++;
    }
    if (lm > todayStr) {
      console.error(`ERROR: lastmod ${lm} is in the future compared to ${todayStr}`);
      failures++;
    }
  }

  // 3. Homepage Entry Points Verification
  console.log('\n--- 3. Homepage Entry Points Verification ---');
  const enHomeRes = await fetch(`${baseUrl}/en/`);
  const enDoc = new JSDOM(enHomeRes.data).window.document;
  
  const expectedEnLinks = [
    '/en/calculators/points-to-dollars/',
    '/en/calculators/points-vs-cash/',
    '/en/calculators/cents-per-point/',
    '/en/calculators/transfer-bonus/'
  ];

  for (const linkHref of expectedEnLinks) {
    const el = enDoc.querySelector(`a[href="${linkHref}"]`);
    if (!el) {
      console.error(`ERROR: English homepage missing server-rendered link to ${linkHref}`);
      failures++;
    } else {
      console.log(`Found EN entry link: ${linkHref} -> "${el.textContent.trim().replace(/\s+/g, ' ')}"`);
    }
  }

  const cnHomeRes = await fetch(`${baseUrl}/`);
  const cnDoc = new JSDOM(cnHomeRes.data).window.document;
  const expectedCnLinks = [
    '/calculators/points-to-dollars/',
    '/calculators/points-vs-cash/',
    '/calculators/cents-per-point/',
    '/calculators/transfer-bonus/'
  ];

  for (const linkHref of expectedCnLinks) {
    const el = cnDoc.querySelector(`a[href="${linkHref}"]`);
    if (!el) {
      console.error(`ERROR: Chinese homepage missing server-rendered link to ${linkHref}`);
      failures++;
    } else {
      console.log(`Found CN entry link: ${linkHref} -> "${el.textContent.trim().replace(/\s+/g, ' ')}"`);
    }
  }

  // 4. Search Intent, Single H1 & Shortened English Titles
  console.log('\n--- 4. Search Intent, Single H1 & Titles Verification ---');
  const pagesToCheck = [
    { path: '/en/', expectedH1: 'Points and Miles Calculators', expectedTitle: 'Points and Miles Calculators | Points & Miles Calculator' },
    { path: '/en/calculators/points-to-dollars/', expectedH1: 'Points to Dollars Calculator', expectedTitle: 'Points to Dollars Calculator | Miles Value | Points & Miles Calculator' },
    { path: '/en/calculators/points-vs-cash/', expectedH1: 'Points vs Cash Calculator', expectedTitle: 'Points vs Cash Calculator | Award Travel | Points & Miles Calculator' },
    { path: '/en/calculators/cents-per-point/', expectedH1: 'Cents Per Point (CPP) Calculator', expectedTitle: 'Cents Per Point Calculator | Calculate CPP | Points & Miles Calculator' },
    { path: '/en/calculators/transfer-bonus/', expectedH1: 'Points Transfer Bonus Calculator', expectedTitle: 'Transfer Bonus Calculator | Points to Miles | Points & Miles Calculator' },
    { path: '/', expectedH1: '积分与里程决策计算工具箱' },
    { path: '/calculators/points-to-dollars/', expectedH1: '积分换算现金价值计算器' },
    { path: '/calculators/points-vs-cash/', expectedH1: '积分与现金兑换决策计算器' },
    { path: '/calculators/cents-per-point/', expectedH1: '单点价值 (CPP) 计算器' },
    { path: '/calculators/transfer-bonus/', expectedH1: '信用卡转点加赠计算器' },
  ];

  const titles = new Set();
  const descriptions = new Set();

  for (const p of pagesToCheck) {
    const pageRes = await fetch(`${baseUrl}${p.path}`);
    const pageDoc = new JSDOM(pageRes.data).window.document;
    const title = pageDoc.title;
    const descMeta = pageDoc.querySelector('meta[name="description"]');
    const desc = descMeta ? descMeta.content : '';
    const h1Els = pageDoc.querySelectorAll('h1');

    if (h1Els.length !== 1) {
      console.error(`ERROR: ${p.path} has ${h1Els.length} H1 elements! (Must be exactly 1)`);
      failures++;
    } else {
      const h1Text = h1Els[0].textContent.trim();
      if (h1Text !== p.expectedH1) {
        console.error(`ERROR: ${p.path} H1 mismatch. Expected "${p.expectedH1}", got "${h1Text}"`);
        failures++;
      }
    }

    if (p.expectedTitle && title !== p.expectedTitle) {
      console.error(`ERROR: ${p.path} Title mismatch. Expected "${p.expectedTitle}", got "${title}"`);
      failures++;
    }

    if (title.includes('||')) {
      console.error(`ERROR: Double pipe detected in title at ${p.path}: ${title}`);
      failures++;
    }
    if ((title.match(/Points & Miles Calculator/g) || []).length > 1) {
      console.error(`ERROR: Duplicate brand in title at ${p.path}: ${title}`);
      failures++;
    }
    if ((title.match(/里程账/g) || []).length > 1) {
      console.error(`ERROR: Duplicate brand in title at ${p.path}: ${title}`);
      failures++;
    }

    if (titles.has(title)) {
      console.error(`ERROR: Duplicate title detected at ${p.path}: ${title}`);
      failures++;
    }
    titles.add(title);

    if (descriptions.has(desc)) {
      console.error(`ERROR: Duplicate description detected at ${p.path}: ${desc}`);
      failures++;
    }
    descriptions.add(desc);

    console.log(`Page: ${p.path}`);
    console.log(`  Title (${title.length} chars): ${title}`);
    console.log(`  H1:    ${h1Els[0] ? h1Els[0].textContent.trim() : 'NONE'}`);
  }

  // 5. Points to Dollars Valuation Assumptions & Disclaimer Checks
  console.log('\n--- 5. Valuation Wording & Assumptions Verification ---');
  const enP2D = await fetch(`${baseUrl}/en/calculators/points-to-dollars/`);
  const enP2DDoc = new JSDOM(enP2D.data).window.document;
  
  const enLabel = enP2DDoc.querySelector('label[for="presetValuation"]')?.textContent || '';
  if (!enLabel.includes('Valuation assumption (CPP)')) {
    console.error(`ERROR: English Points to Dollars label is "${enLabel}", expected to include "Valuation assumption (CPP)"`);
    failures++;
  }

  const enUnit = enP2DDoc.getElementById('unitValuation')?.textContent || '';
  if (!enUnit.includes('Preset values are calculation examples, not live valuations.')) {
    console.error(`ERROR: English Points to Dollars disclaimer missing standard text. Found: "${enUnit}"`);
    failures++;
  }

  if (enP2D.data.includes('Current market valuation') || enP2D.data.includes('guarantees loss') || enP2D.data.includes('strictly prohibit')) {
    console.error('ERROR: English Points to Dollars contains prohibited legacy wording (Current market valuation / guarantees loss / strictly prohibit)');
    failures++;
  }

  const cnP2D = await fetch(`${baseUrl}/calculators/points-to-dollars/`);
  const cnP2DDoc = new JSDOM(cnP2D.data).window.document;

  const cnLabel = cnP2DDoc.querySelector('label[for="presetValuation"]')?.textContent || '';
  if (!cnLabel.includes('估值假设（CPP）')) {
    console.error(`ERROR: Chinese Points to Dollars label is "${cnLabel}", expected to include "估值假设（CPP）"`);
    failures++;
  }

  const cnUnit = cnP2DDoc.getElementById('unitValuation')?.textContent || '';
  if (!cnUnit.includes('预设数值仅为计算示例，并非实时估值。')) {
    console.error(`ERROR: Chinese Points to Dollars disclaimer missing standard text. Found: "${cnUnit}"`);
    failures++;
  }

  if (cnP2D.data.includes('当前市场单点估值') || cnP2D.data.includes('当前市场估值')) {
    console.error('ERROR: Chinese Points to Dollars contains legacy "当前市场估值"');
    failures++;
  }
  console.log('Valuation wording and disclaimers verified on both EN and CN.');

  // 6. Points to Dollars Conversion Table Verification
  console.log('\n--- 6. Points to Dollars Example Table Verification ---');
  const testTiers = [
    { miles: 2000, rates: { '1.0': '$20', '1.2': '$24', '1.5': '$30', '2.0': '$40' } },
    { miles: 5000, rates: { '1.0': '$50', '1.2': '$60', '1.5': '$75', '2.0': '$100' } },
    { miles: 8000, rates: { '1.0': '$80', '1.2': '$96', '1.5': '$120', '2.0': '$160' } },
    { miles: 17000, rates: { '1.0': '$170', '1.2': '$204', '1.5': '$255', '2.0': '$340' } },
    { miles: 50000, rates: { '1.0': '$500', '1.2': '$600', '1.5': '$750', '2.0': '$1,000' } },
    { miles: 60000, rates: { '1.0': '$600', '1.2': '$720', '1.5': '$900', '2.0': '$1,200' } }
  ];

  for (const tier of testTiers) {
    for (const [rate, expectedVal] of Object.entries(tier.rates)) {
      const calculated = tier.miles * (parseFloat(rate) / 100);
      const formatted = '$' + calculated.toLocaleString('en-US', { maximumFractionDigits: 0 });
      if (formatted !== expectedVal) {
        console.error(`ERROR: Math mismatch for ${tier.miles} @ ${rate}¢: expected ${expectedVal}, calculated ${formatted}`);
        failures++;
      }
      if (!enP2D.data.includes(expectedVal)) {
        console.error(`ERROR: English Points to Dollars table missing ${expectedVal} for ${tier.miles} miles`);
        failures++;
      }
    }
  }
  console.log('Points to Dollars example table math verified successfully.');

  // 7. Comprehensive Sitemap Audit
  console.log('\n--- 7. Comprehensive Sitemap Audit ---');
  for (const u of sitemapUrls) {
    const path = new URL(u).pathname;
    const res = await fetch(`${baseUrl}${path}`);
    if (res.status !== 200) {
      console.error(`ERROR: URL in sitemap returned ${res.status}: ${path}`);
      failures++;
      continue;
    }

    const doc = new JSDOM(res.data).window.document;

    // Check canonical has no query parameters
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
    if (!canonical || canonical.includes('?')) {
      console.error(`ERROR: Bad canonical at ${path}: ${canonical}`);
      failures++;
    }

    // Check hreflang links
    const hreflangZh = doc.querySelector('link[rel="alternate"][hreflang="zh-CN"]')?.getAttribute('href');
    const hreflangEn = doc.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href');
    const hreflangDefault = doc.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href');

    if (!hreflangZh || !hreflangEn || !hreflangDefault) {
      console.error(`ERROR: Missing hreflang tag at ${path}`);
      failures++;
    }

    // Check JSON-LD validity
    const jsonLds = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const j of jsonLds) {
      try {
        const parsed = JSON.parse(j.textContent);
        if (parsed['@type'] === 'WebApplication' && parsed.name?.includes('Points & Miles Calculator | Points & Miles Calculator')) {
          console.error(`ERROR: Duplicate brand in JSON-LD at ${path}`);
          failures++;
        }
      } catch (e) {
        console.error(`ERROR: JSON-LD parse failed at ${path}: ${e.message}`);
        failures++;
      }
    }
  }
  console.log('Comprehensive Sitemap audit completed.');

  // 8. Interactive JS Execution Tests
  console.log('\n--- 8. Interactive Execution & Param Tests ---');
  
  // Points to Dollars Auto-Calculation
  const p2dTestUrl = `${baseUrl}/en/calculators/points-to-dollars/?totalPoints=50000&cppValue=1.5`;
  const p2dHtml = (await fetch(p2dTestUrl)).data;
  const p2dDom = new JSDOM(p2dHtml, { runScripts: "dangerously", url: p2dTestUrl });
  await new Promise(r => setTimeout(r, 100));
  const dollarVal = p2dDom.window.document.getElementById('dollarValue')?.textContent;
  if (dollarVal !== '$750') {
    console.error(`ERROR: Points to Dollars auto-calculation failed. Expected $750, got ${dollarVal}`);
    failures++;
  } else {
    console.log(`Points to Dollars auto-calculation on load: ${dollarVal} (Passed)`);
  }

  // Transfer Bonus Standard & Legacy Param Auto-Calculations
  const tbStdUrl = `${baseUrl}/calculators/transfer-bonus/?targetMiles=60000&baseRatio=1&bonusPercent=20&increment=1000`;
  const tbStdHtml = (await fetch(tbStdUrl)).data;
  const tbStdDom = new JSDOM(tbStdHtml, { runScripts: "dangerously", url: tbStdUrl });
  await new Promise(r => setTimeout(r, 100));
  const rawPoints = tbStdDom.window.document.getElementById('rawPoints')?.textContent;
  const actualPoints = tbStdDom.window.document.getElementById('actualPoints')?.textContent;
  if (rawPoints !== '50,000' || actualPoints !== '50,000') {
    console.error(`ERROR: Transfer Bonus standard params failed. Expected 50,000/50,000, got ${rawPoints}/${actualPoints}`);
    failures++;
  } else {
    console.log(`Transfer Bonus standard params calculation: ${rawPoints}/${actualPoints} (Passed)`);
  }

  const tbLegacyUrl = `${baseUrl}/calculators/transfer-bonus/?req=60000&ratio=1&bonus=20&inc=1000`;
  const tbLegacyHtml = (await fetch(tbLegacyUrl)).data;
  const tbLegacyDom = new JSDOM(tbLegacyHtml, { runScripts: "dangerously", url: tbLegacyUrl });
  await new Promise(r => setTimeout(r, 100));
  const legacyRaw = tbLegacyDom.window.document.getElementById('rawPoints')?.textContent;
  if (legacyRaw !== '50,000') {
    console.error(`ERROR: Transfer Bonus legacy alias params failed. Expected 50,000, got ${legacyRaw}`);
    failures++;
  } else {
    console.log(`Transfer Bonus legacy alias params calculation: ${legacyRaw} (Passed)`);
  }

  if (failures > 0) {
    console.error(`\nFAILED WITH ${failures} ERRORS.`);
    process.exit(1);
  } else {
    console.log('\nPASSED WITH 0 ERRORS\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('\nTEST RUNNER FAILED WITH EXCEPTION:', err);
  process.exit(1);
});
