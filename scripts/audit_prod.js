 // we might not have node-fetch, use native fetch (node 18+)
// we checked we have node v22

async function auditUrl(url, ua, expectedH1) {
  const ts = Date.now();
  const headers = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': ua
  };
  const res = await fetch(`${url}?audit=${ts}`, { headers });
  if (res.status !== 200) throw new Error(`[FAIL] ${url} returned ${res.status}`);
  
  if (url.endsWith('.xml') || url.endsWith('.txt')) {
     const text = await res.text();
     if (!text.includes('xml') && !text.includes('Sitemap')) throw new Error(`[FAIL] ${url} content issue`);
     console.log(`[PASS] ${url} OK. Length: ${text.length}`);
     return;
  }
  
  const text = await res.text();
  const h1Match = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (expectedH1 && (!h1Match || !h1Match[1].includes(expectedH1))) {
     throw new Error(`[FAIL] ${url} H1 mismatch! Expected to contain '${expectedH1}', got: ${h1Match ? h1Match[1] : 'null'}`);
  }
  console.log(`[PASS] ${url} OK with UA: ${ua.substring(0, 15)}... H1: ${h1Match ? h1Match[1].trim() : ''}`);
}

const uas = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
];

const tests = [
  { url: 'https://points-miles-calculator.pages.dev/en/', h1: 'Points and Miles Calculators' },
  { url: 'https://points-miles-calculator.pages.dev/en/calculators/points-vs-cash/', h1: 'Points vs Cash' },
  { url: 'https://points-miles-calculator.pages.dev/en/calculators/hotel-points-vs-cash/', h1: 'Hotel Award Stay' },
  { url: 'https://points-miles-calculator.pages.dev/en/values/amex-membership-rewards/', h1: 'Amex Membership Rewards' },
  { url: 'https://points-miles-calculator.pages.dev/en/values/chase-ultimate-rewards/', h1: 'Chase Ultimate Rewards' },
  { url: 'https://points-miles-calculator.pages.dev/sitemap.xml', h1: null },
  { url: 'https://points-miles-calculator.pages.dev/robots.txt', h1: null },
];

async function run() {
  for (const test of tests) {
    for (const ua of uas) {
      await auditUrl(test.url, ua, test.h1);
    }
  }
}

run().catch(e => { console.error(e); process.exit(1); });
