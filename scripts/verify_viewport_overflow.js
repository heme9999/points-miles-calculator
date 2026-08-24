const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
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
  const app = express();
  app.use(express.static(path.join(__dirname, '../_site')));
  const server = app.listen(8087);
  const baseUrl = 'http://localhost:8087';

  console.log('=== RIGOROUS REAL BROWSER RESPONSIVE & LAYOUT AUDIT (Phase 9.4.6) ===\n');
  console.log(`Launching Headless Chrome: ${CHROME_PATH}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const allMetrics = [];
  let failures = 0;

  try {
    // 1. Multi-viewport responsive tests
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

        await page.waitForFunction(() => {
          const el = document.getElementById('resultRemainingMiles');
          return el && el.textContent.trim() === '50,000';
        }, { timeout: 5000 });

        const metrics = await page.evaluate((vpWidth, lang) => {
          const docEl = document.documentElement;
          const ticket = document.querySelector('.ticket.trip-cost-ticket') || document.querySelector('.ticket');
          const fullSection = document.querySelector('.ticket-full-width-section');
          const desktopView = document.querySelector('.waterfall-desktop-view');
          const mobileView = document.querySelector('.waterfall-mobile-view');
          const table = document.querySelector('.waterfall-table');
          const tbodyRows = Array.from(document.querySelectorAll('#waterfallBody tr.waterfall-row'));
          const tfootRow = document.querySelector('#waterfallFoot tr.waterfall-row-total, .waterfall-table tfoot tr.waterfall-row-total');
          const mobileCards = Array.from(document.querySelectorAll('#waterfallCardsList .waterfall-mobile-card'));
          const totalCard = document.querySelector('#waterfallCardsTotal .waterfall-mobile-card-total');
          const toolbar = document.querySelector('.calculator-actions-toolbar');
          const actionButtons = Array.from(document.querySelectorAll('.calculator-actions-toolbar .btn-action'));

          const docClientWidth = docEl.clientWidth;
          const docScrollWidth = docEl.scrollWidth;

          const ticketRect = ticket ? ticket.getBoundingClientRect() : null;
          const fullSectionRect = fullSection ? fullSection.getBoundingClientRect() : null;
          const tableRect = table ? table.getBoundingClientRect() : null;

          const desktopComputed = desktopView ? window.getComputedStyle(desktopView).display : 'none';
          const mobileComputed = mobileView ? window.getComputedStyle(mobileView).display : 'none';

          const cardDetails = mobileCards.map(c => {
            const r = c.getBoundingClientRect();
            const title = c.querySelector('h3')?.textContent?.trim() || '';
            const categoryId = c.getAttribute('data-category-id') || '';
            const rowType = c.getAttribute('data-row-type') || '';
            const dtList = Array.from(c.querySelectorAll('dt')).map(d => d.textContent.trim());
            const ddList = Array.from(c.querySelectorAll('dd')).map(d => d.textContent.trim());
            return {
              title,
              categoryId,
              rowType,
              dtList,
              ddList,
              rect: { left: r.left, right: r.right, width: r.width },
              cropped: r.right > (fullSectionRect ? fullSectionRect.right + 1.5 : vpWidth + 1.5) || r.left < -0.5
            };
          });

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

          const tableRowsData = tbodyRows.map(row => {
            const name = row.querySelector('th')?.textContent?.trim() || '';
            const categoryId = row.getAttribute('data-category-id') || '';
            const rowType = row.getAttribute('data-row-type') || '';
            const tds = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
            return { name, categoryId, rowType, baseline: tds[0], deduction: tds[1], taxes: tds[2], final: tds[3] };
          });

          const cardData = mobileCards.map(c => {
            const name = c.querySelector('h3')?.textContent?.trim() || '';
            const categoryId = c.getAttribute('data-category-id') || '';
            const rowType = c.getAttribute('data-row-type') || '';
            const dds = Array.from(c.querySelectorAll('dd')).map(d => d.textContent.trim());
            return { name, categoryId, rowType, baseline: dds[0], deduction: dds[1], taxes: dds[2], final: dds[3] };
          });

          const dataConsistent = tableRowsData.length === cardData.length && tableRowsData.every((tr, idx) => {
            const cd = cardData[idx];
            return tr.name === cd.name && tr.categoryId === cd.categoryId && tr.rowType === cd.rowType && tr.baseline === cd.baseline && tr.deduction === cd.deduction && tr.taxes === cd.taxes && tr.final === cd.final;
          });

          return {
            docClientWidth,
            docScrollWidth,
            ticketRect: ticketRect ? { left: ticketRect.left, right: ticketRect.right, width: ticketRect.width } : null,
            tableRect: tableRect ? { left: tableRect.left, right: tableRect.right, width: tableRect.width } : null,
            desktopDisplay: desktopComputed,
            mobileDisplay: mobileComputed,
            tbodyRowCount: tbodyRows.length,
            hasTfootRow: !!tfootRow,
            mobileCardCount: mobileCards.length,
            hasTotalCard: !!totalCard,
            cardDetails,
            thRects,
            btnMetrics,
            dataConsistent,
            categoryIds: tableRowsData.map(r => r.categoryId)
          };
        }, vp.cssWidth, testPage.lang);

        // Assertions:
        if (metrics.docScrollWidth > metrics.docClientWidth + 1) {
          console.error(`  FAIL: Document horizontal overflow! docScrollWidth=${metrics.docScrollWidth}, docClientWidth=${metrics.docClientWidth}`);
          failures++;
        } else {
          console.log(`  PASS: No document-level horizontal overflow (${metrics.docClientWidth}px client / ${metrics.docScrollWidth}px scroll)`);
        }

        if (metrics.ticketRect.right > vp.cssWidth + 1.5 || metrics.ticketRect.left < -0.5) {
          console.error(`  FAIL: Ticket rect outside viewport! right=${metrics.ticketRect.right}, vpWidth=${vp.cssWidth}`);
          failures++;
        } else {
          console.log(`  PASS: Ticket strictly contained within viewport (width: ${metrics.ticketRect.width.toFixed(1)}px)`);
        }

        if (vp.cssWidth < 700) {
          if (metrics.desktopDisplay !== 'none' || metrics.mobileDisplay === 'none') {
            console.error(`  FAIL: View switching failed at ${vp.cssWidth}px`);
            failures++;
          } else {
            console.log(`  PASS: Mobile mode active (<700px): Table display=none, Cards display=${metrics.mobileDisplay}`);
          }
          if (metrics.mobileCardCount === 0 || !metrics.hasTotalCard) {
            console.error(`  FAIL: Missing cards (count=${metrics.mobileCardCount})`);
            failures++;
          } else {
            console.log(`  PASS: Rendered ${metrics.mobileCardCount} dynamic category cards + 1 total card`);
          }
        } else {
          if (metrics.desktopDisplay === 'none' || metrics.mobileDisplay !== 'none') {
            console.error(`  FAIL: Desktop table hidden at ${vp.cssWidth}px`);
            failures++;
          } else {
            console.log(`  PASS: Desktop mode active (>=700px): Table display=${metrics.desktopDisplay}, Cards display=none`);
          }
          if (!metrics.hasTfootRow) {
            console.error(`  FAIL: Table tfoot total row missing`);
            failures++;
          } else {
            console.log(`  PASS: Table has ${metrics.tbodyRowCount} tbody category rows + 1 tfoot total row`);
          }
        }

        if (!metrics.dataConsistent) {
          console.error(`  FAIL: Data mismatch between Desktop Table and Mobile Cards!`);
          failures++;
        } else {
          console.log(`  PASS: Desktop Table and Mobile Cards data 100% consistent across category IDs: [${metrics.categoryIds.join(', ')}]`);
        }

        // Save screenshots
        if (testPage.lang === 'zh' && vp.cssWidth === 375) {
          await page.evaluate(() => {
            const el = document.getElementById('waterfallCardsList');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_mobile_375px.png') });
        } else if (testPage.lang === 'en' && vp.cssWidth === 375) {
          await page.evaluate(() => {
            const el = document.getElementById('waterfallCardsList');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'en_mobile_375px.png') });
        } else if (testPage.lang === 'zh' && vp.cssWidth === 1200) {
          await page.evaluate(() => {
            const el = document.querySelector('.waterfall-table');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_desktop_1200px.png') });
        } else if (testPage.lang === 'en' && vp.cssWidth === 1200) {
          await page.evaluate(() => {
            const el = document.querySelector('.waterfall-table');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'en_desktop_1200px.png') });
        } else if (testPage.lang === 'zh' && vp.zoom === 2.0) {
          await page.evaluate(() => {
            const el = document.querySelector('.ticket.trip-cost-ticket');
            if (el) el.scrollIntoView();
          });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'zh_zoomed_200.png') });
        }

        await page.close();
      }
    }

    // 2. Scenario A Browser Test (All 10 Categories Non-Zero = 100 each)
    console.log(`\n======================================================`);
    console.log(`Running Scenario A Browser Test: All 10 Items = 100 (Total 1000)`);
    console.log(`======================================================`);
    const scenarioAPath = '/calculators/trip-cost-after-points/?currency=CNY&days=7&adults=2&children=1&fCash=100&hCash=100&dCash=100&tCash=100&carCash=100&gasCash=100&actCash=100&visaCash=100&simCash=100&othCash=100&fMiles=0&fBal=0&fTaxes=0&hPoints=0&hTaxes=0&hResort=0';
    const pageA = await browser.newPage();
    await pageA.setViewport({ width: 1200, height: 900 });
    await pageA.goto(`${baseUrl}${scenarioAPath}`, { waitUntil: 'networkidle0' });
    const countA = await pageA.evaluate(() => {
      const tbodyRows = document.querySelectorAll('#waterfallBody tr.waterfall-row');
      const cards = document.querySelectorAll('#waterfallCardsList article.waterfall-mobile-card');
      const totalText = document.getElementById('cardOriginalPrice')?.textContent?.trim();
      return { tbodyCount: tbodyRows.length, cardCount: cards.length, totalText };
    });
    if (countA.tbodyCount !== 10 || countA.cardCount !== 10 || countA.totalText !== '¥1,000') {
      console.error(`  FAIL Scenario A: Expected 10 tbody rows, 10 cards, total ¥1,000, got:`, countA);
      failures++;
    } else {
      console.log(`  PASS Scenario A: Exactly 10 tbody rows, 10 mobile cards, total ¥1,000 verified!`);
    }
    await pageA.close();

    // 3. Scenario B Browser Test (8 Non-Zero Items, carRental & parkingTolls = 0)
    console.log(`\n======================================================`);
    console.log(`Running Scenario B Browser Test: 8 Items = 100, 2 Items = 0 (Total 800)`);
    console.log(`======================================================`);
    const scenarioBPath = '/calculators/trip-cost-after-points/?currency=CNY&days=7&adults=2&children=1&fCash=100&hCash=100&dCash=100&tCash=100&carCash=0&gasCash=0&actCash=100&visaCash=100&simCash=100&othCash=100&fMiles=0&fBal=0&fTaxes=0&hPoints=0&hTaxes=0&hResort=0';
    const pageB = await browser.newPage();
    await pageB.setViewport({ width: 1200, height: 900 });
    await pageB.goto(`${baseUrl}${scenarioBPath}`, { waitUntil: 'networkidle0' });
    const countB = await pageB.evaluate(() => {
      const tbodyRows = document.querySelectorAll('#waterfallBody tr.waterfall-row');
      const cards = document.querySelectorAll('#waterfallCardsList article.waterfall-mobile-card');
      const totalText = document.getElementById('cardOriginalPrice')?.textContent?.trim();
      const ids = Array.from(tbodyRows).map(r => r.getAttribute('data-category-id'));
      return { tbodyCount: tbodyRows.length, cardCount: cards.length, totalText, ids };
    });
    if (countB.tbodyCount !== 8 || countB.cardCount !== 8 || countB.totalText !== '¥800' || countB.ids.includes('carRental') || countB.ids.includes('parkingTolls')) {
      console.error(`  FAIL Scenario B: Expected 8 tbody rows without carRental/parkingTolls, got:`, countB);
      failures++;
    } else {
      console.log(`  PASS Scenario B: Exactly 8 tbody rows, 8 mobile cards without zero categories, total ¥800 verified!`);
    }
    await pageB.close();

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
}

if (require.main === module) {
  runBrowserAudit().catch(err => {
    console.error('Fatal Audit Error:', err);
    process.exit(1);
  });
}

module.exports = runBrowserAudit;
