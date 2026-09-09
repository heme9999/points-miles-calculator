const fs = require('fs');
const http = require('http');
const { JSDOM } = require('jsdom');

const BASE_URL = 'http://localhost:8083';

async function fetchSitemapUrls() {
  const res = await fetch(`${BASE_URL}/sitemap.xml`);
  const text = await res.text();
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

async function runAudit() {
  console.log('Starting indexability audit...');
  const urls = await fetchSitemapUrls();
  console.log(`Found ${urls.length} URLs in sitemap.`);
  
  if (urls.length !== 106) {
    console.error(`ERROR: Expected exactly 106 URLs in sitemap, found ${urls.length}`);
    process.exit(1);
  }

  // To check internal links, we'll collect all outlinks from content areas
  const contentLinks = new Set();
  
  const results = {
    indexable: [],
    'technical-blocked': [],
    'weak-content': [],
    'weak-internal-links': []
  };

  const pagesData = {};

  // First pass: fetch and parse all pages
  for (const prodUrl of urls) {
    const localPath = prodUrl.replace('https://points-miles-calculator.pages.dev', '');
    const localUrl = `${BASE_URL}${localPath}`;
    
    try {
      const res = await fetch(localUrl);
      const text = await res.text();
      const contentType = res.headers.get('content-type') || '';
      
      const dom = new JSDOM(text);
      const doc = dom.window.document;
      
      pagesData[prodUrl] = {
        status: res.status,
        contentType,
        text,
        doc,
        prodUrl
      };
      
      // Collect links from main/article (exclude nav/footer)
      const main = doc.querySelector('main') || doc.body;
      const navs = main.querySelectorAll('nav, footer, .reads');
      navs.forEach(n => n.remove()); // remove navs from this temporary DOM
      
      const aTags = main.querySelectorAll('a[href]');
      aTags.forEach(a => {
        let href = a.getAttribute('href');
        if (href.startsWith('/')) {
          href = 'https://points-miles-calculator.pages.dev' + href;
        }
        if (href.startsWith('https://points-miles-calculator.pages.dev')) {
          // normalize trailing slash
          if (!href.endsWith('/') && !href.includes('.') && !href.includes('#')) {
            href += '/';
          }
          // strip hash
          href = href.split('#')[0];
          contentLinks.add(href);
        }
      });
      
    } catch (e) {
      console.error(`Failed to fetch ${localUrl}`, e);
      results['technical-blocked'].push(prodUrl);
    }
  }

  // Second pass: Evaluate indexability
  let hasDraftText = false;

  // Let's ensure the explicit check for 3 internal links is done for points-to-miles
  const linkCounts = {};
  for (const prodUrl of urls) linkCounts[prodUrl] = 0;
  
  // Re-parse purely to count incoming content links
  for (const [sourceUrl, data] of Object.entries(pagesData)) {
    const doc = new JSDOM(data.text).window.document;
    const main = doc.querySelector('main') || doc.body;
    const navs = main.querySelectorAll('nav, footer, .nav, .footer, header, .reads');
    navs.forEach(n => n.remove());
    
    const aTags = main.querySelectorAll('a[href]');
    const outlinks = new Set();
    aTags.forEach(a => {
      let href = a.getAttribute('href');
      if (href.startsWith('/')) href = 'https://points-miles-calculator.pages.dev' + href;
      href = href.split('#')[0];
      outlinks.add(href);
    });
    
    outlinks.forEach(link => {
      if (linkCounts[link] !== undefined && link !== sourceUrl) {
         linkCounts[link]++;
      }
    });
  }

  const enPointsToMiles = 'https://points-miles-calculator.pages.dev/en/calculators/points-to-miles-converter/';
  const zhPointsToMiles = 'https://points-miles-calculator.pages.dev/calculators/points-to-miles-converter/';
  
  if (linkCounts[enPointsToMiles] < 3) {
    console.error(`[FAIL] EN Points to Miles has only ${linkCounts[enPointsToMiles]} contextual links. Expected >= 3`);
    process.exit(1);
  } else {
    console.log(`[PASS] EN Points to Miles has ${linkCounts[enPointsToMiles]} contextual links.`);
  }

  if (linkCounts[zhPointsToMiles] < 3) {
    console.error(`[FAIL] ZH Points to Miles has only ${linkCounts[zhPointsToMiles]} contextual links. Expected >= 3`);
    process.exit(1);
  } else {
    console.log(`[PASS] ZH Points to Miles has ${linkCounts[zhPointsToMiles]} contextual links.`);
  }

  for (const [prodUrl, data] of Object.entries(pagesData)) {
    const { status, contentType, text, doc } = data;
    
    if (status !== 200 || !contentType.includes('text/html')) {
      results['technical-blocked'].push(prodUrl);
      continue;
    }
    
    const noindex = doc.querySelector('meta[name="robots"][content*="noindex"]');
    if (noindex) {
      results['technical-blocked'].push(prodUrl);
      continue;
    }
    
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
    if (canonical !== prodUrl || canonical.includes('?')) {
      results['technical-blocked'].push(prodUrl);
      continue;
    }
    
    const h1s = doc.querySelectorAll('h1');
    if (h1s.length !== 1) {
      results['technical-blocked'].push(prodUrl);
      continue;
    }
    
    const title = doc.title;
    const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content');
    if (!title || !desc) {
      results['technical-blocked'].push(prodUrl);
      continue;
    }
    
    if (title.toLowerCase().includes('404') || title.toLowerCase().includes('not found')) {
      results['technical-blocked'].push(prodUrl);
      continue;
    }
    
    if (text.includes('Wait,') || text.includes('TODO') || text.includes('TBD')) {
      hasDraftText = true;
      console.error(`[FAIL] Draft text leak found in ${prodUrl}`);
    }
    
    const textContent = doc.body.textContent.trim().replace(/\s+/g, ' ');
    if (textContent.length < 200) {
      results['weak-content'].push(prodUrl);
      continue;
    }
    
    if (prodUrl !== 'https://points-miles-calculator.pages.dev/' && prodUrl !== 'https://points-miles-calculator.pages.dev/en/') {
      if (linkCounts[prodUrl] === 0) {
        results['weak-internal-links'].push(prodUrl);
        continue;
      }
    }
    
    results.indexable.push(prodUrl);
  }
  
  if (hasDraftText) {
    process.exit(1);
  }
  
  console.log('\n--- Indexability Audit Results ---');
  console.log(`Indexable: ${results.indexable.length}`);
  console.log(`Technical Blocked: ${results['technical-blocked'].length}`);
  console.log(`Weak Content: ${results['weak-content'].length}`);
  console.log(`Weak Internal Links: ${results['weak-internal-links'].length}`);
  
  if (results['technical-blocked'].length > 0) {
    console.error('[FAIL] Some URLs are technically blocked:', results['technical-blocked']);
    process.exit(1);
  }

  // Check structured data JSON-LD parse
  let jsonldFails = 0;
  for (const [prodUrl, data] of Object.entries(pagesData)) {
    const ldNodes = data.doc.querySelectorAll('script[type="application/ld+json"]');
    ldNodes.forEach(n => {
      try {
         JSON.parse(n.innerHTML);
      } catch (e) {
         console.error(`[FAIL] Invalid JSON-LD on ${prodUrl}`);
         jsonldFails++;
      }
    });
  }
  if (jsonldFails > 0) process.exit(1);

  // Intent uniqueness on 6 core tools
  const enCoreTools = [
    'https://points-miles-calculator.pages.dev/en/',
    'https://points-miles-calculator.pages.dev/en/calculators/points-to-miles-converter/',
    'https://points-miles-calculator.pages.dev/en/calculators/transfer-bonus/',
    'https://points-miles-calculator.pages.dev/en/calculators/points-to-dollars/',
    'https://points-miles-calculator.pages.dev/en/calculators/points-vs-cash/',
    'https://points-miles-calculator.pages.dev/en/calculators/cents-per-point/'
  ];
  
  const coreH1s = new Set();
  const coreTitles = new Set();
  for (const u of enCoreTools) {
    const t = pagesData[u].doc.title;
    const h = pagesData[u].doc.querySelector('h1').textContent;
    if (coreH1s.has(h) || coreTitles.has(t)) {
       console.error(`[FAIL] Duplicate Intent/Title detected on core tool: ${u}`);
       process.exit(1);
    }
    coreH1s.add(h);
    coreTitles.add(t);
  }
  
  console.log('[PASS] All core tools have unique intents and titles.');
  console.log('[PASS] Indexability Audit Completed Successfully.');
}

runAudit().catch(e => {
  console.error(e);
  process.exit(1);
});
