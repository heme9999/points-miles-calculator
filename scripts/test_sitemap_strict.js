const fs = require('fs');
const http = require('http');

const BASE_URL = 'http://localhost:8083';

async function runTests() {
  console.log('=== Strict Sitemap Validation ===');
  let failures = 0;

  for (const path of ['/sitemap-index.xml', '/sitemap-en.xml', '/sitemap-zh.xml']) {
    const res = await fetch(`${BASE_URL}${path}`);
    if (res.status !== 404) {
      console.error(`[FAIL] ${path} returned ${res.status}, expected 404`);
      failures++;
    } else {
      console.log(`[PASS] ${path} is 404`);
    }
  }

  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  const contentType = sitemapRes.headers.get('content-type');
  if (!contentType || (!contentType.includes('application/xml') && !contentType.includes('text/xml'))) {
    console.error(`[FAIL] Sitemap Content-Type is ${contentType}, expected XML`);
    failures++;
  } else {
    console.log(`[PASS] Sitemap Content-Type: ${contentType}`);
  }

  const xmlText = await sitemapRes.text();
  if (xmlText.charCodeAt(0) === 0xFEFF) {
    console.error(`[FAIL] Sitemap starts with BOM`);
    failures++;
  }
  if (!xmlText.trim().startsWith('<?xml')) {
    console.error(`[FAIL] Sitemap does not start with <?xml`);
    failures++;
  }

  // Regex parse urls
  const urls = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xmlText)) !== null) {
    urls.push(match[1]);
  }

  console.log(`Found ${urls.length} URLs in sitemap`);
  
  if (urls.length !== 104) {
    console.error(`[FAIL] Expected 104 URLs, found ${urls.length}`);
    failures++;
  } else {
    console.log(`[PASS] URL count is exactly 104`);
  }

  const locs = new Set();
  
  for (const loc of urls) {
    if (!loc.startsWith('https://points-miles-calculator.pages.dev/')) {
      console.error(`[FAIL] Invalid host/protocol in loc: ${loc}`);
      failures++;
    }
    if (loc.includes('?') || loc.includes('#')) {
      console.error(`[FAIL] URL contains param or fragment: ${loc}`);
      failures++;
    }
    
    if (locs.has(loc)) {
      console.error(`[FAIL] Duplicate URL in sitemap: ${loc}`);
      failures++;
    }
    locs.add(loc);
  }

  const testUrl = urls[0].replace('https://points-miles-calculator.pages.dev', BASE_URL);
  const pageRes = await fetch(testUrl);
  const pageHtml = await pageRes.text();
  const canonicalMatch = pageHtml.match(/<link rel="canonical" href="([^"]+)"/);
  if (canonicalMatch && canonicalMatch[1] === urls[0]) {
     console.log(`[PASS] Self-referencing canonical on ${urls[0]}`);
  } else {
     console.error(`[FAIL] Canonical missing or mismatched on ${urls[0]}. Found: ${canonicalMatch ? canonicalMatch[1] : 'null'}`);
     failures++;
  }

  const gbRes = await fetch(`${BASE_URL}/sitemap.xml`, { headers: { 'User-Agent': 'Googlebot' } });
  const gbText = await gbRes.text();
  if (gbText !== xmlText) {
    console.error(`[FAIL] Sitemap differs for Googlebot`);
    failures++;
  } else {
    console.log(`[PASS] Sitemap identical for Googlebot`);
  }

  if (failures > 0) {
    console.error(`\n[FAILED] ${failures} sitemap strict checks failed.`);
    process.exit(1);
  } else {
    console.log('\n[PASS] All strict sitemap checks passed!');
  }
}

runTests();
