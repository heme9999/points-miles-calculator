const { JSDOM } = require('jsdom');
const http = require('http');
const fs = require('fs');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({ 'Cache-Control': 'no-cache' }, options.headers || {});
    http.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function runTests() {
  const baseUrl = 'http://localhost:8083';
  console.log('=== Starting Phase 9.2 Gatekeeper Tests ===\n');

  let failures = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Robots.txt check
  console.log('--- 1. Robots.txt Verification ---');
  const robotsRes = await fetch(`${baseUrl}/robots.txt`);
  if (robotsRes.status !== 200) {
    console.error(`ERROR: robots.txt returned status ${robotsRes.status}`);
    failures++;
  } else if (!robotsRes.data.includes('Sitemap: https://points-miles-calculator.pages.dev/sitemap.xml')) {
    console.error('ERROR: robots.txt does not contain full absolute Sitemap URL');
    failures++;
  } else {
    console.log('robots.txt OK and properly points to absolute sitemap URL.');
  }

  // 2. Sitemap UA & Format Verification
  console.log('\n--- 2. Sitemap UA & Format Verification ---');
  const regularSm = await fetch(`${baseUrl}/sitemap.xml`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
  });
  const botSm = await fetch(`${baseUrl}/sitemap.xml`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
  });

  if (regularSm.status !== 200) {
    console.error(`ERROR: Regular UA sitemap returned status ${regularSm.status}`);
    failures++;
  }
  if (botSm.status !== 200) {
    console.error(`ERROR: Googlebot UA sitemap returned status ${botSm.status}`);
    failures++;
  }

  // Validate XML syntax
  const sitemapXml = regularSm.data;
  if (!sitemapXml.startsWith('<?xml version="1.0" encoding="utf-8"?>') || !sitemapXml.includes('<urlset') || !sitemapXml.includes('</urlset>')) {
    console.error('ERROR: Sitemap is not valid XML or missing urlset wrapper');
    failures++;
  }

  // Parse URLs and lastmod
  const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  const lastmods = [...sitemapXml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(m => m[1]);
  console.log(`Sitemap total URLs: ${urls.length}`);
  console.log(`Sitemap explicit lastmod entries: ${lastmods.length}`);

  if (urls.length < 95) {
    console.error(`ERROR: Sitemap should have >= 95 URLs, found: ${urls.length}`);
    failures++;
  }

  // Verify unique URLs and no query params
  const urlSet = new Set();
  for (const u of urls) {
    if (urlSet.has(u)) {
      console.error(`ERROR: Duplicate URL in sitemap: ${u}`);
      failures++;
    }
    urlSet.add(u);
    if (u.includes('?')) {
      console.error(`ERROR: Sitemap contains query params: ${u}`);
      failures++;
    }
    if (u.includes('preview') || u.includes('localhost') || u.includes('127.0.0.1')) {
      console.error(`ERROR: Sitemap contains non-production URL: ${u}`);
      failures++;
    }
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

  // 3. English and Chinese Homepage "Popular Calculators" Server-Side HTML Links
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

  // 4. Search Intent & Single H1 Verification
  console.log('\n--- 4. Search Intent, Single H1 & Distinct Metadata ---');
  const pagesToCheck = [
    { path: '/en/', expectedH1: 'Points and Miles Calculators' },
    { path: '/en/calculators/points-to-dollars/', expectedH1: 'Points to Dollars Calculator' },
    { path: '/en/calculators/points-vs-cash/', expectedH1: 'Points vs Cash Calculator' },
    { path: '/en/calculators/cents-per-point/', expectedH1: 'Cents Per Point (CPP) Calculator' },
    { path: '/en/calculators/transfer-bonus/', expectedH1: 'Points Transfer Bonus Calculator' },
    { path: '/', expectedH1: '积分与里程决策计算工具箱' },
    { path: '/calculators/points-to-dollars/', expectedH1: '积分换算现金价值计算器' },
    { path: '/calculators/points-vs-cash/', expectedH1: '积分与现金兑换决策计算器' },
    { path: '/calculators/cents-per-point/', expectedH1: '单点价值 (CPP) 计算器' },
    { path: '/calculators/transfer-bonus/', expectedH1: '信用卡转点加赠计算器' },
  ];

  const titles = new Set();
  const descriptions = new Set();
  const h1s = new Set();

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
    console.log(`  Title: ${title}`);
    console.log(`  H1:    ${h1Els[0] ? h1Els[0].textContent.trim() : 'NONE'}`);
  }

  // 5. Points to Dollars Conversion Table Verification
  console.log('\n--- 5. Points to Dollars Example Table Verification ---');
  const p2dRes = await fetch(`${baseUrl}/en/calculators/points-to-dollars/`);
  const p2dDoc = new JSDOM(p2dRes.data).window.document;
  
  // Verify math in HTML table
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
      if (!p2dRes.data.includes(expectedVal)) {
        console.error(`ERROR: English Points to Dollars table missing ${expectedVal} for ${tier.miles} miles`);
        failures++;
      }
    }
  }
  console.log('Points to Dollars example table math verified successfully.');

  // 6. Comprehensive Sitemap Loop & Bidirectional hreflang / Canonical / JSON-LD
  console.log('\n--- 6. Comprehensive Sitemap Audit ---');
  const linkGraph = new Map();

  for (const u of urls) {
    const uPath = u.replace('https://points-miles-calculator.pages.dev', '');
    const dHtmlRes = await fetch(`${baseUrl}${uPath}`);
    if (dHtmlRes.status !== 200) {
      console.error(`ERROR: Sitemap URL returned ${dHtmlRes.status}: ${u}`);
      failures++;
      continue;
    }

    const dDom = new JSDOM(dHtmlRes.data);
    const doc = dDom.window.document;
    const title = doc.title;

    // Track links
    const aTags = Array.from(doc.querySelectorAll('a')).map(a => a.href);
    linkGraph.set(uPath, aTags);

    // Canonical check
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (!canonical || canonical.href.includes('?') || !canonical.href.startsWith('https://points-miles-calculator.pages.dev')) {
      console.error(`ERROR: Invalid canonical for ${u}: ${canonical ? canonical.href : 'null'}`);
      failures++;
    }

    // JSON-LD parsing
    const jsonlds = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    for (const j of jsonlds) {
      try {
        JSON.parse(j.textContent);
      } catch (e) {
        console.error(`ERROR: Invalid JSON-LD at ${u}`);
        failures++;
      }
    }

    // Hreflang bidirectional checks
    const links = Array.from(doc.querySelectorAll('link[rel="alternate"][hreflang]'));
    const hasXDefault = links.some(l => l.getAttribute('hreflang') === 'x-default');
    if (links.length > 0 && !hasXDefault) {
      console.error(`ERROR: Missing x-default at ${u}`);
      failures++;
    }

    for (const link of links) {
      const href = link.href;
      if (!href.startsWith('https://points-miles-calculator.pages.dev')) continue;

      const altPath = href.replace('https://points-miles-calculator.pages.dev', '');
      const altRes = await fetch(`${baseUrl}${altPath}`);
      if (altRes.status !== 200) {
        console.error(`ERROR: hreflang target returned ${altRes.status}: ${href} (from ${u})`);
        failures++;
        continue;
      }

      const altDoc = new JSDOM(altRes.data).window.document;
      const backLinks = Array.from(altDoc.querySelectorAll('link[rel="alternate"][hreflang]'));
      let hasBackRef = false;
      for (const backLink of backLinks) {
        if (backLink.href === u || backLink.href === u + '/' || backLink.href.replace(/\/$/, '') === u.replace(/\/$/, '')) {
          hasBackRef = true;
          break;
        }
      }
      if (!hasBackRef) {
        console.error(`ERROR: hreflang target ${href} does NOT link back to ${u}`);
        failures++;
      }
    }
  }

  // 7. Interactive Calculator Execution & Parameter Recovery
  console.log('\n--- 7. Interactive Execution & Param Tests ---');
  
  // Points to Dollars param test
  const p2dEnUrl = `/en/calculators/points-to-dollars/?totalPoints=50000&cppValue=1.5`;
  const p2dEnHtml = (await fetch(`${baseUrl}${p2dEnUrl}`)).data;
  const p2dEnDom = new JSDOM(p2dEnHtml, { runScripts: "dangerously", url: `${baseUrl}${p2dEnUrl}` });
  await new Promise(r => setTimeout(r, 100));
  const p2dDollarVal = p2dEnDom.window.document.getElementById('dollarValue').textContent;
  if (p2dDollarVal !== '$750') {
    console.error(`ERROR: Points to Dollars calculation failed on load! Expected $750, got ${p2dDollarVal}`);
    failures++;
  } else {
    console.log('Points to Dollars auto-calculation on load: $750 (Passed)');
  }

  // Transfer Bonus standard param test
  const transUrl = `/calculators/transfer-bonus/?targetMiles=60000&baseRatio=1&bonusPercent=20&increment=1000`;
  const transHtml = (await fetch(`${baseUrl}${transUrl}`)).data;
  const transDom = new JSDOM(transHtml, { runScripts: "dangerously", url: `${baseUrl}${transUrl}` });
  await new Promise(r => setTimeout(r, 100));
  const transRaw = transDom.window.document.getElementById('rawPoints').textContent;
  const transActual = transDom.window.document.getElementById('actualPoints').textContent;
  if (transRaw !== '50,000' || transActual !== '50,000') {
    console.error(`ERROR: Transfer Bonus calculation failed. Expected 50,000, got raw=${transRaw}, actual=${transActual}`);
    failures++;
  } else {
    console.log('Transfer Bonus standard params calculation: 50,000/50,000 (Passed)');
  }

  // Transfer Bonus legacy param test
  const legUrl = `/calculators/transfer-bonus/?req=60000&ratio=1&bonus=20&inc=1000`;
  const legHtml = (await fetch(`${baseUrl}${legUrl}`)).data;
  const legDom = new JSDOM(legHtml, { runScripts: "dangerously", url: `${baseUrl}${legUrl}` });
  await new Promise(r => setTimeout(r, 100));
  const legRaw = legDom.window.document.getElementById('rawPoints').textContent;
  if (legRaw !== '50,000') {
    console.error(`ERROR: Transfer Bonus legacy params failed. Expected 50,000, got raw=${legRaw}`);
    failures++;
  } else {
    console.log('Transfer Bonus legacy alias params calculation: 50,000 (Passed)');
  }

  if (failures > 0) {
    console.error(`\nFAILED WITH ${failures} ERRORS.`);
    process.exit(1);
  }

  console.log('\nPASSED WITH 0 ERRORS');
}

runTests().catch(e => {
  console.error('\nFAILED');
  console.error(e);
  process.exit(1);
});
