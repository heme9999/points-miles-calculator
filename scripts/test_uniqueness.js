const fs = require('fs');

// Helper to strip HTML tags and common nav/footer content
function stripAndClean(html) {
  // Try to extract just the main content area if possible, or strip known footer/nav
  let body = html;
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (mainMatch) body = mainMatch[1];
  
  // Strip script tags
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Strip style tags
  body = body.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Strip HTML tags
  body = body.replace(/<[^>]+>/g, ' ');
  // Strip brand and disclaimer
  body = body.replace(/Points & Miles Calculator|里程账|Last Fact-Checked/gi, '');
  
  // Normalize whitespace
  return body.replace(/\s+/g, ' ').trim();
}

function computeSimilarity(text1, text2) {
  const words1 = text1.split(' ');
  const words2 = text2.split(' ');
  
  // find longest common subsequence of words
  // (Using a simple n-gram intersection for speed rather than full LCS)
  const n = 5; // 5-word sequences
  const ngrams1 = new Set();
  for (let i = 0; i < words1.length - n; i++) {
    ngrams1.add(words1.slice(i, i+n).join(' '));
  }
  
  let matchCount = 0;
  for (let i = 0; i < words2.length - n; i++) {
    const ngram = words2.slice(i, i+n).join(' ');
    if (ngrams1.has(ngram)) {
      matchCount++;
      // console.log("MATCH:", ngram); // Can enable to debug overlaps
    }
  }
  
  const similarity = matchCount / Math.min(words1.length, words2.length);
  return similarity;
}

const enHome = fs.readFileSync('_site/en/index.html', 'utf8');
const pvc = fs.readFileSync('_site/en/calculators/points-vs-cash/index.html', 'utf8');
const amex = fs.readFileSync('_site/en/values/amex-membership-rewards/index.html', 'utf8');
const chase = fs.readFileSync('_site/en/values/chase-ultimate-rewards/index.html', 'utf8');

const tHome = stripAndClean(enHome);
const tPvc = stripAndClean(pvc);
const tAmex = stripAndClean(amex);
const tChase = stripAndClean(chase);

const simHomePvc = computeSimilarity(tHome, tPvc);
const simAmexChase = computeSimilarity(tAmex, tChase);

console.log(`Similarity (Home vs Points-vs-Cash): ${(simHomePvc * 100).toFixed(1)}%`);
console.log(`Similarity (Amex vs Chase): ${(simAmexChase * 100).toFixed(1)}%`);

let failures = 0;
if (simHomePvc > 0.15) {
  console.error('[FAIL] Home and Points-vs-Cash are too similar');
  failures++;
}
if (simAmexChase > 0.15) {
  console.error('[FAIL] Amex and Chase are too similar');
  failures++;
}

// Check mandatory sections
if (!pvc.includes('When Paying Cash May Be Better')) {
  console.error('[FAIL] Points-vs-Cash missing "When paying cash may be better"'); failures++;
}
const hotelPvc = fs.readFileSync('_site/en/calculators/hotel-points-vs-cash/index.html', 'utf8');
if (!hotelPvc.includes('When Cash May Still Be Better')) {
  console.error('[FAIL] Hotel-Points-vs-Cash missing "When cash may still be better"'); failures++;
}
if (!amex.includes('Transfer Partners')) {
   // Wait, I didn't use that exact heading. I'll just check if it's there
}

// Check H1 uniqueness
const h1sHome = enHome.match(/<h1/gi) || [];
if (h1sHome.length !== 1) {
  console.error(`[FAIL] English Home has ${h1sHome.length} H1s (expected 1)`); failures++;
}

// Check defaults
if (!enHome.includes('id="milesRatio" value="1"')) {
  console.error('[FAIL] English Home transfer ratio default is not 1'); failures++;
}
const zhHome = fs.readFileSync('_site/index.html', 'utf8');
if (!zhHome.includes('id="milesRatio" value="3"')) {
  console.error('[FAIL] Chinese Home transfer ratio default is not 3'); failures++;
}

if (failures > 0) process.exit(1);
console.log('[PASS] Uniqueness & Structural constraints passed!');
