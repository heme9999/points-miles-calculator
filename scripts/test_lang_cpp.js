const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const express = require('express');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_PORT = 8089;
const BASE_URL = `http://127.0.0.1:${APP_PORT}`;

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function compositeAlpha(rgbaStr, bgRgbStr) {
  const parseColor = str => str.match(/[\d.]+/g).map(Number);
  const fg = parseColor(rgbaStr);
  const bg = parseColor(bgRgbStr);
  if (fg.length < 4 || fg[3] === 1) return fg.slice(0, 3);
  const alpha = fg[3];
  return [
    Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
    Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
    Math.round(fg[2] * alpha + bg[2] * (1 - alpha))
  ];
}

function getContrastRatio(rgb1, rgb2Str, bodyBgStr) {
  const parseRgb = str => str.match(/[\d.]+/g).map(Number).slice(0,3);
  const [r1, g1, b1] = parseRgb(rgb1);
  const [r2, g2, b2] = compositeAlpha(rgb2Str, bodyBgStr);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function runTests() {
  const app = express();
  app.use(express.static(path.join(__dirname, '../_site')));
  const server = app.listen(APP_PORT);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new"
  });

  let failures = 0;

  try {
    const viewports = [
      { name: 'Mobile 390px', width: 390, height: 844 },
      { name: 'Desktop 1280px', width: 1280, height: 800 }
    ];
    const pagesToCheck = [
      { url: '/', lang: 'zh' },
      { url: '/en/', lang: 'en' },
      { url: '/calculators/cents-per-point/', lang: 'zh' },
      { url: '/en/calculators/cents-per-point/', lang: 'en' }
    ];

    for (const vp of viewports) {
      console.log(`\nTesting Viewport: ${vp.name}`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });

      for (const p of pagesToCheck) {
        await page.goto(`${BASE_URL}${p.url}`);
        
        // Language Switcher Tests
        const langData = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('.lang-switcher a.lang-link'));
          if (links.length !== 2) return { error: 'Missing language links' };
          
          return links.map(a => {
            const style = window.getComputedStyle(a);
            const parentStyle = window.getComputedStyle(a.parentElement);
            const isCurrent = a.getAttribute('aria-current') === 'page';
            const rect = a.getBoundingClientRect();
            return {
              text: a.textContent.trim(),
              isCurrent,
              color: style.color,
              bgColor: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? window.getComputedStyle(document.body).backgroundColor : style.backgroundColor,
              width: rect.width,
              height: rect.height,
              visible: rect.width > 0 && rect.height > 0
            };
          });
        });

        if (langData.error) {
          console.error(`[FAIL] ${p.url}: ${langData.error}`);
          failures++;
          continue;
        }

        let hasCurrent = false;
        for (const link of langData) {
          if (link.isCurrent) hasCurrent = true;
          if (!link.visible) {
             console.error(`[FAIL] ${p.url}: ${link.text} is not visible`);
             failures++;
          }
          const bodyBgStr = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
          const ratio = getContrastRatio(link.color, link.bgColor, bodyBgStr);
          if (ratio < 4.5) {
             console.error(`[FAIL] ${p.url}: ${link.text} contrast ratio is ${ratio.toFixed(2)}, expected >= 4.5`);
             failures++;
          } else {
             console.log(`[PASS] ${p.url}: ${link.text} contrast ratio is ${ratio.toFixed(2)}:1 (OK)`);
          }
        }
        
        if (!hasCurrent) {
          console.error(`[FAIL] ${p.url}: Missing aria-current="page"`);
          failures++;
        }
      }
      await page.close();
    }

    // CPP Onload Tests
    console.log(`\nTesting CPP Onload Evaluation`);
    const cppPage = await browser.newPage();
    await cppPage.goto(`${BASE_URL}/en/calculators/cents-per-point/`);
    let result = await cppPage.$eval('#cppResult', el => el.textContent);
    if (result !== '3.00¢ / point') {
      console.error(`[FAIL] EN CPP Default Onload failed. Expected '3.00¢ / point', got '${result}'`);
      failures++;
    } else {
      console.log(`[PASS] EN CPP Default Onload is 3.00¢ / point`);
    }

    // URL Param Test
    await cppPage.goto(`${BASE_URL}/en/calculators/cents-per-point/?cashPrice=600&awardTaxes=50&pointsNeeded=15000`);
    result = await cppPage.$eval('#cppResult', el => el.textContent);
    if (!result.includes('3.67¢')) {
      console.error(`[FAIL] EN CPP URL Param failed. Expected approx 3.67¢, got '${result}'`);
      failures++;
    } else {
      console.log(`[PASS] EN CPP URL Param correctly parsed and calculated: ${result}`);
    }

    // Boundary Test
    await cppPage.goto(`${BASE_URL}/en/calculators/cents-per-point/?cashPrice=500&awardTaxes=50&pointsNeeded=0`);
    result = await cppPage.$eval('#cppResult', el => el.textContent);
    if (result !== '-') {
      console.error(`[FAIL] EN CPP Boundary (points=0) failed. Expected '-', got '${result}'`);
      failures++;
    } else {
      console.log(`[PASS] EN CPP Boundary correctly handles 0 points`);
    }
    
    // Check Canonical
    const canonical = await cppPage.$eval('link[rel="canonical"]', el => el.href);
    if (canonical.includes('?')) {
      console.error(`[FAIL] Canonical URL contains query parameters: ${canonical}`);
      failures++;
    } else {
      console.log(`[PASS] Canonical URL clean: ${canonical}`);
    }

    await cppPage.close();

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  } finally {
    await browser.close();
    server.close();
    process.exit(failures > 0 ? 1 : 0);
  }
}

runTests();
