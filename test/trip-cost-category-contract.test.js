const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const core = require('../src/assets/calculator-core.js');

const EXPECTED_CATEGORY_IDS = [
  'flights',
  'hotel',
  'dining',
  'transit',
  'carRental',
  'parkingTolls',
  'activities',
  'visaInsurance',
  'connectivity',
  'other'
];

test('Phase 9.4.6: Trip Cost Category Definition & Data Integrity Gatekeeper', async (t) => {
  const zhHtml = fs.readFileSync(path.join(__dirname, '../_site/calculators/trip-cost-after-points/index.html'), 'utf8');
  const enHtml = fs.readFileSync(path.join(__dirname, '../_site/en/calculators/trip-cost-after-points/index.html'), 'utf8');

  // Helper to load DOM with custom URL parameters and execute scripts
  async function loadPageWithParams(html, url) {
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url,
      beforeParse(window) {
        window.CalculatorCore = core;
      }
    });
    // Wait for JS execution
    await new Promise(r => setTimeout(r, 100));
    return dom;
  }

  await t.test('1. Scenario A: All 10 Categories Non-Zero (Full 10 Items + 1 Total)', async () => {
    const all10Params = 'currency=CNY&days=7&adults=2&children=1&fCash=100&hCash=100&dCash=100&tCash=100&carCash=100&gasCash=100&actCash=100&visaCash=100&simCash=100&othCash=100&fMiles=0&fBal=0&fTaxes=0&hPoints=0&hTaxes=0&hResort=0';
    const zhUrl = `https://points-miles-calculator.pages.dev/calculators/trip-cost-after-points/?${all10Params}`;
    const enUrl = `https://points-miles-calculator.pages.dev/en/calculators/trip-cost-after-points/?${all10Params.replace('currency=CNY', 'currency=USD')}`;

    const zhDom = await loadPageWithParams(zhHtml, zhUrl);
    const enDom = await loadPageWithParams(enHtml, enUrl);

    // Assert ZH DOM counts
    const zhTbodyRows = Array.from(zhDom.window.document.querySelectorAll('#waterfallBody tr.waterfall-row'));
    const zhTfootRow = zhDom.window.document.querySelector('#waterfallFoot tr.waterfall-row-total');
    const zhCards = Array.from(zhDom.window.document.querySelectorAll('#waterfallCardsList article.waterfall-mobile-card'));
    const zhTotalCard = zhDom.window.document.querySelector('#waterfallCardsTotal article.waterfall-mobile-card-total');

    assert.strictEqual(zhTbodyRows.length, 10, 'ZH table tbody must contain exactly 10 category rows');
    assert.ok(zhTfootRow, 'ZH table tfoot must contain 1 total row');
    assert.strictEqual(zhCards.length, 10, 'ZH mobile cards list must contain exactly 10 category cards');
    assert.ok(zhTotalCard, 'ZH mobile cards total must exist');

    // Assert EN DOM counts
    const enTbodyRows = Array.from(enDom.window.document.querySelectorAll('#waterfallBody tr.waterfall-row'));
    const enTfootRow = enDom.window.document.querySelector('#waterfallFoot tr.waterfall-row-total');
    const enCards = Array.from(enDom.window.document.querySelectorAll('#waterfallCardsList article.waterfall-mobile-card'));
    const enTotalCard = enDom.window.document.querySelector('#waterfallCardsTotal article.waterfall-mobile-card-total');

    assert.strictEqual(enTbodyRows.length, 10, 'EN table tbody must contain exactly 10 category rows');
    assert.ok(enTfootRow, 'EN table tfoot must contain 1 total row');
    assert.strictEqual(enCards.length, 10, 'EN mobile cards list must contain exactly 10 category cards');
    assert.ok(enTotalCard, 'EN mobile cards total must exist');

    // Assert Category IDs sequence
    const zhTableIds = zhTbodyRows.map(r => r.getAttribute('data-category-id'));
    const enTableIds = enTbodyRows.map(r => r.getAttribute('data-category-id'));
    const zhCardIds = zhCards.map(c => c.getAttribute('data-category-id'));
    const enCardIds = enCards.map(c => c.getAttribute('data-category-id'));

    assert.deepStrictEqual(zhTableIds, EXPECTED_CATEGORY_IDS, 'ZH Table category IDs order must match specification');
    assert.deepStrictEqual(enTableIds, EXPECTED_CATEGORY_IDS, 'EN Table category IDs order must match specification');
    assert.deepStrictEqual(zhCardIds, EXPECTED_CATEGORY_IDS, 'ZH Cards category IDs order must match specification');
    assert.deepStrictEqual(enCardIds, EXPECTED_CATEGORY_IDS, 'EN Cards category IDs order must match specification');

    // Assert Data Consistency for all 10 items
    zhTbodyRows.forEach((tr, idx) => {
      const card = zhCards[idx];
      const catId = tr.getAttribute('data-category-id');
      assert.strictEqual(card.getAttribute('data-category-id'), catId, `Card ${idx} ID must match table row ID`);
      assert.strictEqual(tr.getAttribute('data-row-type'), 'category');
      assert.strictEqual(card.getAttribute('data-row-type'), 'category');
    });

    // Total Calculation Verification (Sum 10 * 100 = 1,000)
    assert.strictEqual(zhDom.window.document.getElementById('cardOriginalPrice')?.textContent?.trim(), '¥1,000');
    assert.strictEqual(enDom.window.document.getElementById('cardOriginalPrice')?.textContent?.trim(), '$1,000');
  });

  await t.test('2. Scenario B: 8 Non-Zero Categories (carRental & parkingTolls = 0)', async () => {
    const mixed8Params = 'currency=CNY&days=7&adults=2&children=1&fCash=100&hCash=100&dCash=100&tCash=100&carCash=0&gasCash=0&actCash=100&visaCash=100&simCash=100&othCash=100&fMiles=0&fBal=0&fTaxes=0&hPoints=0&hTaxes=0&hResort=0';
    const zhUrl = `https://points-miles-calculator.pages.dev/calculators/trip-cost-after-points/?${mixed8Params}`;
    const enUrl = `https://points-miles-calculator.pages.dev/en/calculators/trip-cost-after-points/?${mixed8Params.replace('currency=CNY', 'currency=USD')}`;

    const zhDom = await loadPageWithParams(zhHtml, zhUrl);
    const enDom = await loadPageWithParams(enHtml, enUrl);

    const zhTbodyRows = Array.from(zhDom.window.document.querySelectorAll('#waterfallBody tr.waterfall-row'));
    const enTbodyRows = Array.from(enDom.window.document.querySelectorAll('#waterfallBody tr.waterfall-row'));
    const zhCards = Array.from(zhDom.window.document.querySelectorAll('#waterfallCardsList article.waterfall-mobile-card'));
    const enCards = Array.from(enDom.window.document.querySelectorAll('#waterfallCardsList article.waterfall-mobile-card'));

    assert.strictEqual(zhTbodyRows.length, 8, 'ZH must render exactly 8 category rows when 2 are zero');
    assert.strictEqual(enTbodyRows.length, 8, 'EN must render exactly 8 category rows when 2 are zero');
    assert.strictEqual(zhCards.length, 8, 'ZH must render exactly 8 category cards when 2 are zero');
    assert.strictEqual(enCards.length, 8, 'EN must render taxes 8 category cards when 2 are zero');

    const expected8Ids = EXPECTED_CATEGORY_IDS.filter(id => id !== 'carRental' && id !== 'parkingTolls');
    assert.deepStrictEqual(zhTbodyRows.map(r => r.getAttribute('data-category-id')), expected8Ids);
    assert.deepStrictEqual(enTbodyRows.map(r => r.getAttribute('data-category-id')), expected8Ids);
    assert.deepStrictEqual(zhCards.map(c => c.getAttribute('data-category-id')), expected8Ids);
    assert.deepStrictEqual(enCards.map(c => c.getAttribute('data-category-id')), expected8Ids);

    // Sum is 800
    assert.strictEqual(zhDom.window.document.getElementById('cardOriginalPrice')?.textContent?.trim(), '¥800');
    assert.strictEqual(enDom.window.document.getElementById('cardOriginalPrice')?.textContent?.trim(), '$800');
  });

  await t.test('3. Scenario C: 9 Non-Zero Categories (parkingTolls = 0, carRental = 100)', async () => {
    const mixed9Params = 'currency=CNY&days=7&adults=2&children=1&fCash=100&hCash=100&dCash=100&tCash=100&carCash=100&gasCash=0&actCash=100&visaCash=100&simCash=100&othCash=100&fMiles=0&fBal=0&fTaxes=0&hPoints=0&hTaxes=0&hResort=0';
    const zhUrl = `https://points-miles-calculator.pages.dev/calculators/trip-cost-after-points/?${mixed9Params}`;
    const enUrl = `https://points-miles-calculator.pages.dev/en/calculators/trip-cost-after-points/?${mixed9Params.replace('currency=CNY', 'currency=USD')}`;

    const zhDom = await loadPageWithParams(zhHtml, zhUrl);
    const enDom = await loadPageWithParams(enHtml, enUrl);

    const zhTbodyRows = Array.from(zhDom.window.document.querySelectorAll('#waterfallBody tr.waterfall-row'));
    const enTbodyRows = Array.from(enDom.window.document.querySelectorAll('#waterfallBody tr.waterfall-row'));

    assert.strictEqual(zhTbodyRows.length, 9, 'ZH must render exactly 9 category rows');
    assert.strictEqual(enTbodyRows.length, 9, 'EN must render exactly 9 category rows');

    const expected9Ids = EXPECTED_CATEGORY_IDS.filter(id => id !== 'parkingTolls');
    assert.deepStrictEqual(zhTbodyRows.map(r => r.getAttribute('data-category-id')), expected9Ids);
    assert.deepStrictEqual(enTbodyRows.map(r => r.getAttribute('data-category-id')), expected9Ids);
  });

  await t.test('4. Scenario D: Zero Cash Baseline with Award Taxes / Resort Fees Display Test', async () => {
    // expFlights = 0, but fMiles = 60,000, fTaxes = 150 -> flights MUST display
    // expHotel = 0, but hPoints = 50,000, hResort = 200 -> hotel MUST display
    // All other 8 items = 0
    const zeroCashAwardFeeParams = 'currency=CNY&days=5&adults=2&children=0&fCash=0&hCash=0&dCash=0&tCash=0&carCash=0&gasCash=0&actCash=0&visaCash=0&simCash=0&othCash=0&fMiles=60000&fBal=60000&fTaxes=150&hPoints=50000&hTaxes=0&hResort=200';
    const zhUrl = `https://points-miles-calculator.pages.dev/calculators/trip-cost-after-points/?${zeroCashAwardFeeParams}`;
    const enUrl = `https://points-miles-calculator.pages.dev/en/calculators/trip-cost-after-points/?${zeroCashAwardFeeParams.replace('currency=CNY', 'currency=USD')}`;

    const zhDom = await loadPageWithParams(zhHtml, zhUrl);
    const enDom = await loadPageWithParams(enHtml, enUrl);

    const zhTbodyRows = Array.from(zhDom.window.document.querySelectorAll('#waterfallBody tr.waterfall-row'));
    const enTbodyRows = Array.from(enDom.window.document.querySelectorAll('#waterfallBody tr.waterfall-row'));
    const zhCards = Array.from(zhDom.window.document.querySelectorAll('#waterfallCardsList article.waterfall-mobile-card'));
    const enCards = Array.from(enDom.window.document.querySelectorAll('#waterfallCardsList article.waterfall-mobile-card'));

    assert.strictEqual(zhTbodyRows.length, 2, 'ZH table must display 2 categories (flights and hotel) despite cash=0');
    assert.strictEqual(enTbodyRows.length, 2, 'EN table must display 2 categories (flights and hotel) despite cash=0');
    assert.strictEqual(zhCards.length, 2, 'ZH cards must display 2 categories');
    assert.strictEqual(enCards.length, 2, 'EN cards must display 2 categories');

    const expectedIds = ['flights', 'hotel'];
    assert.deepStrictEqual(zhTbodyRows.map(r => r.getAttribute('data-category-id')), expectedIds);
    assert.deepStrictEqual(enTbodyRows.map(r => r.getAttribute('data-category-id')), expectedIds);
    assert.deepStrictEqual(zhCards.map(c => c.getAttribute('data-category-id')), expectedIds);
    assert.deepStrictEqual(enCards.map(c => c.getAttribute('data-category-id')), expectedIds);
  });
});
