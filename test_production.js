const { JSDOM } = require('jsdom');
const http = require('http');
const fs = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers: { 'Cache-Control': 'no-cache' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, res }));
    }).on('error', reject);
  });
}

async function runTests() {
  const baseUrl = 'http://localhost:8083';
  console.log('--- Starting P1 & P2 Local Verification ---');

  // 1. Sitemap Check
  const smRes = await fetch(`${baseUrl}/sitemap.xml`);
  const urls = [...smRes.data.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  console.log(`Sitemap URLs found: ${urls.length}`);
  
  // We added 6 new examples, so the expected count should be 89 + 6 = 95
  // But let's dynamically verify all sitemap URLs are healthy
  if (urls.length < 95) {
    console.error('ERROR: Sitemap should have at least 95 URLs! Found: ' + urls.length);
    process.exit(1);
  }

  // 2. Comprehensive Sitemap Loop
  console.log('\n--- Full Sitemap Audit ---');
  let failures = 0;
  const linkGraph = new Map(); // tracking all out-links

  for (let u of urls) {
      if(!u.includes('http')) continue;
      // ensure no query params in sitemap
      if (u.includes('?')) {
          console.error(`ERROR: Sitemap contains query params: ${u}`);
          failures++;
      }
      
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
      
      // Check title dupes
      if(title.includes('Points & Miles Calculator | Points & Miles Calculator') || title.includes('里程账 | 里程账')) {
          console.error(`ERROR: Duplicate brand in ${u}: ${title}`);
          failures++;
      }

      // Track all <a> links for orphan checking
      const aTags = Array.from(doc.querySelectorAll('a')).map(a => a.href);
      linkGraph.set(uPath, aTags);

      // Check hreflang and canonical
      const links = Array.from(doc.querySelectorAll('link[rel="alternate"][hreflang]'));
      const canonical = doc.querySelector('link[rel="canonical"]');
      
      if (!canonical || canonical.href.includes('?')) {
          console.error(`ERROR: Invalid canonical for ${u}`);
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

      // Check x-default presence
      const hasXDefault = links.some(l => l.getAttribute('hreflang') === 'x-default');
      if (links.length > 0 && !hasXDefault) {
          console.error(`ERROR: Missing x-default at ${u}`);
          failures++;
      }
  }

  // 3. Orphan Page Check
  console.log('\n--- Orphan Page Check ---');
  const allInternalLinks = new Set();
  for (const [page, links] of linkGraph.entries()) {
      links.forEach(l => {
          if (l.startsWith('/')) allInternalLinks.add(l);
          if (l.startsWith('http://localhost:8083')) allInternalLinks.add(l.replace('http://localhost:8083', ''));
          if (l.startsWith('https://points-miles-calculator.pages.dev')) allInternalLinks.add(l.replace('https://points-miles-calculator.pages.dev', ''));
      });
  }

  let orphans = 0;
  for (const page of linkGraph.keys()) {
      // exclude root since it's the entry point
      if (page === '/' || page === '/en/') continue;
      
      let isLinked = false;
      // try matching the exact path or path without trailing slash
      for (const link of allInternalLinks) {
          if (link === page || link + '/' === page || link === page + '/') {
              isLinked = true;
              break;
          }
      }
      
      if (!isLinked) {
          console.error(`ORPHAN PAGE DETECTED: ${page}`);
          orphans++;
          failures++;
      }
  }
  
  if (orphans === 0) {
      console.log('No orphan pages found.');
  }

  // 4. Share link param recovery
  console.log('\n--- Hotel Share Link Contract Test ---');
  const hotelHtml = (await fetch(`${baseUrl}/calculators/hotel-points-vs-cash/?cash=1000&nights=5&taxes=500&points=20000&fifthNight=true`)).data;
  const buyHtml = (await fetch(`${baseUrl}/calculators/buy-points/?buyAmt=50000&price=500&bonusPct=20`)).data;
  const transferHtml = (await fetch(`${baseUrl}/calculators/transfer-bonus/?targetMiles=60000&baseRatio=1&bonusPercent=20&increment=1000`)).data;
  
  const vHotelDom = new JSDOM(hotelHtml, { runScripts: "dangerously", url: `${baseUrl}/calculators/hotel-points-vs-cash/?cash=1000&nights=5&taxes=500&points=20000&fifthNight=true` });
  
  await new Promise(r => setTimeout(r, 100)); // wait for script execution
  const hotelP = vHotelDom.window.document.getElementById('pointsPerNight').value;
  const hotelF = vHotelDom.window.document.getElementById('freeNightRule').value;
  if(hotelP !== '20000' || hotelF !== '5th') {
      console.error('ERROR: Hotel legacy parameter parsing failed!');
      failures++;
  }
  
  const vBuyDom = new JSDOM(buyHtml, { runScripts: "dangerously", url: `${baseUrl}/calculators/buy-points/?buyAmt=50000&price=500&bonusPct=20` });
  await new Promise(r => setTimeout(r, 100));
  const buyP = vBuyDom.window.document.getElementById('pointsToBuy').value;
  const buyB = vBuyDom.window.document.getElementById('bonusPercentage').value;
  if(buyP !== '50000' || buyB !== '20') {
      console.error('ERROR: Buy Points legacy parameter parsing failed!');
      failures++;
  }

  const vTransDom = new JSDOM(transferHtml, { runScripts: "dangerously", url: `${baseUrl}/calculators/transfer-bonus/?targetMiles=60000&baseRatio=1&bonusPercent=20&increment=1000` });
  await new Promise(r => setTimeout(r, 100));
  const transReq = vTransDom.window.document.getElementById('targetMiles').value;
  const transBon = vTransDom.window.document.getElementById('bonusPercent').value;
  if(transReq !== '60000' || transBon !== '20') {
      console.error('ERROR: Transfer Bonus legacy parameter parsing failed!');
      failures++;
  }
  
  if (failures > 0) {
      console.error(`\nFAILED WITH ${failures} ERRORS.`);
      process.exit(1);
  }

  console.log('\nAll tests passed successfully!');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
