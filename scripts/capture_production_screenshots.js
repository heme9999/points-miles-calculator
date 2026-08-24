const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');

async function capture() {
  const ts = Date.now();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // 1. Chinese 375px Mobile (cards + total)
    {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' });
      await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2.0 });
      const url = `https://points-miles-calculator.pages.dev/calculators/trip-cost-after-points/?currency=CNY&days=7&adults=2&children=1&fCash=12000&hCash=15000&dCash=7000&tCash=3500&actCash=3000&visaCash=1200&simCash=300&othCash=2000&fMiles=60000&fBal=10000&fTaxes=800&hPoints=50000&hTaxes=0&hResort=0&fBonus=20&fRatio=1&fInc=1000&fTransBal=42000&audit=${ts}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.getElementById('resultRemainingMiles')?.textContent === '50,000');
      await page.evaluate(() => {
        const el = document.getElementById('waterfallCardsList');
        if (el) el.scrollIntoView();
      });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_mobile_375px.png') });
      console.log('Saved zh_mobile_375px.png');
      await page.close();
    }

    // 2. English 375px Mobile (cards + total)
    {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' });
      await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2.0 });
      const url = `https://points-miles-calculator.pages.dev/en/calculators/trip-cost-after-points/?currency=USD&days=10&adults=2&children=1&fCash=3600&hCash=2700&dCash=1500&carCash=700&gasCash=450&actCash=900&visaCash=300&simCash=60&othCash=300&fMiles=60000&fBal=10000&fTaxes=360&hPoints=120000&hTaxes=0&hResort=0&fBonus=20&fRatio=1&fInc=1000&fTransBal=42000&audit=${ts}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.getElementById('resultRemainingMiles')?.textContent === '50,000');
      await page.evaluate(() => {
        const el = document.getElementById('waterfallCardsList');
        if (el) el.scrollIntoView();
      });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'en_mobile_375px.png') });
      console.log('Saved en_mobile_375px.png');
      await page.close();
    }

    // 3. Chinese 1200px Desktop (full 5-column table)
    {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' });
      await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1.0 });
      const url = `https://points-miles-calculator.pages.dev/calculators/trip-cost-after-points/?currency=CNY&days=7&adults=2&children=1&fCash=12000&hCash=15000&dCash=7000&tCash=3500&actCash=3000&visaCash=1200&simCash=300&othCash=2000&fMiles=60000&fBal=10000&fTaxes=800&hPoints=50000&hTaxes=0&hResort=0&fBonus=20&fRatio=1&fInc=1000&fTransBal=42000&audit=${ts}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.getElementById('resultRemainingMiles')?.textContent === '50,000');
      await page.evaluate(() => {
        const el = document.querySelector('.waterfall-table');
        if (el) el.scrollIntoView();
      });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_desktop_1200px.png') });
      console.log('Saved zh_desktop_1200px.png');
      await page.close();
    }

    // 4. English 1200px Desktop (full 5-column table)
    {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' });
      await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1.0 });
      const url = `https://points-miles-calculator.pages.dev/en/calculators/trip-cost-after-points/?currency=USD&days=10&adults=2&children=1&fCash=3600&hCash=2700&dCash=1500&carCash=700&gasCash=450&actCash=900&visaCash=300&simCash=60&othCash=300&fMiles=60000&fBal=10000&fTaxes=360&hPoints=120000&hTaxes=0&hResort=0&fBonus=20&fRatio=1&fInc=1000&fTransBal=42000&audit=${ts}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.getElementById('resultRemainingMiles')?.textContent === '50,000');
      await page.evaluate(() => {
        const el = document.querySelector('.waterfall-table');
        if (el) el.scrollIntoView();
      });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'en_desktop_1200px.png') });
      console.log('Saved en_desktop_1200px.png');
      await page.close();
    }

    // 5. Chinese 200% Zoom Desktop (720x450 equiv)
    {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' });
      await page.setViewport({ width: 720, height: 450, deviceScaleFactor: 1.0 });
      const url = `https://points-miles-calculator.pages.dev/calculators/trip-cost-after-points/?currency=CNY&days=7&adults=2&children=1&fCash=12000&hCash=15000&dCash=7000&tCash=3500&actCash=3000&visaCash=1200&simCash=300&othCash=2000&fMiles=60000&fBal=10000&fTaxes=800&hPoints=50000&hTaxes=0&hResort=0&fBonus=20&fRatio=1&fInc=1000&fTransBal=42000&audit=${ts}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.getElementById('resultRemainingMiles')?.textContent === '50,000');
      await page.evaluate(() => {
        const el = document.querySelector('.ticket.trip-cost-ticket');
        if (el) el.scrollIntoView();
      });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_zoomed_200.png') });
      console.log('Saved zh_zoomed_200.png');
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
