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
      
      // Strict hreflang bidirectional verification
      for (const link of links) {
          const href = link.href;
          const lang = link.getAttribute('hreflang');
          
          if (!href.startsWith('https://points-miles-calculator.pages.dev')) continue;
          
          const altPath = href.replace('https://points-miles-calculator.pages.dev', '');
          const altRes = await fetch(`${baseUrl}${altPath}`);
          
          if (altRes.status !== 200) {
              console.error(`ERROR: hreflang target returned ${altRes.status}: ${href} (from ${u})`);
              failures++;
              continue;
          }
          
          const altDom = new JSDOM(altRes.data);
          const altDoc = altDom.window.document;
          const altH1 = altDoc.querySelector('h1');
          const altRobots = altDoc.querySelector('meta[name="robots"]');
          const altCanonical = altDoc.querySelector('link[rel="canonical"]');
          
          if (altH1 && altH1.textContent.toLowerCase().includes('page not found')) {
              console.error(`ERROR: hreflang target is a custom 404 page: ${href} (from ${u})`);
              failures++;
              continue;
          }
          if (altRobots && altRobots.content.includes('noindex')) {
              console.error(`ERROR: hreflang target has noindex: ${href} (from ${u})`);
              failures++;
              continue;
          }
          if (altCanonical && altCanonical.href.endsWith('/404.html')) {
              console.error(`ERROR: hreflang target canonical points to 404: ${href} (from ${u})`);
              failures++;
              continue;
          }
          
          // Check bidirectional reference
          const backLinks = Array.from(altDoc.querySelectorAll('link[rel="alternate"][hreflang]'));
          let hasBackRef = false;
          for (const backLink of backLinks) {
              // Ensure one of the target's alternates points back to the origin
              if (backLink.href === u || backLink.href === u + '/') {
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

  // 4. Share link param recovery & Example round-trip
  console.log('\n--- Hotel & Transfer Bonus Round Trip Test ---');
  const hotelHtml = (await fetch(`${baseUrl}/calculators/hotel-points-vs-cash/?cash=1000&nights=5&taxes=500&points=20000&fifthNight=true`)).data;
  const buyHtml = (await fetch(`${baseUrl}/calculators/buy-points/?buyAmt=50000&price=500&bonusPct=20`)).data;
  
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

  // Read the link from the example page
  const exHtmlRes = await fetch(`${baseUrl}/examples/transfer-bonus-break-even/`);
  const exDom = new JSDOM(exHtmlRes.data);
  const transferLink = exDom.window.document.querySelector('.btn').href;
  
  console.log(`Found link in example: ${transferLink}`);
  // Should look like /calculators/transfer-bonus/?targetMiles=60000&baseRatio=1&bonusPercent=20&increment=1000
  
  const transferHtml = (await fetch(`${baseUrl}${transferLink}`)).data;
  const vTransDom = new JSDOM(transferHtml, { runScripts: "dangerously", url: `${baseUrl}${transferLink}` });
  await new Promise(r => setTimeout(r, 100));
  const tDoc = vTransDom.window.document;
  
  const transReq = tDoc.getElementById('targetMiles').value;
  const transBase = tDoc.getElementById('baseRatio').value;
  const transBon = tDoc.getElementById('bonusPercent').value;
  const transInc = tDoc.getElementById('increment').value;
  
  const rawPointsText = tDoc.getElementById('rawPoints').textContent;
  const actualPointsText = tDoc.getElementById('actualPoints').textContent;
  
  if(transReq !== '60000' || transBase !== '1' || transBon !== '20' || transInc !== '1000') {
      console.error(`ERROR: Transfer Bonus standard params not properly loaded! Got: req=${transReq}, base=${transBase}, bonus=${transBon}, inc=${transInc}`);
      failures++;
  }
  
  if(rawPointsText !== '50,000' || actualPointsText !== '50,000') {
      console.error(`ERROR: Transfer Bonus calculation failed for standard params. Expected 50,000/50,000, got raw=${rawPointsText}, actual=${actualPointsText}`);
      failures++;
  }
  
  // Verify canonical has no query strings
  const transCanonical = tDoc.querySelector('link[rel="canonical"]');
  if (!transCanonical || transCanonical.href.includes('?')) {
      console.error(`ERROR: Transfer Bonus canonical URL is invalid or contains query string! Got: ${transCanonical ? transCanonical.href : 'null'}`);
      failures++;
  }

  // Test legacy parameters backward compatibility
  console.log('\n--- Transfer Bonus Legacy Param Test (?req=60000&ratio=1&bonus=20&inc=1000) ---');
  const legacyUrl = `/calculators/transfer-bonus/?req=60000&ratio=1&bonus=20&inc=1000`;
  const legacyHtml = (await fetch(`${baseUrl}${legacyUrl}`)).data;
  const vLegacyDom = new JSDOM(legacyHtml, { runScripts: "dangerously", url: `${baseUrl}${legacyUrl}` });
  await new Promise(r => setTimeout(r, 100));
  const lDoc = vLegacyDom.window.document;
  
  const lReq = lDoc.getElementById('targetMiles').value;
  const lBase = lDoc.getElementById('baseRatio').value;
  const lBon = lDoc.getElementById('bonusPercent').value;
  const lInc = lDoc.getElementById('increment').value;
  const lRaw = lDoc.getElementById('rawPoints').textContent;
  const lActual = lDoc.getElementById('actualPoints').textContent;
  
  if(lReq !== '60000' || lBase !== '1' || lBon !== '20' || lInc !== '1000') {
      console.error(`ERROR: Transfer Bonus legacy params failed to map to input fields! Got: req=${lReq}, base=${lBase}, bonus=${lBon}, inc=${lInc}`);
      failures++;
  }
  if(lRaw !== '50,000' || lActual !== '50,000') {
      console.error(`ERROR: Transfer Bonus legacy params calculation failed. Expected 50,000/50,000, got raw=${lRaw}, actual=${lActual}`);
      failures++;
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
