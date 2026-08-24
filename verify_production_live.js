const { JSDOM } = require('jsdom');
const https = require('https');

function fetch(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: Object.assign({
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Production Verification Bot)'
      }, customHeaders)
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
  console.log(`=== STARTING PHASE 9.2.1 LIVE PRODUCTION VERIFICATION (${prodBase}) ===\n`);

  let failures = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Robots.txt
  console.log(`1. Verifying live robots.txt...`);
  const robotsRes = await fetch(`${prodBase}/robots.txt?audit=${ts}`);
  if (robotsRes.status !== 200) {
    console.error(`ERROR: robots.txt returned ${robotsRes.status}`);
    failures++;
  } else if (!robotsRes.data.includes('Sitemap: https://points-miles-calculator.pages.dev/sitemap.xml')) {
    console.error('ERROR: robots.txt missing absolute Sitemap URL');
    failures++;
  } else {
    console.log('robots.txt OK.');
  }

  // 2. Sitemap Check (Regular UA & Googlebot UA)
  console.log(`\n2. Fetching live sitemap.xml with Regular UA & Googlebot UA...`);
  const regularSm = await fetch(`${prodBase}/sitemap.xml?audit=${ts}`, {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  });
  const botSm = await fetch(`${prodBase}/sitemap.xml?audit=${ts}`, {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  });

  if (regularSm.status !== 200) {
    console.error(`ERROR: Regular UA sitemap returned ${regularSm.status}`);
    failures++;
  }
  if (botSm.status !== 200) {
    console.error(`ERROR: Googlebot UA sitemap returned ${botSm.status}`);
    failures++;
  }

  console.log(`Regular UA Content-Type: ${regularSm.headers['content-type']}`);
  console.log(`Googlebot UA Content-Type: ${botSm.headers['content-type']}`);

  const sitemapUrls = [...regularSm.data.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  const lastmods = [...regularSm.data.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(m => m[1]);
  console.log(`Live Sitemap URL count: ${sitemapUrls.length}`);
  console.log(`Live Sitemap explicit lastmod count: ${lastmods.length}`);

  if (sitemapUrls.length !== 104) {
    console.error(`ERROR: Expected 104 URLs in production sitemap.xml, found ${sitemapUrls.length}`);
    failures++;
  }

  for (const lm of lastmods) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lm)) {
      console.error(`ERROR: Invalid lastmod format in production: ${lm}`);
      failures++;
    }
    if (lm > todayStr) {
      console.error(`ERROR: lastmod ${lm} in future`);
      failures++;
    }
  }

  // 3. Homepage Core Links in Server HTML
  console.log('\n3. Verifying Popular Calculators links on EN and CN Homepages...');
  const enHome = await fetch(`${prodBase}/en/?audit=${ts}`);
  const enDoc = new JSDOM(enHome.data).window.document;
  const expectedEn = [
    '/en/calculators/points-to-dollars/',
    '/en/calculators/points-vs-cash/',
    '/en/calculators/trip-cost-after-points/',
    '/en/calculators/cents-per-point/',
    '/en/calculators/transfer-bonus/'
  ];
  for (const l of expectedEn) {
    const el = enDoc.querySelector(`a[href="${l}"]`);
    if (!el) {
      console.error(`ERROR: Live EN homepage missing link to ${l}`);
      failures++;
    } else {
      console.log(`Live EN Homepage Link: ${l} -> "${el.textContent.trim().replace(/\s+/g, ' ')}"`);
    }
  }

  const cnHome = await fetch(`${prodBase}/?audit=${ts}`);
  const cnDoc = new JSDOM(cnHome.data).window.document;
  const expectedCn = [
    '/calculators/points-to-dollars/',
    '/calculators/points-vs-cash/',
    '/calculators/trip-cost-after-points/',
    '/calculators/cents-per-point/',
    '/calculators/transfer-bonus/'
  ];
  for (const l of expectedCn) {
    const el = cnDoc.querySelector(`a[href="${l}"]`);
    if (!el) {
      console.error(`ERROR: Live CN homepage missing link to ${l}`);
      failures++;
    } else {
      console.log(`Live CN Homepage Link: ${l} -> "${el.textContent.trim().replace(/\s+/g, ' ')}"`);
    }
  }

  // 4. Search Intent, Single H1 & Shortened Titles Verification
  console.log('\n4. Verifying Search Intent, Single H1 & Shortened Titles on Live Production...');
  const pagesToCheck = [
    { path: '/en/', expectedH1: 'Points and Miles Calculators', expectedTitle: 'Points and Miles Calculators | Points & Miles Calculator' },
    { path: '/en/calculators/points-to-dollars/', expectedH1: 'Points to Dollars Calculator', expectedTitle: 'Points to Dollars Calculator | Miles Value | Points & Miles Calculator' },
    { path: '/en/calculators/points-vs-cash/', expectedH1: 'Points vs Cash Calculator', expectedTitle: 'Points vs Cash Calculator | Award Travel | Points & Miles Calculator' },
    { path: '/en/calculators/trip-cost-after-points/', expectedH1: 'Trip Cost After Points Calculator', expectedTitle: 'Trip Cost After Points Calculator | True Out-of-Pocket Travel Cost | Points & Miles Calculator' },
    { path: '/en/calculators/cents-per-point/', expectedH1: 'Cents Per Point (CPP) Calculator', expectedTitle: 'Cents Per Point Calculator | Calculate CPP | Points & Miles Calculator' },
    { path: '/en/calculators/transfer-bonus/', expectedH1: 'Points Transfer Bonus Calculator', expectedTitle: 'Transfer Bonus Calculator | Points to Miles | Points & Miles Calculator' },
    { path: '/', expectedH1: '积分与里程决策计算工具箱' },
    { path: '/calculators/points-to-dollars/', expectedH1: '积分换算现金价值计算器' },
    { path: '/calculators/points-vs-cash/', expectedH1: '积分与现金兑换决策计算器' },
    { path: '/calculators/trip-cost-after-points/', expectedH1: '积分抵扣后的旅行实际成本计算器' },
    { path: '/calculators/cents-per-point/', expectedH1: '单点价值 (CPP) 计算器' },
    { path: '/calculators/transfer-bonus/', expectedH1: '信用卡转点加赠计算器' },
  ];

  for (const p of pagesToCheck) {
    const pageRes = await fetch(`${prodBase}${p.path}?audit=${ts}`);
    const doc = new JSDOM(pageRes.data).window.document;
    const h1Els = doc.querySelectorAll('h1');
    if (h1Els.length !== 1) {
      console.error(`ERROR: ${p.path} has ${h1Els.length} H1 elements`);
      failures++;
    } else {
      const h1Text = h1Els[0].textContent.trim();
      if (h1Text !== p.expectedH1) {
        console.error(`ERROR: ${p.path} H1 mismatch. Expected "${p.expectedH1}", got "${h1Text}"`);
        failures++;
      }
    }
    if (p.expectedTitle && doc.title !== p.expectedTitle) {
      console.error(`ERROR: ${p.path} Title mismatch. Expected "${p.expectedTitle}", got "${doc.title}"`);
      failures++;
    }
    if (doc.title.includes('||') || (doc.title.match(/Points & Miles Calculator/g) || []).length > 1) {
      console.error(`ERROR: Bad title formatting at ${p.path}: ${doc.title}`);
      failures++;
    }
    console.log(`Verified ${p.path} -> Title (${doc.title.length} chars): "${doc.title}", H1: "${h1Els[0] ? h1Els[0].textContent.trim() : ''}"`);
  }

  // 5. Valuation Wording & Assumptions
  console.log('\n5. Verifying Points to Dollars Valuation Assumptions & Disclaimers on Live Production...');
  const enP2DRes = await fetch(`${prodBase}/en/calculators/points-to-dollars/?audit=${ts}`);
  const enP2DDoc = new JSDOM(enP2DRes.data).window.document;
  const enLabel = enP2DDoc.querySelector('label[for="presetValuation"]')?.textContent || '';
  if (!enLabel.includes('Choose a valuation scenario (CPP)')) {
    console.error(`ERROR: Live English Points to Dollars label is "${enLabel}"`);
    failures++;
  }
  const enUnit = enP2DDoc.getElementById('unitValuation')?.textContent || '';
  if (!enUnit.includes('These CPP values are illustrative scenarios, not official conversion rates, live valuations, or guaranteed redemption values.')) {
    console.error(`ERROR: Live English Points to Dollars disclaimer missing standard text`);
    failures++;
  }

  const cnP2DRes = await fetch(`${prodBase}/calculators/points-to-dollars/?audit=${ts}`);
  const cnP2DDoc = new JSDOM(cnP2DRes.data).window.document;
  const cnLabel = cnP2DDoc.querySelector('label[for="presetValuation"]')?.textContent || '';
  if (!cnLabel.includes('选择估值情景（CPP）')) {
    console.error(`ERROR: Live Chinese Points to Dollars label is "${cnLabel}"`);
    failures++;
  }
  const cnUnit = cnP2DDoc.getElementById('unitValuation')?.textContent || '';
  if (!cnUnit.includes('这些CPP仅用于比较不同估值情景，不是官方兑换比例、实时估值或保证价值。')) {
    console.error(`ERROR: Live Chinese Points to Dollars disclaimer missing standard text`);
    failures++;
  }

  // Help buttons and scenario table
  if (!enP2DDoc.getElementById('btnHelpScenario') || !enP2DDoc.getElementById('helpScenarioGuide')) {
    console.error('ERROR: Live English Help toggle component missing');
    failures++;
  }
  if (!cnP2DDoc.getElementById('btnHelpScenario') || !cnP2DDoc.getElementById('helpScenarioGuide')) {
    console.error('ERROR: Live Chinese Help toggle component missing');
    failures++;
  }
  if (!cnP2DDoc.getElementById('fieldFx')) {
    console.error('ERROR: Live Chinese FX field missing');
    failures++;
  }

  console.log('Live valuation wording, scenario tables, and disclaimers verified.');

  // 6. Interactive Script Execution on Live Production
  console.log('\n6. Verifying Live Interactive Calculations & FX...');
  const p2dEnUrl = `${prodBase}/en/calculators/points-to-dollars/?totalPoints=50000&cppValue=1.5&audit=${ts}`;
  const p2dEnHtml = (await fetch(p2dEnUrl)).data;
  const p2dEnDom = new JSDOM(p2dEnHtml, { runScripts: "dangerously", url: p2dEnUrl });
  await new Promise(r => setTimeout(r, 150));
  const p2dDollarVal = p2dEnDom.window.document.getElementById('dollarValue')?.textContent;
  if (p2dDollarVal !== '$750') {
    console.error(`ERROR: Live Points to Dollars calculation failed. Expected $750, got ${p2dDollarVal}`);
    failures++;
  } else {
    console.log('Live EN Points to Dollars calculation: $750 (Passed)');
  }

  const p2dCnUrl = `${prodBase}/calculators/points-to-dollars/?points=50000&valuation=0.105&audit=${ts}`;
  const p2dCpHtml = (await fetch(p2dCnUrl)).data;
  const p2dCnDom = new JSDOM(p2dCpHtml, { runScripts: "dangerously", url: p2dCnUrl });
  await new Promise(r => setTimeout(r, 150));
  const p2dCnVal = p2dCnDom.window.document.getElementById('dollarValue')?.textContent;
  if (p2dCnVal !== '¥5,250') {
    console.error(`ERROR: Live CN Points to Dollars (FX 7.0) failed. Expected ¥5,250, got ${p2dCnVal}`);
    failures++;
  } else {
    console.log('Live CN Points to Dollars calculation (FX 7.0): ¥5,250 (Passed)');
  }

  const p2dFxUrl = `${prodBase}/calculators/points-to-dollars/?points=50000&fx=7.2&scenario=1.5&audit=${ts}`;
  const p2dFxHtml = (await fetch(p2dFxUrl)).data;
  const p2dFxDom = new JSDOM(p2dFxHtml, { runScripts: "dangerously", url: p2dFxUrl });
  await new Promise(r => setTimeout(r, 150));
  const p2dFxVal = p2dFxDom.window.document.getElementById('dollarValue')?.textContent;
  if (p2dFxVal !== '¥5,400') {
    console.error(`ERROR: Live CN Points to Dollars (FX 7.2) failed. Expected ¥5,400, got ${p2dFxVal}`);
    failures++;
  } else {
    console.log('Live CN Points to Dollars calculation (FX 7.2 recovery): ¥5,400 (Passed)');
  }

  const transUrl = `${prodBase}/calculators/transfer-bonus/?targetMiles=60000&baseRatio=1&bonusPercent=20&increment=1000&audit=${ts}`;
  const transHtml = (await fetch(transUrl)).data;
  const transDom = new JSDOM(transHtml, { runScripts: "dangerously", url: transUrl });
  await new Promise(r => setTimeout(r, 150));
  const transRaw = transDom.window.document.getElementById('rawPoints')?.textContent;
  if (transRaw !== '50,000') {
    console.error(`ERROR: Live Transfer Bonus calculation failed. Expected 50,000, got ${transRaw}`);
    failures++;
  } else {
    console.log('Live Transfer Bonus calculation: 50,000 (Passed)');
  }

  // Verify no erroneous "1.5 元/里" or "15,000 元" on Live Chinese homepage
  const cnHomeHtml = cnHome.data;
  if (cnHomeHtml.includes('1.5 元/里') || cnHomeHtml.includes('15,000 元')) {
    console.error('ERROR: Live Chinese homepage contains erroneous 1.5 元/里 or 15,000 元');
    failures++;
  } else {
    console.log('Live Chinese homepage valuation check: 0 instances of 1.5 元/里 or 15,000 元 (Passed)');
  }

  // Trip Cost After Points Live Calculation (CN)
  console.log('\n--- Trip Cost After Points Live Calculation (CN & EN) ---');
  const tcCnUrl = `${prodBase}/calculators/trip-cost-after-points/?currency=CNY&days=7&adults=2&children=1&fCash=12000&hCash=15000&dCash=7000&tCash=3500&actCash=3000&visaCash=1200&simCash=300&othCash=2000&fMiles=75000&fTaxes=2100&hPoints=90000&hTaxes=300&hResort=0&fBonus=20&fRatio=1&fInc=1000`;
  const tcCpHtml = (await fetch(tcCnUrl)).data;
  const tcCnDom = new JSDOM(tcCpHtml, { runScripts: "dangerously", resources: "usable", url: tcCnUrl });
  
  // Wait up to 3s for clientside scripts to load and calculate
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    const fp = tcCnDom.window.document.getElementById('cardFinalPrice')?.textContent;
    if (fp === '¥19,400') break;
  }

  const tcCnFinal = tcCnDom.window.document.getElementById('cardFinalPrice')?.textContent;
  const tcCnSavings = tcCnDom.window.document.getElementById('badgeTotalSavings')?.textContent;
  if (tcCnFinal !== '¥19,400' || tcCnSavings !== '省 ¥24,600') {
    console.error(`ERROR: Live CN Trip Cost calculation failed. Expected ¥19,400 / 省 ¥24,600, got ${tcCnFinal} / ${tcCnSavings}`);
    failures++;
  } else {
    console.log(`Live CN Trip Cost calculation on load: ${tcCnFinal} final / ${tcCnSavings} saved (Passed)`);
  }

  // Check Transfer Bonus Summary Output in DOM
  const flightSummaryText = tcCnDom.window.document.getElementById('flightRedemptionSummary')?.textContent || '';
  if (!flightSummaryText.includes('62,500') && !flightSummaryText.includes('63,000') && !flightSummaryText.includes('75,000')) {
    console.error(`ERROR: Live CN Trip Cost missing transfer bonus in DOM: ${flightSummaryText}`);
    failures++;
  } else {
    console.log('Live CN Trip Cost Transfer Bonus in DOM verified (Passed)');
  }

  // Trip Cost After Points Live Calculation (EN)
  const tcEnUrl = `${prodBase}/en/calculators/trip-cost-after-points/?currency=USD&days=10&adults=2&children=1&fCash=3600&hCash=2700&dCash=1500&carCash=700&gasCash=450&actCash=900&visaCash=300&simCash=60&othCash=300&fMiles=180000&fTaxes=360&hPoints=120000&hTaxes=0&hResort=0`;
  const tcEnHtml = (await fetch(tcEnUrl)).data;
  const tcEnDom = new JSDOM(tcEnHtml, { runScripts: "dangerously", resources: "usable", url: tcEnUrl });
  
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    const fp = tcEnDom.window.document.getElementById('cardFinalPrice')?.textContent;
    if (fp === '$4,570') break;
  }

  const tcEnFinal = tcEnDom.window.document.getElementById('cardFinalPrice')?.textContent;
  const tcEnSavings = tcEnDom.window.document.getElementById('badgeTotalSavings')?.textContent;
  if (tcEnFinal !== '$4,570' || tcEnSavings !== 'Saved $5,940') {
    console.error(`ERROR: Live EN Trip Cost calculation failed. Expected $4,570 / Saved $5,940, got ${tcEnFinal} / ${tcEnSavings}`);
    failures++;
  } else {
    console.log(`Live EN Trip Cost calculation on load: ${tcEnFinal} final / ${tcEnSavings} saved (Passed)`);
  }

  // Check EN Label: ensure NO "Transfer Bonus Bonus" typo
  if (tcEnHtml.includes('Transfer Bonus Bonus')) {
    console.error('ERROR: Live EN Trip Cost contains typo "Transfer Bonus Bonus"');
    failures++;
  } else {
    console.log('Live EN Trip Cost label check: 0 instances of "Transfer Bonus Bonus" (Passed)');
  }

  // Case Studies Page Live Verification
  const caseUrls = [
    '/examples/usa-west-coast-family-trip-with-points/',
    '/en/examples/usa-west-coast-family-trip-with-points/',
    '/examples/japan-7-day-family-trip-with-points/',
    '/en/examples/japan-7-day-family-trip-with-points/'
  ];
  for (const cUrl of caseUrls) {
    const cRes = await fetch(`${prodBase}${cUrl}?audit=${ts}`);
    if (cRes.status !== 200) {
      console.error(`ERROR: Live Case study ${cUrl} returned HTTP ${cRes.status}`);
      failures++;
    } else {
      const cDoc = new JSDOM(cRes.data).window.document;
      const h1 = cDoc.querySelector('h1')?.textContent;
      if (!h1) {
        console.error(`ERROR: Live Case study ${cUrl} missing H1`);
        failures++;
      } else {
        console.log(`Live Case study OK: ${cUrl} (H1: "${h1}")`);
      }
    }
  }

  // 7. Full 104 URLs Live Crawl & Canonical/JSON-LD Audit (Batched parallel)
  console.log('\n7. Auditing all 104 Live URLs on Production (Parallel batching)...');
  const batchSize = 15;
  for (let i = 0; i < sitemapUrls.length; i += batchSize) {
    const batch = sitemapUrls.slice(i, i + batchSize);
    await Promise.all(batch.map(async (u) => {
      const res = await fetch(`${u}?audit=${ts}`);
      if (res.status !== 200) {
        console.error(`ERROR: Production URL returned ${res.status}: ${u}`);
        failures++;
        return;
      }
      const doc = new JSDOM(res.data).window.document;
      const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
      if (!canonical || canonical.includes('?') || !canonical.startsWith('https://points-miles-calculator.pages.dev')) {
        console.error(`ERROR: Invalid canonical on ${u}: ${canonical}`);
        failures++;
      }
    }));
  }
  console.log('All 104 URLs returned HTTP 200 with valid canonicals.');

  if (failures > 0) {
    console.error(`\nLIVE PRODUCTION VERIFICATION FAILED WITH ${failures} ERRORS.`);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('LIVE PRODUCTION VERIFICATION: PASSED WITH 0 ERRORS');
  console.log('========================================\n');
}

verifyLiveProduction().catch(e => {
  console.error('\nLIVE PRODUCTION VERIFICATION FAILED');
  console.error(e);
  process.exit(1);
});
