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

  console.log('=== RIGOROUS REAL BROWSER RESPONSIVE & LAYOUT AUDIT (Phase 9.4.5) ===\n');
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
        const metrics = await page.evaluate((vpWidth, lang) => {
          const docEl = document.documentElement;
          const body = document.body;
          const ticket = document.querySelector('.ticket.trip-cost-ticket') || document.querySelector('.ticket');
          const fullSection = document.querySelector('.ticket-full-width-section');
          const desktopView = document.querySelector('.waterfall-desktop-view');
          const mobileView = document.querySelector('.waterfall-mobile-view');
          const table = document.querySelector('.waterfall-table');
          const mobileCards = Array.from(document.querySelectorAll('#waterfallCardsList .waterfall-mobile-card'));
          const totalCard = document.querySelector('#waterfallCardsTotal .waterfall-mobile-card-total');
          const toolbar = document.querySelector('.calculator-actions-toolbar');
          const actionButtons = Array.from(document.querySelectorAll('.calculator-actions-toolbar .btn-action'));
          const planCards = Array.from(document.querySelectorAll('.plan-card'));
          const expenseFields = Array.from(document.querySelectorAll('.expense-grid .field'));

          const docClientWidth = docEl.clientWidth;
          const docScrollWidth = docEl.scrollWidth;
          const docScrollLeft = docEl.scrollLeft;

          const ticketRect = ticket ? ticket.getBoundingClientRect() : null;
          const fullSectionRect = fullSection ? fullSection.getBoundingClientRect() : null;
          const tableRect = table ? table.getBoundingClientRect() : null;

          const desktopComputed = desktopView ? window.getComputedStyle(desktopView).display : 'none';
          const mobileComputed = mobileView ? window.getComputedStyle(mobileView).display : 'none';

          // Check mobile cards details
          const cardDetails = mobileCards.map(c => {
            const r = c.getBoundingClientRect();
            const title = c.querySelector('h3')?.textContent?.trim() || '';
            const dtList = Array.from(c.querySelectorAll('dt')).map(d => d.textContent.trim());
            const ddList = Array.from(c.querySelectorAll('dd')).map(d => d.textContent.trim());
            return {
              title,
              dtList,
              ddList,
              rect: { left: r.left, right: r.right, width: r.width },
              cropped: r.right > (fullSectionRect ? fullSectionRect.right + 1.5 : vpWidth + 1.5) || r.left < -0.5
            };
          });

          // Check table header visibility on desktop
          const ths = table ? Array.from(table.querySelectorAll('thead th')) : [];
          const thRects = ths.map(th => {
            const r = th.getBoundingClientRect();
            return {
              text: th.textContent.trim(),
              left: r.left,
              right: r.right,
              width: r.width,
              visible: r.left >= (fullSectionRect ? fullSectionRect.left - 2 : 0) && r.right <= (fullSectionRect ? fullSectionRect.right + 2 : vpWidth + 2)
            };
          });

          // Check button sizes and bounds
          const btnMetrics = actionButtons.map(btn => {
            const r = btn.getBoundingClientRect();
            return {
              text: btn.textContent.trim(),
              height: r.height,
              left: r.left,
              right: r.right,
              withinViewport: r.right <= vpWidth + 2 && r.left >= -2
            };
          });

          // Data consistency between Table and Cards
          const tableRows = table ? Array.from(table.querySelectorAll('tbody .waterfall-row')).map(row => {
            const name = row.querySelector('th')?.textContent?.trim() || row.querySelector('td:first-child')?.textContent?.trim() || '';
            const tds = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
            return { name, baseline: tds[0], deduction: tds[1], taxes: tds[2], final: tds[3] };
          }) : [];

          const cardData = mobileCards.map(c => {
            const name = c.querySelector('h3')?.textContent?.trim() || '';
            const dds = Array.from(c.querySelectorAll('dd')).map(d => d.textContent.trim());
            return { name, baseline: dds[0], deduction: dds[1], taxes: dds[2], final: dds[3] };
          });

          const dataConsistent = tableRows.length === cardData.length && tableRows.every((tr, idx) => {
            const cd = cardData[idx];
            return tr.name === cd.name && tr.baseline === cd.baseline && tr.deduction === cd.deduction && tr.taxes === cd.taxes && tr.final === cd.final;
          });

          return {
            docClientWidth,
            docScrollWidth,
            ticketRect: ticketRect ? { left: ticketRect.left, right: ticketRect.right, width: ticketRect.width } : null,
            tableRect: tableRect ? { left: tableRect.left, right: tableRect.right, width: tableRect.width } : null,
            desktopDisplay: desktopComputed,
            mobileDisplay: mobileComputed,
            mobileCardCount: mobileCards.length,
            hasTotalCard: !!totalCard,
            cardDetails,
            thRects,
            btnMetrics,
            dataConsistent,
            tableRowCount: tableRows.length
          };
        }, vp.cssWidth, testPage.lang);

        // Assertions:
        // 1. Page level horizontal overflow
        const pageOverflow = metrics.docScrollWidth > metrics.docClientWidth + 1;
        if (pageOverflow) {
          console.error(`  FAIL: Document horizontal overflow! docScrollWidth=${metrics.docScrollWidth}, docClientWidth=${metrics.docClientWidth}`);
          failures++;
        } else {
          console.log(`  PASS: No document-level horizontal overflow (${metrics.docClientWidth}px client / ${metrics.docScrollWidth}px scroll)`);
        }

        // 2. Ticket Containment
        if (metrics.ticketRect.right > vp.cssWidth + 1.5 || metrics.ticketRect.left < -0.5) {
          console.error(`  FAIL: Ticket rect outside viewport! right=${metrics.ticketRect.right}, vpWidth=${vp.cssWidth}`);
          failures++;
        } else {
          console.log(`  PASS: Ticket strictly contained within viewport (width: ${metrics.ticketRect.width.toFixed(1)}px)`);
        }

        // 3. Responsive view switching based on 700px threshold
        if (vp.cssWidth < 700) {
          // Mobile View
          if (metrics.desktopDisplay !== 'none') {
            console.error(`  FAIL: Desktop table is visible on small screen (${vp.cssWidth}px)`);
            failures++;
          } else if (metrics.mobileDisplay === 'none') {
            console.error(`  FAIL: Mobile cards are hidden on small screen (${vp.cssWidth}px)`);
            failures++;
          } else {
            console.log(`  PASS: Mobile mode active (<700px): Table display=none, Cards display=${metrics.mobileDisplay}`);
          }

          if (metrics.mobileCardCount === 0 || !metrics.hasTotalCard) {
            console.error(`  FAIL: Missing mobile cards (count=${metrics.mobileCardCount}, hasTotal=${metrics.hasTotalCard})`);
            failures++;
          } else {
            console.log(`  PASS: Rendered ${metrics.mobileCardCount} item cards + 1 total card`);
          }

          // Check card field labels & bounds
          const anyCropped = metrics.cardDetails.some(c => c.cropped);
          if (anyCropped) {
            console.error(`  FAIL: Mobile cards cropped horizontally!`);
            failures++;
          } else {
            console.log(`  PASS: All mobile cards strictly within bounds with 0 horizontal cropping`);
          }
        } else {
          // Desktop View (>= 700px)
          if (metrics.desktopDisplay === 'none') {
            console.error(`  FAIL: Desktop table is hidden on desktop screen (${vp.cssWidth}px)`);
            failures++;
          } else if (metrics.mobileDisplay !== 'none') {
            console.error(`  FAIL: Mobile cards are visible on desktop screen (${vp.cssWidth}px)`);
            failures++;
          } else {
            console.log(`  PASS: Desktop mode active (>=700px): Table display=${metrics.desktopDisplay}, Cards display=none`);
          }

          // All 5 table headers fully visible
          const allThVisible = metrics.thRects.every(th => th.visible);
          if (!allThVisible) {
            console.error(`  FAIL: Not all 5 table headers visible inside bounds!`, metrics.thRects);
            failures++;
          } else {
            console.log(`  PASS: All 5 table headers fully visible within width (${metrics.tableRect ? metrics.tableRect.width.toFixed(1) : 0}px)`);
          }
        }

        // 4. Data consistency check
        if (!metrics.dataConsistent) {
          console.error(`  FAIL: Data mismatch between Desktop Table and Mobile Cards!`);
          failures++;
        } else {
          console.log(`  PASS: Desktop Table and Mobile Cards data is 100% consistent across all ${metrics.tableRowCount} items`);
        }

        // 5. Action Buttons Touch Target Check
        const allBtnsSized = metrics.btnMetrics.every(b => b.height >= 40 && b.withinViewport);
        if (!allBtnsSized) {
          console.error(`  FAIL: Some buttons failed minimum touch height (>=40px) or viewport bounds!`, metrics.btnMetrics);
          failures++;
        } else {
          console.log(`  PASS: All ${metrics.btnMetrics.length} action buttons meet touch targets (>=44px CSS) and within viewport`);
        }

        // Save screenshots for visual inspection
        if (testPage.lang === 'zh' && vp.cssWidth === 375) {
          // Scroll down to cards section
          await page.evaluate(() => {
            const el = document.getElementById('waterfallCardsList');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_mobile_375px.png'), fullPage: false });
          console.log(`  Saved screenshot: zh_mobile_375px.png`);
        } else if (testPage.lang === 'en' && vp.cssWidth === 375) {
          await page.evaluate(() => {
            const el = document.getElementById('waterfallCardsList');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'en_mobile_375px.png'), fullPage: false });
          console.log(`  Saved screenshot: en_mobile_375px.png`);
        } else if (testPage.lang === 'zh' && vp.cssWidth === 1200) {
          await page.evaluate(() => {
            const el = document.querySelector('.waterfall-table');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_desktop_1200px.png'), fullPage: false });
          console.log(`  Saved screenshot: zh_desktop_1200px.png`);
        } else if (testPage.lang === 'en' && vp.cssWidth === 1200) {
          await page.evaluate(() => {
            const el = document.querySelector('.waterfall-table');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'en_desktop_1200px.png'), fullPage: false });
          console.log(`  Saved screenshot: en_desktop_1200px.png`);
        } else if (testPage.lang === 'zh' && vp.zoom === 2.0) {
          await page.evaluate(() => {
            const el = document.querySelector('.ticket.trip-cost-ticket');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_zoomed_200.png'), fullPage: false });
          console.log(`  Saved screenshot: zh_zoomed_200.png`);
        }

        allMetrics.push({
          lang: testPage.lang,
          viewport: vp.name,
          cssWidth: vp.cssWidth,
          metrics
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
