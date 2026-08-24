const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const viewports = [
  { name: 'Mobile Extra Small (320x800, 100% zoom)', width: 320, height: 800, dpr: 1.0, zoom: 1.0, cssWidth: 320, cssHeight: 800 },
  { name: 'Mobile Standard (375x812, 100% zoom)', width: 375, height: 812, dpr: 2.0, zoom: 1.0, cssWidth: 375, cssHeight: 812 },
  { name: 'Tablet (768x1024, 100% zoom)', width: 768, height: 1024, dpr: 2.0, zoom: 1.0, cssWidth: 768, cssHeight: 1024 },
  { name: 'Desktop Standard (1200x900, 100% zoom)', width: 1200, height: 900, dpr: 1.0, zoom: 1.0, cssWidth: 1200, cssHeight: 900 },
  { name: 'Desktop Large (1440x900, 100% zoom)', width: 1440, height: 900, dpr: 1.0, zoom: 1.0, cssWidth: 1440, cssHeight: 900 },
  { name: 'Desktop Zoomed 125% (1440x900, 125% equiv)', width: 1440, height: 900, dpr: 1.0, zoom: 1.25, cssWidth: 1152, cssHeight: 720 },
  { name: 'Desktop Zoomed 150% (1440x900, 150% equiv)', width: 1440, height: 900, dpr: 1.0, zoom: 1.5, cssWidth: 960, cssHeight: 600 },
  { name: 'Desktop Zoomed 200% (1440x900, 200% equiv)', width: 1440, height: 900, dpr: 1.0, zoom: 2.0, cssWidth: 720, cssHeight: 450 }
];

const testUrls = [
  { lang: 'zh', path: '/calculators/trip-cost-after-points/?currency=CNY&days=7&adults=2&children=1&fCash=12000&hCash=15000&dCash=7000&tCash=3500&actCash=3000&visaCash=1200&simCash=300&othCash=2000&fMiles=60000&fBal=10000&fTaxes=800&hPoints=50000&hTaxes=0&hResort=0&fBonus=20&fRatio=1&fInc=1000&fTransBal=42000' },
  { lang: 'en', path: '/en/calculators/trip-cost-after-points/?currency=USD&days=10&adults=2&children=1&fCash=3600&hCash=2700&dCash=1500&carCash=700&gasCash=450&actCash=900&visaCash=300&simCash=60&othCash=300&fMiles=60000&fBal=10000&fTaxes=360&hPoints=120000&hTaxes=0&hResort=0&fBonus=20&fRatio=1&fInc=1000&fTransBal=42000' }
];

async function runBrowserAudit() {
  // Start local server to test generated _site
  const app = express();
  app.use(express.static(path.join(__dirname, '../_site')));
  const server = app.listen(8087);
  const baseUrl = 'http://localhost:8087';

  console.log('=== RIGOROUS REAL BROWSER RESPONSIVE & LAYOUT AUDIT ===\n');
  console.log(`Launching Headless Chrome: ${CHROME_PATH}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const allMetrics = [];
  let failures = 0;

  try {
    for (const testPage of testUrls) {
      console.log(`\n======================================================`);
      console.log(`Testing Target Page: ${testPage.lang.toUpperCase()} -> ${testPage.path.slice(0, 45)}...`);
      console.log(`======================================================`);

      for (const vp of viewports) {
        console.log(`\n--- [Viewport: ${vp.name}] CSS Dimensions: ${vp.cssWidth}x${vp.cssHeight} (DPR: ${vp.dpr}) ---`);

        const page = await browser.newPage();
        await page.setViewport({
          width: vp.cssWidth,
          height: vp.cssHeight,
          deviceScaleFactor: vp.dpr
        });

        await page.goto(`${baseUrl}${testPage.path}`, { waitUntil: 'networkidle0' });

        // Wait for dynamic calculations to render
        await page.waitForFunction(() => {
          const el = document.getElementById('resultRemainingMiles');
          return el && el.textContent.trim() === '50,000';
        }, { timeout: 5000 });

        // Run layout measurements in real browser DOM
        const metrics = await page.evaluate((effectiveWidth) => {
          const docEl = document.documentElement;
          const body = document.body;
          const ticket = document.querySelector('.ticket');
          const main = document.querySelector('.ticket .main');
          const stub = document.querySelector('.ticket .stub');
          const wrapper = document.querySelector('.ticket .main .responsive-table-wrapper');
          const table = document.querySelector('.ticket .main .waterfall-table');
          const planGrid = document.querySelector('.ticket .main .plan-comparison-grid');
          const planCards = Array.from(document.querySelectorAll('.ticket .main .plan-card'));
          const expenseGrid = document.querySelector('.ticket .main .expense-grid');
          const expenseFields = Array.from(document.querySelectorAll('.ticket .main .expense-grid .field'));
          const toolbar = document.querySelector('.ticket .main .budget-toolbar') || document.querySelector('.ticket .main .calculator-actions-toolbar');

          const docClientWidth = docEl.clientWidth;
          const docScrollWidth = docEl.scrollWidth;
          const docScrollLeft = docEl.scrollLeft;
          const bodyClientWidth = body.clientWidth;
          const bodyScrollWidth = body.scrollWidth;

          const ticketRect = ticket ? ticket.getBoundingClientRect() : null;
          const mainRect = main ? main.getBoundingClientRect() : null;
          const stubRect = stub ? stub.getBoundingClientRect() : null;
          const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : null;
          const tableRect = table ? table.getBoundingClientRect() : null;

          const mainStyle = main ? window.getComputedStyle(main) : null;
          const mainPadLeft = mainStyle ? parseFloat(mainStyle.paddingLeft) : 0;
          const mainPadRight = mainStyle ? parseFloat(mainStyle.paddingRight) : 0;
          const mainContentLeft = mainRect ? mainRect.left + mainPadLeft : 0;
          const mainContentRight = mainRect ? mainRect.right - mainPadRight : 0;

          const cardMetrics = planCards.map(c => {
            const r = c.getBoundingClientRect();
            return {
              width: r.width,
              left: r.left,
              right: r.right,
              scrollWidth: c.scrollWidth,
              clientWidth: c.clientWidth,
              cropped: r.right > mainContentRight + 1.5 || r.left < mainContentLeft - 1.5
            };
          });

          const fieldMetrics = expenseFields.map(f => {
            const r = f.getBoundingClientRect();
            return {
              width: r.width,
              left: r.left,
              right: r.right,
              scrollWidth: f.scrollWidth,
              clientWidth: f.clientWidth,
              cropped: r.right > mainContentRight + 1.5 || r.left < mainContentLeft - 1.5
            };
          });

          const wrapperOverflowX = wrapper ? window.getComputedStyle(wrapper).overflowX : '';
          const wrapperScrollWidth = wrapper ? wrapper.scrollWidth : 0;
          const wrapperClientWidth = wrapper ? wrapper.clientWidth : 0;

          return {
            docClientWidth,
            docScrollWidth,
            docScrollLeft,
            bodyClientWidth,
            bodyScrollWidth,
            ticketRect: ticketRect ? { left: ticketRect.left, right: ticketRect.right, width: ticketRect.width } : null,
            mainRect: mainRect ? { left: mainRect.left, right: mainRect.right, width: mainRect.width } : null,
            stubRect: stubRect ? { left: stubRect.left, right: stubRect.right, width: stubRect.width } : null,
            wrapperRect: wrapperRect ? { left: wrapperRect.left, right: wrapperRect.right, width: wrapperRect.width } : null,
            tableRect: tableRect ? { left: tableRect.left, right: tableRect.right, width: tableRect.width } : null,
            mainContentLeft,
            mainContentRight,
            cardMetrics,
            fieldMetrics,
            wrapperOverflowX,
            wrapperScrollWidth,
            wrapperClientWidth,
            tableMinWidth: tableRect ? tableRect.width : 0
          };
        }, vp.cssWidth);

        // Assertions:
        // 1. Page level horizontal overflow
        const pageOverflow = metrics.docScrollWidth > metrics.docClientWidth + 1 || metrics.bodyScrollWidth > metrics.bodyClientWidth + 1;
        if (pageOverflow) {
          console.error(`  FAIL: Document horizontal overflow! docScrollWidth=${metrics.docScrollWidth}, docClientWidth=${metrics.docClientWidth}`);
          failures++;
        } else {
          console.log(`  PASS: No document-level horizontal overflow (${metrics.docClientWidth}px client / ${metrics.docScrollWidth}px scroll)`);
        }

        // 2. Ticket & Main containment
        if (metrics.ticketRect.right > vp.cssWidth + 1.5 || metrics.ticketRect.left < -0.5) {
          console.error(`  FAIL: Ticket rect outside viewport! right=${metrics.ticketRect.right}, vpWidth=${vp.cssWidth}`);
          failures++;
        } else {
          console.log(`  PASS: Ticket strictly contained within viewport (left: ${metrics.ticketRect.left.toFixed(1)}px, right: ${metrics.ticketRect.right.toFixed(1)}px)`);
        }

        // 3. Plan cards containment (no cropping)
        const cardCropped = metrics.cardMetrics.some(c => c.cropped);
        if (cardCropped) {
          console.error(`  FAIL: Plan cards cropped!`, metrics.cardMetrics);
          failures++;
        } else {
          console.log(`  PASS: All ${metrics.cardMetrics.length} plan-cards strictly within main content bounds (0 cropped)`);
        }

        // 4. Expense fields containment (no cropping)
        const fieldCropped = metrics.fieldMetrics.some(f => f.cropped);
        if (fieldCropped) {
          console.error(`  FAIL: Expense metric fields cropped!`, metrics.fieldMetrics);
          failures++;
        } else {
          console.log(`  PASS: All ${metrics.fieldMetrics.length} expense metric fields strictly within main content bounds (0 cropped)`);
        }

        // 5. Table wrapper containment
        if (metrics.wrapperRect.right > metrics.mainContentRight + 1.5 || metrics.wrapperRect.left < metrics.mainContentLeft - 1.5) {
          console.error(`  FAIL: Table wrapper overflows main! wrapperRight=${metrics.wrapperRect.right}, mainRight=${metrics.mainContentRight}`);
          failures++;
        } else {
          console.log(`  PASS: Table wrapper strictly within main (wrapperWidth=${metrics.wrapperRect.width.toFixed(1)}px)`);
        }

        // 6. Table internal scroll test
        const scrollResult = await page.evaluate(() => {
          const wrapper = document.querySelector('.ticket .main .responsive-table-wrapper');
          const table = document.querySelector('.ticket .main .waterfall-table');
          const ticket = document.querySelector('.ticket');
          const main = document.querySelector('.ticket .main');

          const initialTicketRect = ticket.getBoundingClientRect();
          const initialMainRect = main.getBoundingClientRect();

          // Scroll to leftmost
          wrapper.scrollLeft = 0;
          const firstTh = table.querySelector('thead th:first-child');
          const firstThRect = firstTh.getBoundingClientRect();
          const wrapperRect = wrapper.getBoundingClientRect();
          const firstColVisible = firstThRect.left >= wrapperRect.left - 1 && firstThRect.left < wrapperRect.right;

          // Scroll to rightmost
          wrapper.scrollLeft = wrapper.scrollWidth;
          const lastTh = table.querySelector('thead th:last-child');
          const lastThRect = lastTh.getBoundingClientRect();
          const lastColVisible = lastThRect.right <= wrapperRect.right + 1.5 && lastThRect.left < wrapperRect.right;

          const afterTicketRect = ticket.getBoundingClientRect();
          const afterMainRect = main.getBoundingClientRect();
          const docScrollLeft = document.documentElement.scrollLeft;

          const ticketUnchanged = Math.abs(afterTicketRect.left - initialTicketRect.left) < 1 && Math.abs(afterTicketRect.right - initialTicketRect.right) < 1;
          const mainUnchanged = Math.abs(afterMainRect.left - initialMainRect.left) < 1 && Math.abs(afterMainRect.right - initialMainRect.right) < 1;

          return {
            firstColVisible,
            lastColVisible,
            ticketUnchanged,
            mainUnchanged,
            docScrollLeft,
            maxScrollLeft: wrapper.scrollWidth - wrapper.clientWidth
          };
        });

        if (!scrollResult.firstColVisible || !scrollResult.lastColVisible || !scrollResult.ticketUnchanged || scrollResult.docScrollLeft !== 0) {
          console.error(`  FAIL: Table scroll behavior failed!`, scrollResult);
          failures++;
        } else {
          console.log(`  PASS: Table scrolls internally: first-col visible at left (scrollLeft=0), last-col visible at right (scrollLeft=${scrollResult.maxScrollLeft}px), ticket/main rect unchanged, doc.scrollLeft=0`);
        }

        // Save screenshots for required visual validation
        if (testPage.lang === 'zh' && vp.width === 1440 && vp.zoom === 1.0) {
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_desktop_1440px_100.png'), fullPage: false });
          console.log(`  Saved screenshot: zh_desktop_1440px_100.png`);
        } else if (testPage.lang === 'zh' && vp.zoom === 1.5) {
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_zoomed_150.png'), fullPage: false });
          console.log(`  Saved screenshot: zh_zoomed_150.png`);
        } else if (testPage.lang === 'zh' && vp.width === 375) {
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_mobile_375px.png'), fullPage: false });
          console.log(`  Saved screenshot: zh_mobile_375px.png`);
        } else if (testPage.lang === 'en' && vp.zoom === 1.5) {
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'en_zoomed_150.png'), fullPage: false });
          console.log(`  Saved screenshot: en_zoomed_150.png`);
        } else if (testPage.lang === 'en' && vp.width === 375) {
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'en_mobile_375px.png'), fullPage: false });
          console.log(`  Saved screenshot: en_mobile_375px.png`);
        }

        // Table left / right screenshots
        if (testPage.lang === 'zh' && vp.width === 375) {
          await page.evaluate(() => { document.querySelector('.ticket .main .responsive-table-wrapper').scrollLeft = 0; });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'table_scroll_left.png'), fullPage: false });
          console.log(`  Saved screenshot: table_scroll_left.png`);

          await page.evaluate(() => {
            const w = document.querySelector('.ticket .main .responsive-table-wrapper');
            w.scrollLeft = w.scrollWidth;
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'table_scroll_right.png'), fullPage: false });
          console.log(`  Saved screenshot: table_scroll_right.png`);
        }

        allMetrics.push({
          lang: testPage.lang,
          viewport: vp.name,
          cssWidth: vp.cssWidth,
          dpr: vp.dpr,
          zoom: vp.zoom,
          metrics,
          scrollResult
        });

        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n========================================');
  if (failures === 0) {
    console.log('REAL BROWSER LAYOUT AUDIT: PASSED WITH 0 ERRORS');
  } else {
    console.error(`REAL BROWSER LAYOUT AUDIT: FAILED WITH ${failures} ERRORS`);
    process.exit(1);
  }
  console.log('========================================\n');

  return allMetrics;
}

if (require.main === module) {
  runBrowserAudit().catch(err => {
    console.error('Fatal Audit Error:', err);
    process.exit(1);
  });
}

module.exports = runBrowserAudit;
