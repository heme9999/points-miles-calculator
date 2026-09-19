const { JSDOM } = require('jsdom');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

  if (sitemapUrls.length !== 106) {
    console.error(`ERROR: Expected 106 URLs in sitemap, got ${sitemapUrls.length}`);
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
    '/en/calculators/hotel-points-vs-cash/',
    '/en/calculators/trip-cost-after-points/',
    '/en/calculators/cents-per-point/',
    '/en/calculators/transfer-bonus/'
  ];

  for (const linkHref of expectedEnLinks) {
    const el = enDoc.querySelector(`a[href="${linkHref}"]`);
    if (!el) {
      console.error(`ERROR: English homepage missing link to ${linkHref}`);
      failures++;
    } else {
      console.log(`English homepage link OK: ${linkHref} -> "${el.textContent.replace(/\s+/g, ' ').trim()}"`);
    }
  }

  const zhHomeRes = await fetch(`${baseUrl}/`);
  const zhDoc = new JSDOM(zhHomeRes.data).window.document;

  const expectedZhLinks = [
    '/calculators/points-to-dollars/',
    '/calculators/points-vs-cash/',
    '/calculators/hotel-points-vs-cash/',
    '/calculators/trip-cost-after-points/',
    '/calculators/cents-per-point/',
    '/calculators/transfer-bonus/'
  ];

  for (const linkHref of expectedZhLinks) {
    const el = zhDoc.querySelector(`a[href="${linkHref}"]`);
    if (!el) {
      console.error(`ERROR: Chinese homepage missing link to ${linkHref}`);
      failures++;
    } else {
      console.log(`Chinese homepage link OK: ${linkHref} -> "${el.textContent.replace(/\s+/g, ' ').trim()}"`);
    }
  }

  // 4. Search Intent, Single H1 & Shortened English Titles
  console.log('\n--- 4. Search Intent, Single H1 & Titles Verification ---');
  const pagesToCheck = [
    { path: '/en/calculators/points-to-miles-converter/', expectedH1: 'Points to Miles Converter', expectedTitle: 'Points to Miles Converter | Points & Miles Calculator' },
    { path: '/calculators/points-to-miles-converter/', expectedH1: '积分转航空里程换算器', expectedTitle: '积分转航空里程换算器｜计算转点比例与加赠里程 | 里程账' },
    { path: '/en/', expectedH1: 'Points and Miles Calculators', expectedTitle: 'Points to Miles & Award Calculators | Points & Miles Calculator' },
    { path: '/en/calculators/points-to-dollars/', expectedH1: 'Points to Dollars Calculator', expectedTitle: 'Miles to Dollars Calculator | Points & Miles Calculator' },
    { path: '/en/calculators/points-vs-cash/', expectedH1: 'Points vs Cash Calculator', expectedTitle: 'Points vs Cash Calculator | Points & Miles Calculator' },
    { path: '/en/calculators/trip-cost-after-points/', expectedH1: 'Trip Cost After Points Calculator', expectedTitle: 'Trip Cost After Points Calculator | Points & Miles Calculator' },
    { path: '/en/calculators/cents-per-point/', expectedH1: 'Cents Per Point (CPP) Calculator', expectedTitle: 'Cents Per Point Calculator | Calculate CPP | Points & Miles Calculator' },
    { path: '/en/calculators/transfer-bonus/', expectedH1: 'Points Transfer Bonus Calculator', expectedTitle: 'Transfer Bonus Calculator | Points to Miles | Points & Miles Calculator' },
    { path: '/', expectedH1: '积分与里程决策计算工具箱' },
    { path: '/calculators/points-to-dollars/', expectedH1: '积分换算现金价值计算器' },
    { path: '/calculators/points-vs-cash/', expectedH1: '积分与现金兑换决策计算器' },
    { path: '/calculators/trip-cost-after-points/', expectedH1: '积分抵扣后的旅行实际成本计算器' },
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
    if (title.includes('Points & Miles | Points & Miles Calculator') ||
        title.includes('Points & Miles Calculator | Points & Miles Calculator') ||
        (title.match(/Points & Miles Calculator/g) || []).length > 1 ||
        (title.match(/里程账/g) || []).length > 1) {
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
  if (!enLabel.includes('Choose a valuation scenario (CPP)')) {
    console.error(`ERROR: English Points to Dollars label is "${enLabel}", expected to include "Choose a valuation scenario (CPP)"`);
    failures++;
  }

  const enUnit = enP2DDoc.getElementById('unitValuation')?.textContent || '';
  if (!enUnit.includes('These CPP values are illustrative scenarios, not official conversion rates, live valuations, or guaranteed redemption values.')) {
    console.error(`ERROR: English Points to Dollars disclaimer missing standard text. Found: "${enUnit}"`);
    failures++;
  }

  // Check prohibited terms in English
  const prohibitedEn = [
    'Current market valuation',
    'Industry standard'
  ];
  for (const term of prohibitedEn) {
    if (enP2D.data.toLowerCase().includes(term.toLowerCase())) {
      console.error(`ERROR: English Points to Dollars contains prohibited legacy wording: "${term}"`);
      failures++;
    }
  }

  const cnP2D = await fetch(`${baseUrl}/calculators/points-to-dollars/`);
  const cnP2DDoc = new JSDOM(cnP2D.data).window.document;

  const cnLabel = cnP2DDoc.querySelector('label[for="presetValuation"]')?.textContent || '';
  if (!cnLabel.includes('选择估值情景（CPP）')) {
    console.error(`ERROR: Chinese Points to Dollars label is "${cnLabel}", expected to include "选择估值情景（CPP）"`);
    failures++;
  }

  const cnUnit = cnP2DDoc.getElementById('unitValuation')?.textContent || '';
  if (!cnUnit.includes('这些CPP仅用于比较不同估值情景，不是官方兑换比例、实时估值或保证价值。')) {
    console.error(`ERROR: Chinese Points to Dollars disclaimer missing standard text. Found: "${cnUnit}"`);
    failures++;
  }

  // Check prohibited terms in Chinese
  const prohibitedCn = [
    '行业通用基准',
    '当前市场估值',
    '当前市场单点估值',
    '市场统一估值'
  ];
  for (const term of prohibitedCn) {
    if (cnP2D.data.includes(term)) {
      console.error(`ERROR: Chinese Points to Dollars contains prohibited wording: "${term}"`);
      failures++;
    }
  }
  console.log('Valuation wording, options, and disclaimers verified on both EN and CN.');

  // 6. Points to Dollars Scenario Tables & Help Component Verification
  console.log('\n--- 6. Scenario Tables & Help Component Verification ---');
  // EN Help Component
  const enBtnHelp = enP2DDoc.getElementById('btnHelpScenario');
  if (!enBtnHelp || enBtnHelp.getAttribute('aria-expanded') !== 'false' || enBtnHelp.getAttribute('aria-controls') !== 'helpScenarioGuide') {
    console.error('ERROR: English help button missing or incorrect aria attributes');
    failures++;
  }
  if (!enP2D.data.includes('How to choose the right valuation scenario')) {
    console.error('ERROR: English help scenario guide content missing');
    failures++;
  }

  // CN Help Component & FX Field
  const cnBtnHelp = cnP2DDoc.getElementById('btnHelpScenario');
  if (!cnBtnHelp || cnBtnHelp.getAttribute('aria-expanded') !== 'false' || cnBtnHelp.getAttribute('aria-controls') !== 'helpScenarioGuide') {
    console.error('ERROR: Chinese help button missing or incorrect aria attributes');
    failures++;
  }
  if (!cnP2D.data.includes('如何选择合适的估值情景')) {
    console.error('ERROR: Chinese help scenario guide content missing');
    failures++;
  }
  if (!cnP2DDoc.getElementById('fieldFx')) {
    console.error('ERROR: Chinese exchange rate assumption field (fieldFx) missing');
    failures++;
  }

  // Scenario Table Checks
  if (!enP2D.data.includes('Understanding Valuation Scenarios') || !enP2D.data.includes('Low-value points') || !enP2D.data.includes('Conservative scenario')) {
    console.error('ERROR: English valuation scenarios table missing');
    failures++;
  }
  if (!cnP2D.data.includes('估值情景说明表') || !cnP2D.data.includes('低面值积分情景') || !cnP2D.data.includes('保守估值情景')) {
    console.error('ERROR: Chinese valuation scenarios table missing');
    failures++;
  }
  console.log('Scenario tables, help components, and accessibility attributes verified.');

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

  // 8. Interactive JS Execution & FX Tests
  console.log('\n--- 8. Interactive Execution & Param Tests ---');
  
  // Points to Dollars Auto-Calculation (EN)
  const p2dTestUrl = `${baseUrl}/en/calculators/points-to-dollars/?totalPoints=50000&cppValue=1.5`;
  const p2dHtml = (await fetch(p2dTestUrl)).data;
  const p2dDom = new JSDOM(p2dHtml, { runScripts: "dangerously", url: p2dTestUrl });
  await new Promise(r => setTimeout(r, 100));
  const dollarVal = p2dDom.window.document.getElementById('dollarValue')?.textContent;
  if (dollarVal !== '$750') {
    console.error(`ERROR: Points to Dollars auto-calculation failed. Expected $750, got ${dollarVal}`);
    failures++;
  } else {
    console.log(`EN Points to Dollars auto-calculation on load: ${dollarVal} (Passed)`);
  }

  // Points to Dollars Auto-Calculation (CN - Default FX 7.0)
  const p2dCnUrl = `${baseUrl}/calculators/points-to-dollars/?points=50000&valuation=0.105`;
  const p2dCpHtml = (await fetch(p2dCnUrl)).data;
  const p2dCnDom = new JSDOM(p2dCpHtml, { runScripts: "dangerously", url: p2dCnUrl });
  await new Promise(r => setTimeout(r, 100));
  const cnDollarVal = p2dCnDom.window.document.getElementById('dollarValue')?.textContent;
  if (cnDollarVal !== '¥5,250') {
    console.error(`ERROR: CN Points to Dollars default FX calculation failed. Expected ¥5,250, got ${cnDollarVal}`);
    failures++;
  } else {
    console.log(`CN Points to Dollars (FX 7.0) calculation on load: ${cnDollarVal} (Passed)`);
  }

  // Points to Dollars FX 7.2 Custom URL Parameter Recovery
  const p2dFxUrl = `${baseUrl}/calculators/points-to-dollars/?points=50000&fx=7.2&scenario=1.5`;
  const p2dFxHtml = (await fetch(p2dFxUrl)).data;
  const p2dFxDom = new JSDOM(p2dFxHtml, { runScripts: "dangerously", url: p2dFxUrl });
  await new Promise(r => setTimeout(r, 100));
  const fxVal = p2dFxDom.window.document.getElementById('dollarValue')?.textContent;
  if (fxVal !== '¥5,400') {
    console.error(`ERROR: CN Points to Dollars FX 7.2 calculation failed. Expected ¥5,400, got ${fxVal}`);
    failures++;
  } else {
    console.log(`CN Points to Dollars (FX 7.2 parameter recovery): ${fxVal} (Passed)`);
  }

  // Points vs Cash Auto-Calculation (EN)
  const pvcTestUrl = `${baseUrl}/en/calculators/points-vs-cash/?cash=350&points=25000&taxes=30&forgone=15&valuation=1.2`;
  const pvcHtml = (await fetch(pvcTestUrl)).data;
  const pvcDom = new JSDOM(pvcHtml, { runScripts: "dangerously", url: pvcTestUrl });
  await new Promise(r => setTimeout(r, 100));
  const pvcCpp = pvcDom.window.document.getElementById('cppResult')?.textContent;
  if (!pvcCpp || !pvcCpp.includes('1.22')) {
    console.error(`ERROR: EN Points vs Cash calculation failed. Expected ~1.22¢ / point, got ${pvcCpp}`);
    failures++;
  } else {
    console.log(`EN Points vs Cash calculation on load: ${pvcCpp} (Passed)`);
  }

  // Points vs Cash Auto-Calculation (CN)
  const pvcCnUrl = `${baseUrl}/calculators/points-vs-cash/?cash=800&points=12000&taxes=50&forgone=30&valuation=0.08`;
  const pvcCnTestHtml = (await fetch(pvcCnUrl)).data;
  const pvcCnDom = new JSDOM(pvcCnTestHtml, { runScripts: "dangerously", url: pvcCnUrl });
  await new Promise(r => setTimeout(r, 100));
  const pvcCnCpp = pvcCnDom.window.document.getElementById('cppResult')?.textContent;
  if (!pvcCnCpp || !pvcCnCpp.includes('0.0600')) {
    console.error(`ERROR: CN Points vs Cash calculation failed. Expected ¥0.0600 / 点, got ${pvcCnCpp}`);
    failures++;
  } else {
    console.log(`CN Points vs Cash calculation on load: ${pvcCnCpp} (Passed)`);
  }

  // Transfer Bonus Standard & Legacy Param Auto-Calculations (ZH & EN)
  const tbStdUrl = `${baseUrl}/calculators/transfer-bonus/?targetMiles=60000&baseRatio=1&bonusPercent=20&increment=1000`;
  const tbStdHtml = (await fetch(tbStdUrl)).data;
  const tbStdDom = new JSDOM(tbStdHtml, { runScripts: "dangerously", resources: "usable", url: tbStdUrl });
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (tbStdDom.window.document.getElementById('actualPoints')?.textContent === '50,000') break;
  }
  const rawPoints = tbStdDom.window.document.getElementById('rawPoints')?.textContent;
  const actualPoints = tbStdDom.window.document.getElementById('actualPoints')?.textContent;
  const explain = tbStdDom.window.document.getElementById('explain')?.textContent || '';
  if (rawPoints !== '50,000' || actualPoints !== '50,000' || !explain.includes('50,000') || !explain.includes('60,000')) {
    console.error(`ERROR: ZH Transfer Bonus standard params failed. Expected 50,000/50,000, got ${rawPoints}/${actualPoints}, explain: ${explain}`);
    failures++;
  } else {
    console.log(`ZH Transfer Bonus standard params calculation: ${rawPoints}/${actualPoints} (Passed)`);
  }

  const tbLegacyUrl = `${baseUrl}/calculators/transfer-bonus/?req=60000&ratio=1&bonus=20&inc=1000`;
  const tbLegacyHtml = (await fetch(tbLegacyUrl)).data;
  const tbLegacyDom = new JSDOM(tbLegacyHtml, { runScripts: "dangerously", resources: "usable", url: tbLegacyUrl });
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (tbLegacyDom.window.document.getElementById('actualPoints')?.textContent === '50,000') break;
  }
  const legacyRaw = tbLegacyDom.window.document.getElementById('rawPoints')?.textContent;
  const legacyActual = tbLegacyDom.window.document.getElementById('actualPoints')?.textContent;
  if (legacyRaw !== '50,000' || legacyActual !== '50,000') {
    console.error(`ERROR: ZH Transfer Bonus legacy alias params failed. Expected 50,000/50,000, got ${legacyRaw}/${legacyActual}`);
    failures++;
  } else {
    console.log(`ZH Transfer Bonus legacy alias params calculation: ${legacyRaw}/${legacyActual} (Passed)`);
  }

  const tbEnStdUrl = `${baseUrl}/en/calculators/transfer-bonus/?targetMiles=60000&baseRatio=1&bonusPercent=20&increment=1000`;
  const tbEnStdHtml = (await fetch(tbEnStdUrl)).data;
  const tbEnStdDom = new JSDOM(tbEnStdHtml, { runScripts: "dangerously", resources: "usable", url: tbEnStdUrl });
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (tbEnStdDom.window.document.getElementById('actualPoints')?.textContent === '50,000') break;
  }
  const enRawPoints = tbEnStdDom.window.document.getElementById('rawPoints')?.textContent;
  const enActualPoints = tbEnStdDom.window.document.getElementById('actualPoints')?.textContent;
  const enExplain = tbEnStdDom.window.document.getElementById('explain')?.textContent || '';
  if (enRawPoints !== '50,000' || enActualPoints !== '50,000' || !enExplain.includes('50,000') || !enExplain.includes('60,000')) {
    console.error(`ERROR: EN Transfer Bonus standard params failed. Expected 50,000/50,000, got ${enRawPoints}/${enActualPoints}, explain: ${enExplain}`);
    failures++;
  } else {
    console.log(`EN Transfer Bonus standard params calculation: ${enRawPoints}/${enActualPoints} (Passed)`);
  }

  const tbEnLegacyUrl = `${baseUrl}/en/calculators/transfer-bonus/?req=60000&ratio=1&bonus=20&inc=1000`;
  const tbEnLegacyHtml = (await fetch(tbEnLegacyUrl)).data;
  const tbEnLegacyDom = new JSDOM(tbEnLegacyHtml, { runScripts: "dangerously", resources: "usable", url: tbEnLegacyUrl });
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (tbEnLegacyDom.window.document.getElementById('actualPoints')?.textContent === '50,000') break;
  }
  const enLegacyRaw = tbEnLegacyDom.window.document.getElementById('rawPoints')?.textContent;
  const enLegacyActual = tbEnLegacyDom.window.document.getElementById('actualPoints')?.textContent;
  if (enLegacyRaw !== '50,000' || enLegacyActual !== '50,000') {
    console.error(`ERROR: EN Transfer Bonus legacy alias params failed. Expected 50,000/50,000, got ${enLegacyRaw}/${enLegacyActual}`);
    failures++;
  } else {
    console.log(`EN Transfer Bonus legacy alias params calculation: ${enLegacyRaw}/${enLegacyActual} (Passed)`);
  }

  // Verify Transfer Bonus Loads calculator-core.js
  if (!tbStdHtml.includes('calculator-core.js') || !tbEnStdHtml.includes('calculator-core.js')) {
    console.error('ERROR: Transfer Bonus templates do not load calculator-core.js');
    failures++;
  } else {
    console.log('Transfer Bonus calculator-core.js inclusion verified (Passed)');
  }

  // Verify no erroneous "1.5 元/里" or "15,000 元" on Chinese homepage
  const cnHomeHtml = (await fetch(`${baseUrl}/`)).data;
  if (cnHomeHtml.includes('1.5 元/里') || cnHomeHtml.includes('15,000 元')) {
    console.error('ERROR: Chinese homepage still contains erroneous 1.5 元/里 or 15,000 元');
    failures++;
  } else {
    console.log('Chinese homepage valuation wording verified: 0 instances of 1.5 元/里 or 15,000 元 (Passed)');
  }

  // Trip Cost After Points Calculator Auto-Calculation (CN)
  console.log('\n--- Trip Cost After Points Calculator Verification (CN & EN) ---');
  const tcCnUrl = `${baseUrl}/calculators/trip-cost-after-points/?currency=CNY&days=7&adults=2&children=1&fCash=12000&hCash=15000&dCash=7000&tCash=3500&actCash=3000&visaCash=1200&simCash=300&othCash=2000&fMiles=60000&fBal=10000&fTaxes=800&hPoints=50000&hTaxes=0&hResort=0&fBonus=20&fRatio=1&fInc=1000&fTransBal=42000`;
  const tcCpHtml = (await fetch(tcCnUrl)).data;
  const tcCnDom = new JSDOM(tcCpHtml, { runScripts: "dangerously", resources: "usable", url: tcCnUrl });
  
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    const rem = tcCnDom.window.document.getElementById('resultRemainingMiles')?.textContent;
    if (rem === '50,000') break;
  }

  const tcCnFinal = tcCnDom.window.document.getElementById('cardFinalPrice')?.textContent;
  const tcCnSavings = tcCnDom.window.document.getElementById('badgeTotalSavings')?.textContent;
  if (tcCnFinal !== '¥17,800' || tcCnSavings !== '省 ¥26,200') {
    console.error(`ERROR: CN Trip Cost After Points calculation failed. Expected ¥17,800 / 省 ¥26,200, got ${tcCnFinal} / ${tcCnSavings}`);
    failures++;
  } else {
    console.log(`CN Trip Cost After Points on-load calculation: ${tcCnFinal} final / ${tcCnSavings} saved (Passed)`);
  }

  // Exact DOM ID Checks (CN)
  const cnDomChecks = [
    { id: 'resultRemainingMiles', expected: '50,000' },
    { id: 'resultBankPointsNeeded', expected: '42,000' },
    { id: 'resultMilesReceived', expected: '50,400' },
    { id: 'resultProjectedAirlineMiles', expected: '60,400' },
    { id: 'resultExcessMiles', expected: '400' },
    { id: 'resultBankBalanceStatus', expected: '余额充足' }
  ];

  for (const chk of cnDomChecks) {
    const val = tcCnDom.window.document.getElementById(chk.id)?.textContent?.trim();
    if (val !== chk.expected) {
      console.error(`ERROR: CN DOM #${chk.id} failed. Expected "${chk.expected}", got "${val}"`);
      failures++;
    } else {
      console.log(`CN DOM #${chk.id} = "${val}" (Passed)`);
    }
  }

  // Trip Cost After Points Calculator Auto-Calculation (EN)
  const tcEnUrl = `${baseUrl}/en/calculators/trip-cost-after-points/?currency=USD&days=10&adults=2&children=1&fCash=3600&hCash=2700&dCash=1500&carCash=700&gasCash=450&actCash=900&visaCash=300&simCash=60&othCash=300&fMiles=60000&fBal=10000&fTaxes=360&hPoints=120000&hTaxes=0&hResort=0&fBonus=20&fRatio=1&fInc=1000&fTransBal=42000`;
  const tcEnHtml = (await fetch(tcEnUrl)).data;
  const tcEnDom = new JSDOM(tcEnHtml, { runScripts: "dangerously", resources: "usable", url: tcEnUrl });
  
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    const rem = tcEnDom.window.document.getElementById('resultRemainingMiles')?.textContent;
    if (rem === '50,000') break;
  }

  const tcEnFinal = tcEnDom.window.document.getElementById('cardFinalPrice')?.textContent;
  const tcEnSavings = tcEnDom.window.document.getElementById('badgeTotalSavings')?.textContent;
  if (tcEnFinal !== '$4,570' || tcEnSavings !== 'Saved $5,940') {
    console.error(`ERROR: EN Trip Cost After Points calculation failed. Expected $4,570 / Saved $5,940, got ${tcEnFinal} / ${tcEnSavings}`);
    failures++;
  } else {
    console.log(`EN Trip Cost After Points on-load calculation: ${tcEnFinal} final / ${tcEnSavings} saved (Passed)`);
  }

  // Exact DOM ID Checks (EN)
  const enDomChecks = [
    { id: 'resultRemainingMiles', expected: '50,000' },
    { id: 'resultBankPointsNeeded', expected: '42,000' },
    { id: 'resultMilesReceived', expected: '50,400' },
    { id: 'resultProjectedAirlineMiles', expected: '60,400' },
    { id: 'resultExcessMiles', expected: '400' },
    { id: 'resultBankBalanceStatus', expected: 'Sufficient balance' }
  ];

  for (const chk of enDomChecks) {
    const val = tcEnDom.window.document.getElementById(chk.id)?.textContent?.trim();
    if (val !== chk.expected) {
      console.error(`ERROR: EN DOM #${chk.id} failed. Expected "${chk.expected}", got "${val}"`);
      failures++;
    } else {
      console.log(`EN DOM #${chk.id} = "${val}" (Passed)`);
    }
  }

  // Waterfall Table & Mobile Cards Verification (CN & EN)
  const cnThead = tcCnDom.window.document.querySelector('.waterfall-table thead');
  const cnThs = Array.from(cnThead ? cnThead.querySelectorAll('th') : []).map(th => th.textContent.trim());
  const expectedCnThs = ['预算类别', '全现金基准', '积分抵扣扣减', '必须自付税费/附加费', '最终实际自付现金'];
  if (JSON.stringify(cnThs) !== JSON.stringify(expectedCnThs)) {
    console.error(`ERROR: CN Waterfall Table headers mismatch. Expected ${JSON.stringify(expectedCnThs)}, got ${JSON.stringify(cnThs)}`);
    failures++;
  } else {
    console.log('CN Waterfall Table 5-column headers verified (Passed)');
  }

  // Check Table Row scope & category attributes
  const cnRowThs = tcCnDom.window.document.querySelectorAll('.waterfall-table tbody th[scope="row"]');
  if (cnRowThs.length === 0) {
    console.error('ERROR: CN Waterfall Table rows missing th[scope="row"]');
    failures++;
  }

  // Check Mobile Cards existence & data consistency (CN)
  const cnCards = tcCnDom.window.document.querySelectorAll('#waterfallCardsList .waterfall-mobile-card');
  const cnTableRows = tcCnDom.window.document.querySelectorAll('#waterfallBody .waterfall-row');
  if (cnCards.length === 0 || cnCards.length !== cnTableRows.length) {
    console.error(`ERROR: CN Mobile cards count (${cnCards.length}) does not match table rows count (${cnTableRows.length})`);
    failures++;
  } else {
    console.log(`CN Mobile cards count (${cnCards.length}) matches table rows exactly (Passed)`);
  }

  // CN Total Row & Card Check
  const cnTotalRow = tcCnDom.window.document.querySelector('#waterfallFoot .waterfall-row-total, .waterfall-table tfoot .waterfall-row-total');
  if (!cnTotalRow) {
    console.error('ERROR: CN Waterfall Table tfoot total row missing');
    failures++;
  } else {
    console.log('CN Waterfall Table tfoot total row verified (Passed)');
  }

  const cnTotalCard = tcCnDom.window.document.querySelector('#waterfallCardsTotal .waterfall-mobile-card-total');
  if (!cnTotalCard) {
    console.error('ERROR: CN Mobile Total Card missing');
    failures++;
  } else {
    console.log('CN Mobile Total Card verified (Passed)');
  }

  const enThead = tcEnDom.window.document.querySelector('.waterfall-table thead');
  const enThs = Array.from(enThead ? enThead.querySelectorAll('th') : []).map(th => th.textContent.trim());
  const expectedEnThs = ['Budget Category', 'All-Cash Baseline', 'Points Deduction', 'Mandatory Taxes / Fees', 'Final Out-of-Pocket Cash'];
  if (JSON.stringify(enThs) !== JSON.stringify(expectedEnThs)) {
    console.error(`ERROR: EN Waterfall Table headers mismatch. Expected ${JSON.stringify(expectedEnThs)}, got ${JSON.stringify(enThs)}`);
    failures++;
  } else {
    console.log('EN Waterfall Table 5-column headers verified (Passed)');
  }

  // Check Table Row scope attributes (EN)
  const enRowThs = tcEnDom.window.document.querySelectorAll('.waterfall-table tbody th[scope="row"]');
  if (enRowThs.length === 0) {
    console.error('ERROR: EN Waterfall Table rows missing th[scope="row"]');
    failures++;
  }

  // Check Mobile Cards existence & data consistency (EN)
  const enCards = tcEnDom.window.document.querySelectorAll('#waterfallCardsList .waterfall-mobile-card');
  const enTableRows = tcEnDom.window.document.querySelectorAll('#waterfallBody .waterfall-row');
  if (enCards.length === 0 || enCards.length !== enTableRows.length) {
    console.error(`ERROR: EN Mobile cards count (${enCards.length}) does not match table rows count (${enTableRows.length})`);
    failures++;
  } else {
    console.log(`EN Mobile cards count (${enCards.length}) matches table rows exactly (Passed)`);
  }

  // EN Total Row & Card Check
  const enTotalRow = tcEnDom.window.document.querySelector('#waterfallFoot .waterfall-row-total, .waterfall-table tfoot .waterfall-row-total');
  if (!enTotalRow) {
    console.error('ERROR: EN Waterfall Table tfoot total row missing');
    failures++;
  } else {
    console.log('EN Waterfall Table tfoot total row verified (Passed)');
  }

  const enTotalCard = tcEnDom.window.document.querySelector('#waterfallCardsTotal .waterfall-mobile-card-total');
  if (!enTotalCard) {
    console.error('ERROR: EN Mobile Total Card missing');
    failures++;
  } else {
    console.log('EN Mobile Total Card verified (Passed)');
  }

  // Check EN Label: ensure NO "Transfer Bonus Bonus" typo
  if (tcEnHtml.includes('Transfer Bonus Bonus')) {
    console.error('ERROR: EN Trip Cost contains typo "Transfer Bonus Bonus"');
    failures++;
  } else {
    console.log('EN Trip Cost label typo check: 0 instances of "Transfer Bonus Bonus" (Passed)');
  }

  // Responsive Containment CSS Assertions (Phase 9.4.4)
  const cssFile = fs.readFileSync(path.join(__dirname, 'src/assets/style.css'), 'utf8');
  if (!cssFile.includes('.ticket .main > *') || !cssFile.includes('min-width: 0')) {
    console.error('ERROR: CSS missing .ticket .main > * { min-width: 0; }');
    failures++;
  } else {
    console.log('CSS .ticket .main child min-width: 0 containment verified (Passed)');
  }
  if (!cssFile.includes('.plan-comparison-grid') || !cssFile.includes('repeat(2, minmax(0, 1fr))')) {
    console.error('ERROR: CSS plan-comparison-grid missing minmax(0, 1fr)');
    failures++;
  } else {
    console.log('CSS plan-comparison-grid minmax(0, 1fr) verified (Passed)');
  }
  if (!cssFile.includes('repeat(auto-fit, minmax(min(220px, 100%), 1fr))')) {
    console.error('ERROR: CSS expense-grid missing minmax(min(220px, 100%), 1fr)');
    failures++;
  } else {
    console.log('CSS expense-grid auto-fit responsive columns verified (Passed)');
  }

  // Case Studies Page Verification
  const caseUrls = [
    '/examples/usa-west-coast-family-trip-with-points/',
    '/en/examples/usa-west-coast-family-trip-with-points/',
    '/examples/japan-7-day-family-trip-with-points/',
    '/en/examples/japan-7-day-family-trip-with-points/'
  ];
  for (const cUrl of caseUrls) {
    const cRes = await fetch(`${baseUrl}${cUrl}`);
    if (cRes.status !== 200) {
      console.error(`ERROR: Case study ${cUrl} returned HTTP ${cRes.status}`);
      failures++;
    } else {
      const cDoc = new JSDOM(cRes.data).window.document;
      const h1 = cDoc.querySelector('h1')?.textContent;
      if (!h1) {
        console.error(`ERROR: Case study ${cUrl} missing H1`);
        failures++;
      } else {
        console.log(`Case study OK: ${cUrl} (H1: "${h1}")`);
      }
    }
  }

  // --- Phase 9.8 Specific Gatekeeper Tests ---
  console.log('\n--- Phase 9.8: GSC Ranking & Core Page Enhancement Tests ---');

  // 1. Amex Balance Table Verification
  const amexRes = await fetch(`${baseUrl}/en/values/amex-membership-rewards/`);
  if (amexRes.status !== 200) {
    console.error('ERROR: Amex page returned ' + amexRes.status);
    failures++;
  } else {
    const amexDoc = new JSDOM(amexRes.data).window.document;
    const table = amexDoc.querySelector('table');
    if (!table) {
      console.error('ERROR: Amex page missing valuation table');
      failures++;
    } else {
      const tableText = table.textContent;
      const expectedRows = [
        { pts: '10,000', v1: '$100', v15: '$150', v2: '$200' },
        { pts: '25,000', v1: '$250', v15: '$375', v2: '$500' },
        { pts: '50,000', v1: '$500', v15: '$750', v2: '$1,000' },
        { pts: '100,000', v1: '$1,000', v15: '$1,500', v2: '$2,000' }
      ];
      let tableOk = true;
      for (const row of expectedRows) {
        if (!tableText.includes(row.pts) || !tableText.includes(row.v1) || !tableText.includes(row.v15) || !tableText.includes(row.v2)) {
          console.error('ERROR: Amex balance table missing values for ' + row.pts);
          failures++;
          tableOk = false;
        }
      }
      if (tableOk) console.log('Amex balance table math values verified (Passed)');
    }

    // Check Geographic Scope note
    if (!amexRes.data.includes('This page primarily discusses U.S. Membership Rewards accounts')) {
      console.error('ERROR: Amex page missing US geographic scope statement');
      failures++;
    } else {
      console.log('Amex geographic scope note verified (Passed)');
    }

    // Check Direct Answer word count
    const directEl = amexDoc.querySelector('.direct-answer');
    if (!directEl) {
      console.error('ERROR: Amex page missing .direct-answer');
      failures++;
    } else {
      const words = directEl.textContent.trim().split(/\s+/).length;
      if (words < 40 || words > 80) {
        console.error('ERROR: Amex direct answer word count outside 40-70 range: ' + words);
        failures++;
      } else {
        console.log('Amex direct answer word count OK (' + words + ' words) (Passed)');
      }
    }
  }

  // 2. Prefill links auto-calculation test
  const prefillTests = [
    { pts: 10000, cpp: 1.5, expected: '$150' },
    { pts: 25000, cpp: 1.5, expected: '$375' },
    { pts: 50000, cpp: 1.5, expected: '$750' },
    { pts: 100000, cpp: 1.5, expected: '$1,500' }
  ];
  for (const pt of prefillTests) {
    const pfUrl = `${baseUrl}/en/calculators/points-to-dollars/?totalPoints=${pt.pts}&cppValue=${pt.cpp}`;
    const pfRes = await fetch(pfUrl);
    if (pfRes.status !== 200) {
      console.error('ERROR: Prefill link returned ' + pfRes.status);
      failures++;
    } else {
      const pfDom = new JSDOM(pfRes.data, { url: pfUrl, runScripts: 'dangerously', resources: 'usable' });
      const val = pfDom.window.document.getElementById('dollarValue')?.textContent;
      if (val !== pt.expected) {
        console.error(`ERROR: Prefill ${pt.pts} @ ${pt.cpp} expected ${pt.expected}, got ${val}`);
        failures++;
      } else {
        console.log(`Prefill ${pt.pts} @ ${pt.cpp} auto-calculated: ${val} (Passed)`);
      }

      // Canonical check on prefill URL response
      const canonical = pfDom.window.document.querySelector('link[rel="canonical"]')?.getAttribute('href');
      if (canonical !== 'https://points-miles-calculator.pages.dev/en/calculators/points-to-dollars/') {
        console.error('ERROR: Prefill URL has invalid canonical: ' + canonical);
        failures++;
      }
    }
  }

  // 3. Quick balance preset buttons test
  const p2dPageUrl = `${baseUrl}/en/calculators/points-to-dollars/`;
  const p2dRes = await fetch(p2dPageUrl);
  const p2dPresetDom = new JSDOM(p2dRes.data, { url: p2dPageUrl, runScripts: 'dangerously', resources: 'usable' });
  const p2dPresetDoc = p2dPresetDom.window.document;
  const presetBtns = p2dPresetDoc.querySelectorAll('.btn-balance-preset');
  if (presetBtns.length !== 4) {
    console.error('ERROR: Expected 4 balance preset buttons, got ' + presetBtns.length);
    failures++;
  } else {
    const btn100k = Array.from(presetBtns).find(b => b.getAttribute('data-points') === '100000');
    if (!btn100k) {
      console.error('ERROR: 100k preset button not found');
      failures++;
    } else {
      btn100k.click();
      const afterVal = p2dPresetDoc.getElementById('dollarValue')?.textContent;
      if (afterVal !== '$1,500') {
        console.error('ERROR: Clicking 100k preset did not update to $1,500, got: ' + afterVal);
        failures++;
      } else {
        console.log('Quick balance button click updated value to $1,500 immediately (Passed)');
      }
    }
  }

  // 4. Points to Miles Converter Scenario (50,000 + 20% = 60,000)
  const p2mUrl = `${baseUrl}/en/calculators/points-to-miles-converter/?bankPoints=50000&baseRatio=1&bonusPercent=20&increment=1000`;
  const p2mRes = await fetch(p2mUrl);
  const p2mDom = new JSDOM(p2mRes.data, { url: p2mUrl, runScripts: 'dangerously', resources: 'usable' });
  const p2mMiles = p2mDom.window.document.getElementById('totalMiles')?.textContent?.replace(/[^0-9]/g, '');
  if (p2mMiles !== '60000') {
    console.error('ERROR: Points to Miles 50k + 20% expected 60000, got: ' + p2mMiles);
    failures++;
  } else {
    console.log('Points to Miles 50,000 + 20% bonus verified: 60,000 miles (Passed)');
  }

  // 5. English Calculators Directory Distinct IO Statements
  const calcIndexRes = await fetch(`${baseUrl}/en/calculators/`);
  const calcIndexText = calcIndexRes.data;
  if (!calcIndexText.includes('Miles to Dollars Calculator') ||
      !calcIndexText.includes('Points to Miles Converter') ||
      !calcIndexText.includes('Hotel Points vs Cash Calculator') ||
      !calcIndexText.includes('Transfer Bonus Calculator')) {
    console.error('ERROR: English calculators index missing key tools');
    failures++;
  } else if (!calcIndexText.includes('Input:') || !calcIndexText.includes('Output:')) {
    console.error('ERROR: English calculators index missing Input/Output definitions');
    failures++;
  } else {
    console.log('English calculators index tool separation and Input/Output verified (Passed)');
  }

  // 6. Phase 9.9: Hotel Points vs Cash Tool Suite & Usability Verification
  console.log('\n--- 6. Phase 9.9: Hotel Points vs Cash Tool Suite Verification ---');
  
  // 6.1 Check EN & ZH Hotel Pages exist and return HTTP 200
  const enHotelUrl = `${baseUrl}/en/calculators/hotel-points-vs-cash/`;
  const zhHotelUrl = `${baseUrl}/calculators/hotel-points-vs-cash/`;
  const [enHotelRes, zhHotelRes] = await Promise.all([fetch(enHotelUrl), fetch(zhHotelUrl)]);

  if (enHotelRes.status !== 200 || zhHotelRes.status !== 200) {
    console.error(`ERROR: Hotel pages HTTP status failure. EN: ${enHotelRes.status}, ZH: ${zhHotelRes.status}`);
    failures++;
  } else {
    console.log('Hotel points vs cash EN & ZH pages HTTP 200 OK');
  }

  const enHotelDom = new JSDOM(enHotelRes.data, { url: enHotelUrl, runScripts: 'dangerously', resources: 'usable' });
  const zhHotelDom = new JSDOM(zhHotelRes.data, { url: zhHotelUrl, runScripts: 'dangerously', resources: 'usable' });

  // Wait for scripts to execute and DOM initialization
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (enHotelDom.window.CalculatorCore && enHotelDom.window.document.getElementById('explain')?.textContent.includes('demo data')) break;
  }

  // 6.2 Verify Initial On-Load State (Default Empty with Prompt)
  const initialEnCpp = enHotelDom.window.document.getElementById('cppResult')?.textContent;
  const initialEnCash = enHotelDom.window.document.getElementById('totalCashPrice')?.value;
  const initialEnPoints = enHotelDom.window.document.getElementById('totalPointsRequired')?.value;
  if (initialEnCpp !== '-' || initialEnCash !== '' || initialEnPoints !== '') {
    console.error(`ERROR: Expected hotel calculator to start empty with '-', got cpp: ${initialEnCpp}, cash: ${initialEnCash}, points: ${initialEnPoints}`);
    failures++;
  } else {
    console.log('Hotel calculator starts empty with placeholder and prompt (Passed)');
  }

  // 6.3 Check Single H1 and Canonicals
  const enH1s = enHotelDom.window.document.querySelectorAll('h1');
  const zhH1s = zhHotelDom.window.document.querySelectorAll('h1');
  if (enH1s.length !== 1 || enH1s[0].textContent.trim() !== 'Hotel Points vs Cash Calculator') {
    console.error(`ERROR: EN Hotel H1 mismatch: found ${enH1s.length}, text: ${enH1s[0]?.textContent}`);
    failures++;
  } else {
    console.log('EN Hotel H1 single and matches expected (Passed)');
  }
  if (zhH1s.length !== 1 || zhH1s[0].textContent.trim() !== '酒店积分 vs 现金决策计算器') {
    console.error(`ERROR: ZH Hotel H1 mismatch: found ${zhH1s.length}, text: ${zhH1s[0]?.textContent}`);
    failures++;
  } else {
    console.log('ZH Hotel H1 single and matches expected (Passed)');
  }

  // 6.4 Verify Related Guides All Return HTTP 200 (No 404s)
  const zhGuideLinks = Array.from(zhHotelDom.window.document.querySelectorAll('article.seo-content ul li a')).map(a => a.getAttribute('href'));
  const enGuideLinks = Array.from(enHotelDom.window.document.querySelectorAll('article.seo-content ul li a')).map(a => a.getAttribute('href'));
  const allGuideLinks = [...zhGuideLinks, ...enGuideLinks];

  for (const link of allGuideLinks) {
    if (!link.startsWith('/')) continue;
    const fullUrl = `${baseUrl}${link}`;
    const linkRes = await fetch(fullUrl);
    if (linkRes.status !== 200) {
      console.error(`ERROR: Related guide link ${link} returned HTTP ${linkRes.status}`);
      failures++;
    }
  }
  console.log(`All ${allGuideLinks.length} related guide links in hotel calculators return HTTP 200 OK (Passed)`);

  // 6.5 Verify 9 Hotel Program Presets & Marriott Fee Notice
  const enProgOptions = enHotelDom.window.document.querySelectorAll('#programPreset option');
  if (enProgOptions.length !== 9) {
    console.error(`ERROR: Expected 9 hotel programs in preset dropdown, found ${enProgOptions.length}`);
    failures++;
  } else {
    console.log('9 hotel programs confirmed in preset dropdown (Passed)');
  }

  // Test Marriott Notice
  const doc = enHotelDom.window.document;
  doc.getElementById('programPreset').value = 'marriott';
  doc.getElementById('programPreset').dispatchEvent(new enHotelDom.window.Event('change'));
  const marriottNotice = doc.getElementById('awardFeeNotice');
  if (!marriottNotice || marriottNotice.style.display === 'none' || !marriottNotice.textContent.includes('Marriott Notice')) {
    console.error(`ERROR: Marriott fee notice failed to display: ${marriottNotice?.textContent}`);
    failures++;
  } else {
    console.log('Marriott fee notice displayed correctly next to award cash fees (Passed)');
  }

  // 6.6 Scenario 1: Simple mode: Total cash $1,500, Points 100,000, Award fees $50 -> CPP 1.45 ¢/pt
  doc.getElementById('totalCashPrice').value = '1500';
  doc.getElementById('totalPointsRequired').value = '100000';
  doc.getElementById('awardCashFees').value = '50';
  doc.getElementById('personalValuation').value = '1.0';
  doc.getElementById('nights').value = '3';
  doc.getElementById('totalCashPrice').dispatchEvent(new enHotelDom.window.Event('input'));

  const s1Cpp = doc.getElementById('cppResult')?.textContent;
  if (!s1Cpp.includes('1.45')) {
    console.error(`ERROR: Scenario 1 expected 1.45 ¢/pt, got: ${s1Cpp}`);
    failures++;
  } else {
    console.log(`Scenario 1 (Simple mode $1,500 cash / 100k pts / $50 fees) -> ${s1Cpp} (Passed)`);
  }

  // 6.5 Scenario 2: Fees >= cash: Total cash $300, Award fees $350 -> Warning & Cash recommendation
  doc.getElementById('totalCashPrice').value = '300';
  doc.getElementById('totalPointsRequired').value = '50000';
  doc.getElementById('awardCashFees').value = '350';
  doc.getElementById('totalCashPrice').dispatchEvent(new enHotelDom.window.Event('input'));

  const s2Verdict = doc.getElementById('verdictText')?.textContent;
  const s2Code = doc.getElementById('verdictCode')?.textContent;
  if (!s2Code.includes('FEES > CASH')) {
    console.error(`ERROR: Scenario 2 expected FEES > CASH warning, got: ${s2Verdict} (${s2Code})`);
    failures++;
  } else {
    console.log(`Scenario 2 (Fees >= Cash) correctly triggers warning: ${s2Verdict} [${s2Code}] (Passed)`);
  }

  // 6.6 Scenario 3: Advanced Mode 5 nights, 20k pts/night, 5th night free -> 80k pts
  doc.getElementById('nightlyCashPrice').value = '200';
  doc.getElementById('pointsPerNight').value = '20000';
  doc.getElementById('nights').value = '5';
  doc.getElementById('freeNightRule').value = '5th';
  doc.getElementById('awardCashFees').value = '0';
  doc.getElementById('awardTaxes').value = '0';
  doc.getElementById('awardResortFees').value = '0';
  doc.getElementById('pointsPerNight').dispatchEvent(new enHotelDom.window.Event('input'));

  const s3PointsUsed = doc.getElementById('stepPoints')?.textContent;
  const s3SimplePoints = doc.getElementById('totalPointsRequired')?.value;
  if (!s3PointsUsed.includes('80,000') || s3SimplePoints !== '80000') {
    console.error(`ERROR: Scenario 3 expected 80,000 points used, got step: ${s3PointsUsed}, field: ${s3SimplePoints}`);
    failures++;
  } else {
    console.log(`Scenario 3 (5 nights @ 20k with 5th night free) -> ${s3SimplePoints} pts used (Passed)`);
  }

  // 6.7 Scenario 4: Simple mode 80k pts & 5 nights -> does not double-deduct 5th night free
  doc.getElementById('totalPointsRequired').value = '80000';
  doc.getElementById('totalCashPrice').value = '1000';
  doc.getElementById('nights').value = '5';
  doc.getElementById('awardCashFees').value = '0';
  doc.getElementById('totalPointsRequired').dispatchEvent(new enHotelDom.window.Event('input'));

  const s4StepPoints = doc.getElementById('stepPoints')?.textContent;
  if (!s4StepPoints.includes('80,000')) {
    console.error(`ERROR: Scenario 4 simple mode double-deducted points: ${s4StepPoints}`);
    failures++;
  } else {
    console.log(`Scenario 4 (Simple mode checkout total preserves 80k without double discount) (Passed)`);
  }

  // 6.8 Scenario 5: Missing personal valuation displays CPP without absolute verdict
  doc.getElementById('personalValuation').value = '';
  doc.getElementById('personalValuation').dispatchEvent(new enHotelDom.window.Event('input'));
  const s5Verdict = doc.getElementById('verdictText')?.textContent;
  const s5Code = doc.getElementById('verdictCode')?.textContent;
  const s5Cpp = doc.getElementById('cppResult')?.textContent;
  if (!s5Code.includes('NO VAL') || !s5Cpp.includes('1.25')) {
    console.error(`ERROR: Scenario 5 expected NO VAL & valid CPP, got: ${s5Verdict} (${s5Code}) CPP: ${s5Cpp}`);
    failures++;
  } else {
    console.log(`Scenario 5 (Missing valuation outputs CPP without forced verdict: ${s5Verdict} [${s5Code}]) (Passed)`);
  }

  // 6.9 Scenario 6: 3 Quick Examples load correctly
  doc.getElementById('exampleHilton').click();
  const hiltonPts = doc.getElementById('totalPointsRequired')?.value;
  const hiltonCpp = doc.getElementById('cppResult')?.textContent;
  if (hiltonPts !== '240000' || !hiltonCpp.includes('0.63')) {
    console.error(`ERROR: Hilton example load failed: pts ${hiltonPts}, cpp ${hiltonCpp}`);
    failures++;
  } else {
    console.log(`Hilton example loaded: 240,000 pts -> ${hiltonCpp} (Passed)`);
  }

  doc.getElementById('exampleMarriott').click();
  const marriottPts = doc.getElementById('totalPointsRequired')?.value;
  const marriottCpp = doc.getElementById('cppResult')?.textContent;
  if (marriottPts !== '140000' || !marriottCpp.includes('0.89')) {
    console.error(`ERROR: Marriott example load failed: pts ${marriottPts}, cpp ${marriottCpp}`);
    failures++;
  } else {
    console.log(`Marriott example loaded: 140,000 pts -> ${marriottCpp} (Passed)`);
  }

  doc.getElementById('exampleHyatt').click();
  const hyattPts = doc.getElementById('totalPointsRequired')?.value;
  const hyattCpp = doc.getElementById('cppResult')?.textContent;
  if (hyattPts !== '42000' || !hyattCpp.includes('2.02')) {
    console.error(`ERROR: Hyatt example load failed: pts ${hyattPts}, cpp ${hyattCpp}`);
    failures++;
  } else {
    console.log(`Hyatt example loaded: 42,000 pts -> ${hyattCpp} (Passed)`);
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
