const fs = require('fs');
const path = require('path');

const siteDir = path.join(__dirname, '../_site');

function getAllHtmlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllHtmlFiles(filePath, fileList);
    } else if (filePath.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function checkLinks() {
  console.log('Starting automated link check...');
  const htmlFiles = getAllHtmlFiles(siteDir);
  const internalLinks = new Set();
  const externalLinks = new Set();
  const pages = [];
  
  // 1. Collect all links, canonicals, hreflangs
  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const pageUrl = '/' + path.relative(siteDir, file).replace(/index\.html$/, '');
    pages.push(pageUrl);

    // Extract hrefs (a, link, canonical, hreflang)
    const hrefRegex = /(?:href|content)="([^"]+)"/g;
    let match;
    while ((match = hrefRegex.exec(content)) !== null) {
      const link = match[1];
      if (link.startsWith('http')) {
        // If it's the site's own domain, treat as internal
        if (link.includes('points-miles-calculator.pages.dev')) {
          const relative = link.replace('https://points-miles-calculator.pages.dev', '');
          if (relative) internalLinks.add(relative);
        } else {
          externalLinks.add(link);
        }
      } else if (link.startsWith('/')) {
        internalLinks.add(link);
      }
    }
    
    // Extract JSON-LD urls
    const jsonLdRegex = /"url"\s*:\s*"([^"]+)"/g;
    while ((match = jsonLdRegex.exec(content)) !== null) {
      const link = match[1];
      if (link.startsWith('http') && link.includes('points-miles-calculator.pages.dev')) {
        const relative = link.replace('https://points-miles-calculator.pages.dev', '');
        if (relative) internalLinks.add(relative);
      } else if (link.startsWith('/')) {
        internalLinks.add(link);
      }
    }
    
    // Extract mainEntityOfPage
    const mainEntityRegex = /"mainEntityOfPage"\s*:\s*"([^"]+)"/g;
    while ((match = mainEntityRegex.exec(content)) !== null) {
      const link = match[1];
      if (link.startsWith('http') && link.includes('points-miles-calculator.pages.dev')) {
        const relative = link.replace('https://points-miles-calculator.pages.dev', '');
        if (relative) internalLinks.add(relative);
      } else if (link.startsWith('/')) {
        internalLinks.add(link);
      }
    }
  }
  
  // Parse sitemap if it exists
  const sitemapPath = path.join(siteDir, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    const locRegex = /<loc>([^<]+)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(sitemapContent)) !== null) {
      const link = match[1];
      if (link.includes('points-miles-calculator.pages.dev')) {
        const relative = link.replace('https://points-miles-calculator.pages.dev', '');
        if (relative) internalLinks.add(relative);
      }
    }
  }

  let internalErrors = 0;
  let externalWarnings = 0;

  console.log(`Checking ${internalLinks.size} internal links...`);
  for (const link of internalLinks) {
    // Strip hash and query
    const cleanLink = link.split('#')[0].split('?')[0];
    if (cleanLink === '' || cleanLink === '/') continue;
    
    // Check if the physical file exists in _site
    let targetPath = path.join(siteDir, cleanLink);
    if (!fs.existsSync(targetPath)) {
      if (fs.existsSync(path.join(targetPath, 'index.html'))) {
        // ok
      } else {
        if (link.startsWith('/en/blog/') || link === '/en/404.html') {
          console.warn(`⚠️ Ignoring known missing translation: ${link}`);
        } else {
          console.error(`❌ Broken internal link: ${link}`);
          internalErrors++;
        }
      }
    }
  }

  console.log(`Checking ${externalLinks.size} external links (timeout 3s)...`);
  for (const link of externalLinks) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(link, { 
        method: 'HEAD', 
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Points-Miles-Bot)' }
      });
      clearTimeout(timeoutId);
      
      if (res.status >= 400 && res.status !== 403 && res.status !== 401) {
        console.warn(`⚠️ External link returned ${res.status}: ${link}`);
        externalWarnings++;
      }
    } catch (e) {
      console.warn(`⚠️ External link error/timeout: ${link}`);
      externalWarnings++;
    }
  }

  console.log('--- Summary ---');
  console.log(`Total Pages: ${pages.length}`);
  console.log(`Internal Errors: ${internalErrors}`);
  console.log(`External Warnings: ${externalWarnings}`);
  
  if (internalErrors > 0) {
    process.exit(1);
  } else {
    console.log('✅ Internal link check passed.');
  }
}

checkLinks();
