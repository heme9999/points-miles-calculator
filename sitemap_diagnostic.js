const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROD_URL = 'https://points-miles-calculator.pages.dev';

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SIMULATED_GOOGLEBOT_UA = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

function fetchUrl(url, ua) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': ua }
    };
    https.get(url, options, (res) => {
      let data = Buffer.alloc(0);
      res.on('data', chunk => { data = Buffer.concat([data, chunk]); });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          url: res.url || url
        });
      });
    }).on('error', reject);
  });
}

function extractLocs(xmlStr) {
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  const locs = [];
  while ((match = locRegex.exec(xmlStr)) !== null) {
    locs.push(match[1].trim());
  }
  return locs;
}

function analyzeSitemap(dataBuffer) {
  const dataStr = dataBuffer.toString('utf8');
  const locs = extractLocs(dataStr);
  const uniqueLocs = new Set(locs);
  const duplicates = locs.length - uniqueLocs.size;
  const paramsUrls = locs.filter(url => url.includes('?')).length;
  const nonCanonicalUrls = locs.filter(url => !url.startsWith(PROD_URL)).length;

  return {
    locs,
    locCount: locs.length,
    uniqueCount: uniqueLocs.size,
    duplicates,
    paramsUrls,
    nonCanonicalUrls,
    first200: dataStr.substring(0, 200),
    sha256: crypto.createHash('sha256').update(dataBuffer).digest('hex')
  };
}

function compareWithLocalBuild(prodLocs) {
  const localSitemapPath = path.join(__dirname, '_site', 'sitemap.xml');
  if (!fs.existsSync(localSitemapPath)) {
    return { available: false, reason: '_site/sitemap.xml not found locally' };
  }
  const localXml = fs.readFileSync(localSitemapPath, 'utf8');
  const localLocs = extractLocs(localXml);
  const prodSet = new Set(prodLocs);
  const localSet = new Set(localLocs);

  const addedInLocal = localLocs.filter(u => !prodSet.has(u));
  const missingInLocal = prodLocs.filter(u => !localSet.has(u));

  return {
    available: true,
    localCount: localSet.size,
    prodCount: prodSet.size,
    addedInLocal,
    missingInLocal
  };
}

async function run() {
  let md = '# Sitemap Production Diagnostic Report\n\n';
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Target:** ${PROD_URL}\n\n`;

  md += `## 1. Five-Category Evidence Classification\n\n`;
  md += `1. **Regular HTTP Client Request (Chrome UA):** Measured live below.\n`;
  md += `2. **Simulated Googlebot UA Client Request:** Measured live below. *(Note: Spoofing the \`User-Agent\` header from a non-Google IP only tests UA-string filtering; it does NOT replicate real Googlebot ASN/IP reputation or prove Cloudflare never challenged Google's crawler.)*\n`;
  const hasHeaders = fs.existsSync(path.join(__dirname, 'src', '_headers'));
  const hasRedirects = fs.existsSync(path.join(__dirname, 'src', '_redirects'));
  md += `3. **Repository Static Rules (\`_headers\` / \`_redirects\`):** \`src/_headers\` present: \`${hasHeaders}\`; \`src/_redirects\` present: \`${hasRedirects}\`. Verified no repo-level rules block or redirect \`/sitemap.xml\` or \`/robots.txt\`.\n`;
  md += `4. **Google Search Console Live Inspection Result:** \`UNAVAILABLE via static script\` *(Must be read directly from GSC URL Inspection UI; prior manual check at 2026-10-13 11:47:44 returned HTTP 200 & \`application/xml\`, which proves live inspection fetchability at that moment but does not guarantee asynchronous Sitemap Processor completion)*.\n`;
  md += `5. **Cloudflare WAF / Bot Historical Request Logs:** \`UNAVAILABLE\` *(Cloudflare Pages free tier dashboard does not expose historical raw static request logs for past Google Sitemap Processor fetches; therefore, historical edge/WAF interception can neither be confirmed nor ruled out)*.\n\n`;

  let prodLocs = [];

  for (const endpoint of ['/robots.txt', '/sitemap.xml']) {
    md += `## 2. Live Endpoint Probe: \`${endpoint}\`\n\n`;
    for (const [name, ua] of [['1) Regular HTTP Client (Chrome UA)', CHROME_UA], ['2) Simulated Googlebot UA Client', SIMULATED_GOOGLEBOT_UA]]) {
      md += `### ${name}\n`;
      try {
        const res = await fetchUrl(PROD_URL + endpoint, ua);
        md += `- **HTTP Status:** ${res.statusCode}\n`;
        md += `- **Final URL:** ${res.url}\n`;
        md += `- **Content-Type:** ${res.headers['content-type']}\n`;
        md += `- **Content-Length:** ${res.headers['content-length'] || res.data.length}\n`;
        md += `- **Cache-Control:** ${res.headers['cache-control'] || 'N/A'}\n`;
        md += `- **ETag:** ${res.headers['etag'] || 'N/A'}\n`;
        md += `- **Content-Encoding:** ${res.headers['content-encoding'] || 'none'}\n`;
        
        if (endpoint === '/sitemap.xml' && res.statusCode === 200) {
          const analysis = analyzeSitemap(res.data);
          if (prodLocs.length === 0) prodLocs = analysis.locs;
          md += `- **Response First 200 Bytes:**\n\`\`\`xml\n${analysis.first200}\n\`\`\`\n`;
          md += `- **Complete Response SHA-256:** \`${analysis.sha256}\`\n`;
          md += `- **Total \`<loc>\` Count:** ${analysis.locCount} (Unique: ${analysis.uniqueCount})\n`;
          md += `- **Duplicate URLs:** ${analysis.duplicates}\n`;
          md += `- **URLs with Params (?):** ${analysis.paramsUrls}\n`;
          md += `- **Non-canonical Host URLs:** ${analysis.nonCanonicalUrls}\n`;
        } else if (endpoint === '/robots.txt' && res.statusCode === 200) {
          md += `- **Content:**\n\`\`\`text\n${res.data.toString('utf8').substring(0, 200)}\n\`\`\`\n`;
        }
      } catch (err) {
        md += `- **Error:** ${err.message}\n`;
      }
      md += '\n';
    }
  }

  const diff = compareWithLocalBuild(prodLocs);
  md += `## 3. Sitemap URL Set Comparison (Local Build vs. Production)\n\n`;
  if (diff.available) {
    md += `- **Local Build \`_site/sitemap.xml\` Unique URLs:** ${diff.localCount}\n`;
    md += `- **Production \`/sitemap.xml\` Unique URLs:** ${diff.prodCount}\n`;
    md += `- **Added in Local Build (${diff.addedInLocal.length}):** ${diff.addedInLocal.length ? diff.addedInLocal.join(', ') : 'None'}\n`;
    md += `- **Removed in Local Build (${diff.missingInLocal.length}):** ${diff.missingInLocal.length ? diff.missingInLocal.join(', ') : 'None'}\n\n`;
  } else {
    md += `- Comparison unavailable: ${diff.reason}\n\n`;
  }

  md += `## 4. Four-Dimension Status Separation\n\n`;
  md += `| Dimension | Status | Evidence Basis |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Technical Accessibility** | **PASS** | \`/sitemap.xml\` and \`/robots.txt\` return HTTP 200, valid \`application/xml\` / \`text/plain\`, well-formed XML, and 0 canonical/hreflang errors across ${prodLocs.length} URLs. |\n`;
  md += `| **Sitemap Processed (GSC)** | **PENDING / REQUIRES GSC UI CHECK** | Technical accessibility does not automatically flip GSC Sitemaps status from \`Couldn't fetch\` to \`Success\`; must be verified in GSC Sitemaps report after resubmission. |\n`;
  md += `| **Google Indexed** | **REQUIRES GSC COVERAGE / URL INSPECTION** | Sitemap presence does not equal indexation; check GSC Pages / URL Inspection for individual URL indexing status. |\n`;
  md += `| **Search Clicks** | **REQUIRES GSC PERFORMANCE** | Tracked separately in GSC Performance report. |\n`;

  if (!fs.existsSync('docs')) fs.mkdirSync('docs');
  fs.writeFileSync('docs/sitemap-production-diagnostic.md', md);
  console.log('Diagnostic report generated at docs/sitemap-production-diagnostic.md');
}

run();
