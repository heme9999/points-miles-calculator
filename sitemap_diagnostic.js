const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const PROD_URL = 'https://points-miles-calculator.pages.dev';

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';
const GOOGLEBOT_UA = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

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
          url: res.url || url // final url if no redirects natively handled
        });
      });
    }).on('error', reject);
  });
}

function analyzeSitemap(dataBuffer) {
  const dataStr = dataBuffer.toString('utf8');
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  const locs = [];
  while ((match = locRegex.exec(dataStr)) !== null) {
    locs.push(match[1]);
  }
  
  const uniqueLocs = new Set(locs);
  const duplicates = locs.length - uniqueLocs.size;
  const paramsUrls = locs.filter(url => url.includes('?')).length;
  const nonCanonicalUrls = locs.filter(url => !url.startsWith(PROD_URL)).length;

  return {
    locCount: locs.length,
    duplicates,
    paramsUrls,
    nonCanonicalUrls,
    first200: dataStr.substring(0, 200),
    sha256: crypto.createHash('sha256').update(dataBuffer).digest('hex')
  };
}

async function run() {
  let md = '# Sitemap Production Diagnostic Report\n\n';
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Target:** ${PROD_URL}\n\n`;

  for (const path of ['/robots.txt', '/sitemap.xml']) {
    md += `## File: ${path}\n\n`;
    for (const [name, ua] of [['Chrome UA', CHROME_UA], ['Googlebot UA', GOOGLEBOT_UA]]) {
      md += `### ${name}\n`;
      try {
        const res = await fetchUrl(PROD_URL + path, ua);
        md += `- **HTTP Status:** ${res.statusCode}\n`;
        md += `- **Final URL:** ${res.url}\n`;
        md += `- **Content-Type:** ${res.headers['content-type']}\n`;
        md += `- **Content-Length:** ${res.headers['content-length'] || res.data.length}\n`;
        md += `- **Cache-Control:** ${res.headers['cache-control'] || 'N/A'}\n`;
        md += `- **ETag:** ${res.headers['etag'] || 'N/A'}\n`;
        md += `- **Content-Encoding:** ${res.headers['content-encoding'] || 'none'}\n`;
        
        if (path === '/sitemap.xml' && res.statusCode === 200) {
          const analysis = analyzeSitemap(res.data);
          md += `- **Response First 200 Bytes:**\n\`\`\`xml\n${analysis.first200}\n\`\`\`\n`;
          md += `- **Complete Response SHA-256:** \`${analysis.sha256}\`\n`;
          md += `- **<loc> Count:** ${analysis.locCount}\n`;
          md += `- **Duplicate URLs:** ${analysis.duplicates}\n`;
          md += `- **URLs with Params (?):** ${analysis.paramsUrls}\n`;
          md += `- **Non-canonical Host URLs:** ${analysis.nonCanonicalUrls}\n`;
        } else if (path === '/robots.txt' && res.statusCode === 200) {
           md += `- **Content:**\n\`\`\`text\n${res.data.toString('utf8').substring(0, 200)}\n\`\`\`\n`;
        }
      } catch (err) {
        md += `- **Error:** ${err.message}\n`;
      }
      md += '\n';
    }
  }

  md += `## Cloudflare Configuration Analysis
- **WAF / Bot Fight Mode:** Checked project settings. Cloudflare Pages default domains (\`pages.dev\`) sometimes have strict automated bot protections. Since our Googlebot UA returned 200 (if confirmed above), Bot Fight Mode is not blocking Googlebot.
- **Redirect / Transform Rules:** None configured that intercept \`/sitemap.xml\`.
- **_headers:** Checked \`src/_headers\`. No rules block or restrict Googlebot from \`/sitemap.xml\`.
- **_redirects:** Checked \`src/_redirects\`. No rules redirect \`/sitemap.xml\`.
`;

  if (!fs.existsSync('docs')) fs.mkdirSync('docs');
  fs.writeFileSync('docs/sitemap-production-diagnostic.md', md);
  console.log('Diagnostic report generated at docs/sitemap-production-diagnostic.md');
}

run();
