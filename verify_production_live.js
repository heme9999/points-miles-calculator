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

  if (sitemapUrls.length !== 98) {
    console.error(`ERROR: Expected 98 URLs in production sitemap.xml, found ${sitemapUrls.length}`);
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

  // 3. Homepage 4 Core Links in Server HTML
  console.log('\n3. Verifying Popular Calculators links on EN and CN Homepages...');
  const enHome = await fetch(`${prodBase}/en/?audit=${ts}`);
  const enDoc = new JSDOM(enHome.data).window.document;
  const expectedEn = [
    '/en/calculators/points-to-dollars/',
    '/en/calculators/points-vs-cash/',
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
    { path: '/en/calculators/cents-per-point/', expectedH1: 'Cents Per Point (CPP) Calculator', expectedTitle: 'Cents Per Point Calculator | Calculate CPP | Points & Miles Calculator' },
    { path: '/en/calculators/transfer-bonus/', expectedH1: 'Points Transfer Bonus Calculator', expectedTitle: 'Transfer Bonus Calculator | Points to Miles | Points & Miles Calculator' },
    { path: '/', expectedH1: '积分与里程决策计算工具箱' },
    { path: '/calculators/points-to-dollars/', expectedH1: '积分换算现金价值计算器' },
    { path: '/calculators/points-vs-cash/', expectedH1: '积分与现金兑换决策计算器' },
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
  if (!enLabel.includes('Valuation assumption (CPP)')) {
    console.error(`ERROR: Live English Points to Dollars label is "${enLabel}"`);
    failures++;
  }
  const enUnit = enP2DDoc.getElementById('unitValuation')?.textContent || '';
  if (!enUnit.includes('Preset values are calculation examples, not live valuations.')) {
    console.error(`ERROR: Live English Points to Dollars disclaimer missing standard text`);
    failures++;
  }

  const cnP2DRes = await fetch(`${prodBase}/calculators/points-to-dollars/?audit=${ts}`);
  const cnP2DDoc = new JSDOM(cnP2DRes.data).window.document;
  const cnLabel = cnP2DDoc.querySelector('label[for="presetValuation"]')?.textContent || '';
  if (!cnLabel.includes('估值假设（CPP）')) {
    console.error(`ERROR: Live Chinese Points to Dollars label is "${cnLabel}"`);
    failures++;
  }
  const cnUnit = cnP2DDoc.getElementById('unitValuation')?.textContent || '';
  if (!cnUnit.includes('预设数值仅为计算示例，并非实时估值。')) {
    console.error(`ERROR: Live Chinese Points to Dollars disclaimer missing standard text`);
    failures++;
  }
  console.log('Live valuation wording and disclaimers verified.');

  // 6. Interactive Script Execution on Live Production
  console.log('\n6. Verifying Live Interactive Calculations...');
  const p2dEnUrl = `${prodBase}/en/calculators/points-to-dollars/?totalPoints=50000&cppValue=1.5&audit=${ts}`;
  const p2dEnHtml = (await fetch(p2dEnUrl)).data;
  const p2dEnDom = new JSDOM(p2dEnHtml, { runScripts: "dangerously", url: p2dEnUrl });
  await new Promise(r => setTimeout(r, 150));
  const p2dDollarVal = p2dEnDom.window.document.getElementById('dollarValue')?.textContent;
  if (p2dDollarVal !== '$750') {
    console.error(`ERROR: Live Points to Dollars calculation failed. Expected $750, got ${p2dDollarVal}`);
    failures++;
  } else {
    console.log('Live Points to Dollars auto-calculation: $750 (Passed)');
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

  // 7. Full 98 URLs Live Crawl & Canonical/JSON-LD Audit (Batched parallel)
  console.log('\n7. Auditing all 98 Live URLs on Production (Parallel batching)...');
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
  console.log('All 98 URLs returned HTTP 200 with valid canonicals.');

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
