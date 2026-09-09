const fs = require('fs');
const http = require('http');
const path = require('path');
const { JSDOM } = require('jsdom');
const express = require('express');

const PORT = 8083;
const BASE_URL = `http://localhost:${PORT}`;

// 10 High Priority Targets for Phase 9.7.1
const HIGH_PRIORITY_TARGETS = [
  'https://points-miles-calculator.pages.dev/values/aeroplan-points/',
  'https://points-miles-calculator.pages.dev/values/capital-one-miles/',
  'https://points-miles-calculator.pages.dev/values/hilton-points/',
  'https://points-miles-calculator.pages.dev/values/hyatt-points/',
  'https://points-miles-calculator.pages.dev/values/marriott-points/',
  'https://points-miles-calculator.pages.dev/en/values/capital-one-miles/',
  'https://points-miles-calculator.pages.dev/en/values/hilton-points/',
  'https://points-miles-calculator.pages.dev/en/values/hyatt-points/',
  'https://points-miles-calculator.pages.dev/en/values/marriott-points/',
  'https://points-miles-calculator.pages.dev/en/calculators/trip-cost-after-points/'
];

function isSupportPage(url) {
  return !!url.match(/https:\/\/points-miles-calculator\.pages\.dev(\/en)?\/(about|contact|privacy|terms)\/?$/);
}

function isDirectoryPage(url) {
  const p = url.replace('https://points-miles-calculator.pages.dev', '');
  return ['/', '/en/', '/values/', '/en/values/', '/calculators/', '/en/calculators/', '/guides/', '/en/guides/', '/examples/', '/en/examples/', '/compare/', '/en/compare/'].includes(p);
}

function isCoreToolOrValuation(url) {
  if (isDirectoryPage(url)) return false;
  const p = url.replace('https://points-miles-calculator.pages.dev', '');
  return p.includes('/values/') || p.includes('/calculators/');
}

function isGuideOrComparison(url) {
  if (isDirectoryPage(url)) return false;
  const p = url.replace('https://points-miles-calculator.pages.dev', '');
  return p.includes('/guides/') || p.includes('/compare/') || p.includes('/blog/');
}

function isCaseStudy(url) {
  if (isDirectoryPage(url)) return false;
  const p = url.replace('https://points-miles-calculator.pages.dev', '');
  return p.includes('/examples/');
}

async function startServerIfNeeded() {
  return new Promise((resolve) => {
    const tester = http.get(`${BASE_URL}/sitemap.xml`, (res) => {
      resolve({ server: null, alreadyRunning: true });
    });
    tester.on('error', () => {
      const app = express();
      app.use(express.static(path.join(__dirname, '../_site')));
      const server = app.listen(PORT, () => {
        resolve({ server, alreadyRunning: false });
      });
    });
  });
}

async function runAudit() {
  const { server, alreadyRunning } = await startServerIfNeeded();
  let blockers = 0;
  const blockerMessages = [];

  function addBlocker(msg) {
    blockers++;
    blockerMessages.push(msg);
    console.error(`[BLOCKER] ${msg}`);
  }

  try {
    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    if (sitemapRes.status !== 200) {
      addBlocker(`sitemap.xml returned HTTP ${sitemapRes.status}`);
    }
    const sitemapText = await sitemapRes.text();
    const urls = [];
    const regex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = regex.exec(sitemapText)) !== null) {
      urls.push(match[1]);
    }

    if (urls.length !== 106) {
      addBlocker(`Expected exactly 106 unique URLs in sitemap, found ${urls.length}`);
    }

    // Verify all URLs are unique and parameter-free
    const uniqueUrls = new Set(urls);
    if (uniqueUrls.size !== urls.length) {
      addBlocker(`Sitemap contains duplicate URLs: ${urls.length} vs ${uniqueUrls.size} unique`);
    }
    urls.forEach(u => {
      if (u.includes('?') || u.includes('#')) {
        addBlocker(`Sitemap URL contains query/hash: ${u}`);
      }
    });

    const pagesData = {};
    const linkMap = {}; // target -> Set of sources
    urls.forEach(u => { linkMap[u] = new Set(); });

    // Fetch and parse all 106 URLs
    for (const prodUrl of urls) {
      const localPath = prodUrl.replace('https://points-miles-calculator.pages.dev', '');
      const localUrl = `${BASE_URL}${localPath}`;
      
      const res = await fetch(localUrl);
      if (res.status !== 200) {
        addBlocker(`${prodUrl} returned HTTP ${res.status}`);
      }
      const cType = res.headers.get('content-type') || '';
      if (!cType.includes('text/html')) {
        addBlocker(`${prodUrl} Content-Type is not text/html: ${cType}`);
      }

      const text = await res.text();
      const dom = new JSDOM(text);
      const doc = dom.window.document;

      // Meta verification
      const title = doc.querySelector('title')?.textContent?.trim();
      if (!title) {
        addBlocker(`${prodUrl} missing <title>`);
      }

      const h1Count = doc.querySelectorAll('h1').length;
      if (h1Count !== 1) {
        addBlocker(`${prodUrl} has ${h1Count} <h1> tags (expected exactly 1)`);
      }

      const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
      const expectedCanonical = prodUrl;
      if (canonical !== expectedCanonical) {
        addBlocker(`${prodUrl} Canonical mismatch. Expected: ${expectedCanonical}, got: ${canonical}`);
      }

      const robotsMeta = doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
      if (robotsMeta.toLowerCase().includes('noindex')) {
        addBlocker(`${prodUrl} contains robots noindex`);
      }

      // Check draft text leak in user-visible content
      const bodyClone = doc.body.cloneNode(true);
      bodyClone.querySelectorAll('script, style').forEach(s => s.remove());
      const visibleText = bodyClone.textContent || '';
      if (visibleText.includes('Wait,') || visibleText.includes('TODO') || visibleText.includes('TBD')) {
        addBlocker(`Draft text leak found in visible content of ${prodUrl}`);
      }

      pagesData[prodUrl] = { doc, text, title };
    }

    // Extract Contextual In-Content Links
    for (const [sourceUrl, data] of Object.entries(pagesData)) {
      const doc = new JSDOM(data.text).window.document;
      const main = doc.querySelector('main') || doc.body;

      // Strictly exclude Header, Footer, nav, breadcrumbs, unified recommendations (.reads)
      const excludeSelectors = 'nav, footer, .nav, .footer, header, .reads, .breadcrumbs, nav[aria-label="Breadcrumb"]';
      main.querySelectorAll(excludeSelectors).forEach(el => el.remove());

      const aTags = main.querySelectorAll('a[href]');
      aTags.forEach(a => {
        let href = a.getAttribute('href');
        if (!href) return;

        // Check for empty or generic anchor text
        const anchorText = a.textContent.trim().toLowerCase();
        if (anchorText === 'click here' || anchorText === '点击这里' || anchorText === '了解更多') {
          addBlocker(`Generic forbidden anchor text "${anchorText}" found in ${sourceUrl} pointing to ${href}`);
        }

        let targetUrl = '';
        if (href.startsWith('https://points-miles-calculator.pages.dev')) {
          targetUrl = href;
        } else if (href.startsWith('/')) {
          targetUrl = 'https://points-miles-calculator.pages.dev' + href;
        } else {
          return;
        }

        // Normalize URL by stripping query and hash
        targetUrl = targetUrl.split('?')[0].split('#')[0];
        if (!targetUrl.endsWith('/')) targetUrl += '/';

        // Check language cross-linking in contextual links
        const sourceIsEn = sourceUrl.includes('/en/');
        const targetIsEn = targetUrl.includes('/en/');
        if (sourceIsEn !== targetIsEn && targetUrl.startsWith('https://points-miles-calculator.pages.dev')) {
          addBlocker(`Cross-language in-content link: ${sourceUrl} -> ${targetUrl}`);
        }

        if (targetUrl !== sourceUrl && linkMap[targetUrl]) {
          linkMap[targetUrl].add(sourceUrl);
        }
      });
    }

    // Verify 10 High-Priority Targets meet Phase 9.7.1 criteria (>= 2 sources)
    console.log('\n--- Auditing 10 High Priority Targets ---');
    HIGH_PRIORITY_TARGETS.forEach(targetUrl => {
      const sources = Array.from(linkMap[targetUrl] || []);
      console.log(`[TARGET] ${targetUrl}`);
      console.log(`  Contextual Inbound Sources (${sources.length}):`);
      sources.forEach(s => console.log(`    <- ${s}`));
      if (sources.length < 2) {
        addBlocker(`Target page ${targetUrl} has only ${sources.length} in-content inbound sources (expected >= 2)`);
      }
    });

    // Classify all pages and generate warnings
    const warnings = [];
    let intentionalSupportPageCount = 0;

    for (const url of urls) {
      const sources = Array.from(linkMap[url] || []);
      const count = sources.length;

      if (isSupportPage(url)) {
        intentionalSupportPageCount++;
        continue; // Intentional support page: not counted as content/link warning
      }

      if (url === 'https://points-miles-calculator.pages.dev/' || url === 'https://points-miles-calculator.pages.dev/en/') {
        continue; // Root homepages
      }

      if (isCoreToolOrValuation(url)) {
        if (count === 0) {
          warnings.push({
            url,
            warningType: 'zero-contextual-inbound-links',
            contextualInboundSourceCount: 0,
            sources
          });
        } else if (count < 2) {
          warnings.push({
            url,
            warningType: 'insufficient-contextual-inbound-links',
            contextualInboundSourceCount: count,
            sources
          });
        }
      } else if (isGuideOrComparison(url)) {
        if (count === 0) {
          warnings.push({
            url,
            warningType: 'zero-contextual-inbound-links',
            contextualInboundSourceCount: 0,
            sources
          });
        }
      } else if (isCaseStudy(url)) {
        if (count === 0) {
          warnings.push({
            url,
            warningType: 'zero-contextual-inbound-links',
            contextualInboundSourceCount: 0,
            sources
          });
        }
      } else if (isDirectoryPage(url)) {
        // Section directory hub check
        if (count === 0) {
          warnings.push({
            url,
            warningType: 'zero-contextual-inbound-links',
            contextualInboundSourceCount: 0,
            sources
          });
        }
      }
    }

    console.log('\n========================================');
    console.log('       INDEXABILITY AUDIT SUMMARY       ');
    console.log('========================================');
    console.log(`Total URLs Audited: ${urls.length}`);
    console.log(`Intentional Support Pages: ${intentionalSupportPageCount}`);
    console.log(`Technical Blockers: ${blockers}`);
    console.log(`Content/Link Warnings: ${warnings.length}`);
    console.log('========================================\n');

    console.log('Warning Details:');
    warnings.forEach(w => {
      console.log(`- [${w.warningType}] (count: ${w.contextualInboundSourceCount}) ${w.url}`);
    });

    console.log('\n----------------------------------------');
    if (blockers === 0) {
      console.log('TECHNICAL INDEXABILITY: PASSED');
      console.log('TECHNICAL BLOCKERS: 0');
      console.log(`CONTENT/LINK WARNINGS: ${warnings.length}`);
      console.log('OPTIMIZATION STATUS: IN PROGRESS');
    } else {
      console.log('TECHNICAL INDEXABILITY: FAILED');
      console.log(`TECHNICAL BLOCKERS: ${blockers}`);
      console.log(`CONTENT/LINK WARNINGS: ${warnings.length}`);
      console.log('OPTIMIZATION STATUS: BLOCKED');
    }
    console.log('----------------------------------------\n');

    // Update or write warnings report
    let reportMd = `# Audit Warnings Report\n\n`;
    reportMd += `**Date**: ${new Date().toISOString()}\n`;
    reportMd += `**Total URLs**: ${urls.length}\n`;
    reportMd += `**Intentional Support Pages**: ${intentionalSupportPageCount}\n`;
    reportMd += `**Technical Blockers**: ${blockers}\n`;
    reportMd += `**Content/Link Warnings**: ${warnings.length}\n\n`;
    reportMd += `These warnings may reduce discovery or perceived page importance, but they do not prove that Google has excluded the URLs. Actual indexing status requires GSC validation.\n\n`;
    reportMd += `## Warning List\n\n`;
    warnings.forEach(w => {
      reportMd += `- **${w.url}**\n`;
      reportMd += `  - Warning Type: \`${w.warningType}\`\n`;
      reportMd += `  - Inbound Count: ${w.contextualInboundSourceCount}\n`;
      reportMd += `  - Sources: ${JSON.stringify(w.sources)}\n`;
    });
    fs.writeFileSync(path.join(__dirname, '../docs/seo-phase-9.7.1-warnings.md'), reportMd, 'utf8');

    if (server) server.close();
    process.exit(blockers === 0 ? 0 : 1);
  } catch (err) {
    console.error('Unexpected audit error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runAudit();
