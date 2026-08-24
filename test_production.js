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

  if (sitemapUrls.length !== 104) {
    console.error(`ERROR: Expected 104 URLs in sitemap, got ${sitemapUrls.length}`);
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
    { path: '/en/', expectedH1: 'Points and Miles Calculators', expectedTitle: 'Points and Miles Calculators | Points & Miles Calculator' },
    { path: '/en/calculators/points-to-dollars/', expectedH1: 'Points to Dollars Calculator', expectedTitle: 'Points to Dollars Calculator | Miles Value | Points & Miles Calculator' },
    { path: '/en/calculators/points-vs-cash/', expectedH1: 'Points vs Cash Calculator', expectedTitle: 'Points vs Cash Calculator | Award Travel | Points & Miles Calculator' },
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

  // Check EN Label: ensure NO "Transfer Bonus Bonus" typo
  if (tcEnHtml.includes('Transfer Bonus Bonus')) {
    console.error('ERROR: EN Trip Cost contains typo "Transfer Bonus Bonus"');
    failures++;
  } else {
    console.log('EN Trip Cost label typo check: 0 instances of "Transfer Bonus Bonus" (Passed)');
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
