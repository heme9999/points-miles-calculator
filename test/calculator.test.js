const test = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

test('Points vs Cash Advanced Calculator Tests (ZH)', async (t) => {
  const htmlPath = path.resolve(__dirname, '../_site/calculators/points-vs-cash/index.html');
  if (!fs.existsSync(htmlPath)) {
    assert.fail(`HTML file not found at ${htmlPath}. Run 'npm run build' first.`);
  }
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Load into JSDOM
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const document = dom.window.document;
  const $ = (id) => document.getElementById(id);

  // Helper to trigger input event
  const input = (id, value) => {
    const el = $(id);
    if (!el) throw new Error(`Element ${id} not found`);
    el.value = value;
    el.dispatchEvent(new dom.window.Event('input'));
  };

  await t.test('1. Baseline correct scenario: 5000 / 40000 / 800 / 200 / 0% bonus', () => {
    input('cashPrice', '5000');
    input('pointsNeeded', '40000');
    input('awardTaxes', '800');
    input('forgoneValue', '200');
    input('transferBonus', '0');
    
    // Calculate expected CPP: (5000 - 800 - 200) / 40000 = 4000 / 40000 = 0.1
    assert.strictEqual($('cppResult').textContent, '¥0.1000 / 点');
  });

  await t.test('2. Include transfer bonus 20%', () => {
    input('transferBonus', '20');
    // Points used = 40000 / 1.2 = 33333.333
    // CPP = 4000 / 33333.333 = 0.1200
    assert.strictEqual($('cppResult').textContent, '¥0.1200 / 点');
  });

  await t.test('3. Points needed is 0 (State Clear)', () => {
    input('pointsNeeded', '0');
    assert.strictEqual($('cppResult').textContent, '-');
    assert.strictEqual($('verdictText').textContent, '—');
    assert.ok(!$('cppResult').classList.contains('win'), 'Should clear win class');
  });

  await t.test('4. Tax exceeds cash price', () => {
    input('pointsNeeded', '40000');
    input('awardTaxes', '6000');
    input('transferBonus', '0');
    assert.strictEqual($('verdictText').textContent, '不建议兑换');
    assert.strictEqual($('verdictCode').textContent, 'DIFF < 0');
  });
});

test('Points vs Cash Advanced Calculator Tests (EN)', async (t) => {
  const htmlPath = path.resolve(__dirname, '../_site/en/calculators/points-vs-cash/index.html');
  if (!fs.existsSync(htmlPath)) return;
  const html = fs.readFileSync(htmlPath, 'utf8');

  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const document = dom.window.document;
  const $ = (id) => document.getElementById(id);
  const input = (id, value) => {
    const el = $(id);
    if (!el) throw new Error(`Element ${id} not found`);
    el.value = value;
    el.dispatchEvent(new dom.window.Event('input'));
  };

  await t.test('1. EN Baseline correct scenario', () => {
    input('cashPrice', '500');
    input('pointsNeeded', '40000');
    input('awardTaxes', '50');
    input('forgoneValue', '20');
    input('transferBonus', '0');
    
    // (500 - 50 - 20) = 430
    // (430 / 40000) * 100 = 1.075 cents
    assert.strictEqual($('cppResult').textContent, '1.07¢ / point');
  });

  await t.test('2. EN Include transfer bonus 20%', () => {
    input('transferBonus', '20');
    // Points = 40000 / 1.2 = 33333.333
    // CPP = 430 / 33333.333 * 100 = 1.29
    assert.strictEqual($('cppResult').textContent, '1.29¢ / point');
  });
  
  await t.test('3. EN Language correctness', () => {
    input('pointsNeeded', '40000');
    input('awardTaxes', '6000'); // extreme tax
    assert.strictEqual($('verdictText').textContent, 'Pay Cash');
  });
});

test('Bilingual Structure & Hreflang Validation', async (t) => {
  const siteDir = path.resolve(__dirname, '../_site');
  const htmlPath = path.resolve(__dirname, '../_site/en/calculators/points-vs-cash/index.html');
  if (!fs.existsSync(htmlPath)) return;
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  await t.test('1. html lang attribute is correct', () => {
    assert.strictEqual(doc.documentElement.getAttribute('lang'), 'en');
  });

  await t.test('3. English pages have no Chinese template leakage', () => {
    const enIndex = fs.readFileSync(path.join(siteDir, 'en/index.html'), 'utf8');

    assert.strictEqual(enIndex.includes('首页'), false, 'Should not contain Chinese breadcrumbs');
    assert.strictEqual(enIndex.includes('undefined'), false, 'Should not contain undefined');
    assert.strictEqual(enIndex.includes('null'), false, 'Should not contain null');
    assert.strictEqual(enIndex.includes('\\n'), false, 'Should not contain literal \\n');
  });

  await t.test('4. Canonical URLs point to themselves', () => {
    const zhIndex = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8');
    const enIndex = fs.readFileSync(path.join(siteDir, 'en/index.html'), 'utf8');
    assert.match(zhIndex, /<link rel="canonical" href="[^"]+?\/">/);
    assert.match(enIndex, /<link rel="canonical" href="[^"]+?\/en\/">/);
  });

  await t.test('5. x-default points to English version', () => {
    const zhIndex = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8');
    assert.match(zhIndex, /<link rel="alternate" hreflang="x-default" href="[^"]+?\/en\/">/);
  });

  await t.test('2. Hreflang links are present', () => {
    const zh = doc.querySelector('link[hreflang="zh-CN"]');
    const en = doc.querySelector('link[hreflang="en"]');
    const xDefault = doc.querySelector('link[hreflang="x-default"]');
    assert.ok(zh, 'Missing zh-CN hreflang');
    assert.ok(en, 'Missing en hreflang');
    assert.ok(xDefault, 'Missing x-default hreflang');
    assert.ok(zh.href.includes('/calculators/points-vs-cash/'));
    assert.ok(en.href.includes('/en/calculators/points-vs-cash/'));
  });
});

test('Currency Preference & URL Params Parsing', async (t) => {
  const htmlPath = path.resolve(__dirname, '../_site/calculators/points-vs-cash/index.html');
  if (!fs.existsSync(htmlPath)) return;
  const html = fs.readFileSync(htmlPath, 'utf8');

  await t.test('1. ?currency=USD changes currency to USD for ZH page', () => {
    const dom = new JSDOM(html, { 
      url: 'http://localhost/calculators/points-vs-cash/?currency=USD&cash=300',
      runScripts: 'dangerously' 
    });
    const doc = dom.window.document;
    assert.strictEqual(doc.getElementById('currency').value, 'USD');
    assert.strictEqual(doc.getElementById('cashPrice').value, '300');
  });

  await t.test('2. ?currency=INVALID defaults back to CNY for ZH page', () => {
    const dom = new JSDOM(html, { 
      url: 'http://localhost/calculators/points-vs-cash/?currency=EU',
      runScripts: 'dangerously' 
    });
    const doc = dom.window.document;
    assert.strictEqual(doc.getElementById('currency').value, 'CNY');
  });

  await t.test('3. Negative parameters are ignored and defaults kept', () => {
    const dom = new JSDOM(html, { 
      url: 'http://localhost/calculators/points-vs-cash/?cash=-500&points=-10',
      runScripts: 'dangerously' 
    });
    const doc = dom.window.document;
    assert.notStrictEqual(doc.getElementById('cashPrice').value, '-500');
    assert.notStrictEqual(doc.getElementById('pointsNeeded').value, '-10');
  });
});

test('USD/CNY currency toggling does not cause numerical drift', async (t) => {
  const htmlPath = path.resolve(__dirname, '../_site/calculators/points-vs-cash/index.html');
  if (!fs.existsSync(htmlPath)) return;
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Load ZH page which defaults to CNY
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const document = dom.window.document;
  const $ = (id) => document.getElementById(id);
  const input = (id, value) => {
    const el = $(id);
    el.value = value;
    el.dispatchEvent(new dom.window.Event('input'));
  };

  await t.test('1. Initial CNY values set to 3500 cash, 0.105 valuation', () => {
    // Manually trigger the currency dropdown change to USD to test switching
    $('currency').value = 'USD';
    $('currency').dispatchEvent(new dom.window.Event('change'));
    
    input('cashPrice', '500');
    assert.strictEqual($('personalValuation').value, '1.50');
  });

  await t.test('2. Switch to CNY, values should convert with fx 7.0', () => {
    // Manually trigger the currency dropdown change
    $('currency').value = 'CNY';
    $('currency').dispatchEvent(new dom.window.Event('change'));
    
    // Cash should be 500 * 7.0 = 3500
    assert.strictEqual($('cashPrice').value, '3500');
    // Valuation should be (1.5 * 7) / 100 = 0.1050
    assert.strictEqual($('personalValuation').value, '0.1050');
  });

  await t.test('3. Switch back to USD, values should restore', () => {
    $('currency').value = 'USD';
    $('currency').dispatchEvent(new dom.window.Event('change'));
    
    // Cash should be 3500 / 7.0 = 500
    assert.strictEqual($('cashPrice').value, '500');
    // Valuation should be (0.105 / 7) * 100 = 1.50
    assert.strictEqual($('personalValuation').value, '1.50');
  });
});

test('USD/CNY currency toggling drift gatekeeper (non-divisible by 7)', async (t) => {
  const htmlPath = path.resolve(__dirname, '../_site/calculators/points-vs-cash/index.html');
  if (!fs.existsSync(htmlPath)) return;
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Load ZH page which defaults to CNY
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const document = dom.window.document;
  const $ = (id) => document.getElementById(id);
  const input = (id, value) => {
    const el = $(id);
    el.value = value;
    el.dispatchEvent(new dom.window.Event('input'));
  };

  await t.test('1. Initial CNY values set to 5000 / 800 / 200', () => {
    input('cashPrice', '5000');
    input('awardTaxes', '800');
    input('forgoneValue', '200');
    assert.strictEqual($('cashPrice').value, '5000');
    assert.strictEqual($('awardTaxes').value, '800');
    assert.strictEqual($('forgoneValue').value, '200');
  });

  await t.test('2. Multiple currency swaps do not accumulate rounding drift', () => {
    for (let i = 0; i < 10; i++) {
      // CNY -> USD
      $('currency').value = 'USD';
      $('currency').dispatchEvent(new dom.window.Event('change'));
      
      // USD -> CNY
      $('currency').value = 'CNY';
      $('currency').dispatchEvent(new dom.window.Event('change'));
    }
    
    // Values should remain EXACTLY the same as original input, despite 5000 / 7 = 714.28...
    assert.strictEqual($('cashPrice').value, '5000');
    assert.strictEqual($('awardTaxes').value, '800');
    assert.strictEqual($('forgoneValue').value, '200');
  });
});

test('Points to Miles Converter Core Logic & UI Tests', async (t) => {
  const htmlPath = path.resolve(__dirname, '../_site/en/calculators/points-to-miles-converter/index.html');
  if (!fs.existsSync(htmlPath)) return;
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Load EN page
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const document = dom.window.document;
  const $ = (id) => document.getElementById(id);
  const input = (id, value) => {
    const el = $(id);
    el.value = value;
    el.dispatchEvent(new dom.window.Event('input'));
  };

  await t.test('1. Points to Miles 1:1 + 20%', () => {
    input('bankPoints', '50000');
    input('baseRatio', '1');
    input('bonusPercent', '20');
    input('increment', '1000');
    
    assert.strictEqual($('transferablePoints').textContent, '50,000');
    assert.strictEqual($('baseMiles').textContent, '50,000');
    assert.strictEqual($('bonusMiles').textContent, '10,000');
    assert.strictEqual($('totalMiles').textContent, '60,000 Miles');
  });

  await t.test('2. 非 1:1 (Non 1:1 ratio)', () => {
    input('bankPoints', '50000');
    input('baseRatio', '0.5');
    input('bonusPercent', '20');
    input('increment', '1000');
    
    assert.strictEqual($('transferablePoints').textContent, '50,000');
    assert.strictEqual($('baseMiles').textContent, '25,000');
    assert.strictEqual($('bonusMiles').textContent, '5,000');
    assert.strictEqual($('totalMiles').textContent, '30,000 Miles');
  });

  await t.test('3. 步长余数 (Increment remainder)', () => {
    input('bankPoints', '50500');
    input('baseRatio', '1');
    input('bonusPercent', '0');
    input('increment', '1000');
    
    assert.strictEqual($('transferablePoints').textContent, '50,000');
    assert.strictEqual($('remainingPoints').textContent, '500');
    assert.strictEqual($('totalMiles').textContent, '50,000 Miles');
  });

  await t.test('4. 步长大于余额 (Increment larger than balance)', () => {
    input('bankPoints', '500');
    input('baseRatio', '1');
    input('bonusPercent', '0');
    input('increment', '1000');
    
    assert.strictEqual($('totalMiles').textContent, '-');
    assert.match($('explain').textContent, /You need at least 1000 points to make a transfer/);
  });

  await t.test('5. 空值、0、负数和非法参数 (Invalid inputs)', () => {
    input('bankPoints', '0');
    assert.strictEqual($('totalMiles').textContent, '-');
    
    input('bankPoints', '-5000');
    assert.strictEqual($('totalMiles').textContent, '-');
    assert.match($('explain').textContent, /Inputs cannot be negative/);
  });
});

test('Hotel Points vs Cash Engine Unit Tests', async (t) => {
  const CalculatorCore = require('../src/assets/calculator-core.js');

  await t.test('1. Simple Mode: $1500 cash, 100k points, $50 award fees -> 1.45 CPP', () => {
    const res = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'checkout-total',
      currency: 'USD',
      totalCashPrice: 1500,
      totalPointsRequired: 100000,
      awardCashFees: 50,
      personalValuation: 1.0,
      nights: 3
    });

    assert.strictEqual(res.grossCashCost, 1500);
    assert.strictEqual(res.awardCashCost, 50);
    assert.strictEqual(res.avoidedCashSpend, 1450);
    assert.strictEqual(res.actualPointsUsed, 100000);
    assert.strictEqual(res.cpp, 1.45);
    assert.strictEqual(res.recommendation, 'points');
    assert.strictEqual(res.personalValuationDifference, 45);
  });

  await t.test('2. Award fees exceed cash price: $300 cash, $350 award fees -> Warning & Cash recommendation', () => {
    const res = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'checkout-total',
      currency: 'USD',
      totalCashPrice: 300,
      totalPointsRequired: 50000,
      awardCashFees: 350,
      personalValuation: 1.0,
      nights: 1
    });

    assert.ok(res.calculationWarnings.includes('award_cash_exceeds_cash_price'));
    assert.strictEqual(res.recommendation, 'cash');
  });

  await t.test('3. Advanced Mode: 5 nights, 20k pts/night, 5th night free -> 80k pts used', () => {
    const res = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'nightly-breakdown',
      currency: 'USD',
      nightlyCashPrice: 200,
      pointsPerNight: 20000,
      nights: 5,
      freeNightRule: '5th',
      cashTaxes: 0,
      cashResortFees: 0,
      awardTaxes: 0,
      awardResortFees: 0,
      personalValuation: 1.0
    });

    assert.strictEqual(res.freeNights, 1);
    assert.strictEqual(res.pointsBeforeFreeNight, 100000);
    assert.strictEqual(res.actualPointsUsed, 80000);
    assert.strictEqual(res.grossCashCost, 1000);
    assert.strictEqual(res.cpp, 1.25);
  });

  await t.test('4. Simple mode preserves 80k pts without double-discounting 5th night', () => {
    const res = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'checkout-total',
      currency: 'USD',
      totalCashPrice: 1000,
      totalPointsRequired: 80000,
      awardCashFees: 0,
      nights: 5,
      personalValuation: 1.0
    });

    assert.strictEqual(res.freeNights, 0); // Checkout points already factored discounts
    assert.strictEqual(res.actualPointsUsed, 80000);
    assert.strictEqual(res.cpp, 1.25);
  });

  await t.test('5. Missing personal valuation -> displays CPP with no verdict bias', () => {
    const res = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'checkout-total',
      currency: 'USD',
      totalCashPrice: 1000,
      totalPointsRequired: 80000,
      awardCashFees: 0,
      nights: 5,
      personalValuation: null
    });

    assert.strictEqual(res.cpp, 1.25);
    assert.strictEqual(res.personalValuation, null);
    assert.strictEqual(res.recommendation, 'insufficient');
  });

  await t.test('6. 5 nights @ 20k pts: 5th night free (80k pts) vs standard without condition (100k pts)', () => {
    const withFreeNight = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'nightly-breakdown',
      currency: 'USD',
      nightlyCashPrice: 300,
      pointsPerNight: 20000,
      nights: 5,
      freeNightRule: '5th'
    });
    const withoutFreeNight = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'nightly-breakdown',
      currency: 'USD',
      nightlyCashPrice: 300,
      pointsPerNight: 20000,
      nights: 5,
      freeNightRule: 'none'
    });

    assert.strictEqual(withFreeNight.actualPointsUsed, 80000);
    assert.strictEqual(withFreeNight.freeNights, 1);
    assert.strictEqual(withoutFreeNight.actualPointsUsed, 100000);
    assert.strictEqual(withoutFreeNight.freeNights, 0);
  });

  await t.test('7. Resort Fee impact: Resort Fee > 0 reduces CPP and increases award cash cost', () => {
    const noFee = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'checkout-total',
      currency: 'USD',
      totalCashPrice: 1500,
      totalPointsRequired: 100000,
      awardCashFees: 0
    });
    const withFee = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'checkout-total',
      currency: 'USD',
      totalCashPrice: 1500,
      totalPointsRequired: 100000,
      awardCashFees: 250 // $50/night for 5 nights
    });

    assert.strictEqual(noFee.cpp, 1.50);
    assert.strictEqual(noFee.awardCashCost, 0);
    assert.strictEqual(withFee.cpp, 1.25);
    assert.strictEqual(withFee.awardCashCost, 250);
    assert.ok(withFee.cpp < noFee.cpp);
    assert.ok(withFee.awardCashCost > noFee.awardCashCost);
  });

  await t.test('8. Currency units: USD produces cents-per-point (cpp), CNY produces yuan-per-point (localPerPoint)', () => {
    const usdRes = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'checkout-total',
      currency: 'USD',
      totalCashPrice: 1000,
      totalPointsRequired: 50000,
      awardCashFees: 0
    });
    const cnyRes = CalculatorCore.calculateHotelPointsVsCash({
      inputMode: 'checkout-total',
      currency: 'CNY',
      totalCashPrice: 7000,
      totalPointsRequired: 50000,
      awardCashFees: 0
    });

    // In USD, avoidedCashSpend is $1000, cpp is (1000/50000)*100 = 2.0 ¢/pt
    assert.strictEqual(usdRes.cpp, 2.0);
    assert.strictEqual(usdRes.currency, 'USD');

    // In CNY, avoidedCashSpend is ¥7000, localPerPoint is 7000/50000 = 0.14 ¥/点
    assert.strictEqual(cnyRes.localPerPoint, 0.14);
    assert.strictEqual(cnyRes.currency, 'CNY');
  });
});

test('Phase 9.10: SEO, Hotel Table Enum & Step Numbering Verification', async (t) => {
  const hotelPrograms = require('../src/_data/hotelPrograms.js');
  const zhHotelHtml = fs.readFileSync(path.resolve(__dirname, '../_site/calculators/hotel-points-vs-cash/index.html'), 'utf8');
  const enHotelHtml = fs.readFileSync(path.resolve(__dirname, '../_site/en/calculators/hotel-points-vs-cash/index.html'), 'utf8');
  const enCppHtml = fs.readFileSync(path.resolve(__dirname, '../_site/en/calculators/cents-per-point/index.html'), 'utf8');
  const zhCalcIndexHtml = fs.readFileSync(path.resolve(__dirname, '../_site/calculators/index.html'), 'utf8');
  const enCalcIndexHtml = fs.readFileSync(path.resolve(__dirname, '../_site/en/calculators/index.html'), 'utf8');

  await t.test('1. Total hotel chains in table is exactly 8 (custom excluded from 8-chain comparison table)', () => {
    const zhDom = new JSDOM(zhHotelHtml);
    const enDom = new JSDOM(enHotelHtml);
    const zhRows = zhDom.window.document.querySelectorAll('.hotel-comparison-table tbody tr');
    const enRows = enDom.window.document.querySelectorAll('.hotel-comparison-table tbody tr');
    assert.strictEqual(zhRows.length, 8, 'ZH hotel table should have exactly 8 rows');
    assert.strictEqual(enRows.length, 8, 'EN hotel table should have exactly 8 rows');
  });

  await t.test('2. Resort fee status enum consistency and no false waived badges', () => {
    const zhDom = new JSDOM(zhHotelHtml);
    const enDom = new JSDOM(enHotelHtml);
    
    // Marriott must NOT be waived
    assert.ok(zhHotelHtml.includes('不免除'), 'ZH hotel table must contain 不免除');
    assert.ok(enHotelHtml.includes('Mandatory Cash'), 'EN hotel table must contain Mandatory Cash');
    
    const zhMarriottRow = Array.from(zhDom.window.document.querySelectorAll('.hotel-comparison-table tbody tr'))
      .find(r => r.textContent.includes('万豪'));
    assert.ok(zhMarriottRow, 'Marriott row must exist');
    assert.ok(!zhMarriottRow.querySelector('.policy-badge').textContent.includes('全积分免除'), 'Marriott must NOT have 全积分免除 badge');
    assert.ok(zhMarriottRow.querySelector('.policy-badge').textContent.includes('不免除'), 'Marriott must have 不免除 badge');

    const enMarriottRow = Array.from(enDom.window.document.querySelectorAll('.hotel-comparison-table tbody tr'))
      .find(r => r.textContent.includes('Marriott'));
    assert.ok(enMarriottRow, 'EN Marriott row must exist');
    assert.ok(!enMarriottRow.querySelector('.policy-badge').textContent.includes('Fully Waived'), 'EN Marriott must NOT have Fully Waived badge');
    assert.ok(enMarriottRow.querySelector('.policy-badge').textContent.includes('Mandatory Cash'), 'EN Marriott must have Mandatory Cash badge');

    // IHG and Best Western must be propertyDependent (视酒店而定 / Property Dependent), NOT waived
    const zhIhgRow = Array.from(zhDom.window.document.querySelectorAll('.hotel-comparison-table tbody tr'))
      .find(r => r.textContent.includes('洲际'));
    assert.ok(zhIhgRow.querySelector('.policy-badge').textContent.includes('视酒店而定'), 'IHG must be 视酒店而定');
    assert.ok(!zhIhgRow.querySelector('.policy-badge').textContent.includes('全积分免除'), 'IHG must NOT be 全积分免除');

    const zhBwRow = Array.from(zhDom.window.document.querySelectorAll('.hotel-comparison-table tbody tr'))
      .find(r => r.textContent.includes('最佳西方'));
    assert.ok(zhBwRow.querySelector('.policy-badge').textContent.includes('视酒店而定'), 'Best Western must be 视酒店而定');
    assert.ok(!zhBwRow.querySelector('.policy-badge').textContent.includes('全积分免除'), 'Best Western must NOT be 全积分免除');
  });

  await t.test('3. Step numbering continuity in all scenarios (no skipping numbers)', () => {
    const coreJs = fs.readFileSync(path.resolve(__dirname, '../src/assets/calculator-core.js'), 'utf8');
    const htmlWithCore = enHotelHtml.replace(/<script src="\/assets\/calculator-core\.js"[^>]*><\/script>/, () => `<script>${coreJs}</script>`);
    const dom = new JSDOM(htmlWithCore, { runScripts: 'dangerously', url: 'http://localhost/en/calculators/hotel-points-vs-cash/' });
    const doc = dom.window.document;

    const checkContinuousSteps = (scenarioName) => {
      const visibleSteps = Array.from(doc.querySelectorAll('.hotel-breakdown-step'))
        .filter(el => el.style.display !== 'none' && el.textContent.trim().length > 0)
        .map(el => {
          const m = el.textContent.match(/^(\d+)\./);
          return m ? parseInt(m[1], 10) : null;
        });

      assert.ok(visibleSteps.length >= 3, `${scenarioName}: Must have at least 3 visible steps`);
      for (let i = 0; i < visibleSteps.length; i++) {
        assert.strictEqual(visibleSteps[i], i + 1, `${scenarioName}: Step at index ${i} must be ${i+1}, got ${visibleSteps[i]}`);
      }
    };

    // Scenario 1: Forgone = 0 (Hilton example)
    doc.getElementById('exampleHilton').click();
    checkContinuousSteps('Hilton (Forgone=0)');

    // Scenario 2: Award fee > 0 (Marriott example)
    doc.getElementById('exampleMarriott').click();
    checkContinuousSteps('Marriott (All steps have value)');

    // Scenario 3: Award fee = 0 (Hyatt example)
    doc.getElementById('exampleHyatt').click();
    checkContinuousSteps('Hyatt (Award fee=0)');

    // Scenario 4: Both forgone = 0 and award fee = 0
    doc.getElementById('totalCashPrice').value = '1000';
    doc.getElementById('totalPointsRequired').value = '50000';
    doc.getElementById('hotelPointsEarnedValue').value = '0';
    doc.getElementById('creditCardRewardsValue').value = '0';
    doc.getElementById('awardCashFees').value = '0';
    doc.getElementById('totalCashPrice').dispatchEvent(new dom.window.Event('input'));
    checkContinuousSteps('Both forgone=0 and award fee=0');
  });

  await t.test('4. Build output contains 0 links to /点 or /%E7%82%B9', () => {
    const cp = require('child_process');
    const htmlFiles = cp.execSync('find _site -name "*.html"').toString().trim().split('\n');
    let badLinks = [];
    htmlFiles.forEach(f => {
      const html = fs.readFileSync(f, 'utf8');
      const matches = [...html.matchAll(/href=["']([^"']*点[^"']*)["']/g)].map(m => m[1]);
      const hexMatches = [...html.matchAll(/href=["']([^"']*%E7%82%B9[^"']*)["']/gi)].map(m => m[1]);
      if (matches.length > 0 || hexMatches.length > 0) {
        badLinks.push({ file: f, matches: [...matches, ...hexMatches] });
      }
    });
    assert.strictEqual(badLinks.length, 0, `Found illegal 点 hrefs in: ${JSON.stringify(badLinks)}`);
  });

  await t.test('5. English CPP page contains direct answer, formula, 2 worked examples, distinction, and mislead section', () => {
    assert.ok(enCppHtml.includes('What is cents per point and how do I calculate it?'), 'Direct answer question missing');
    assert.ok(enCppHtml.includes('Flight Redemption Example'), 'Flight example missing');
    assert.ok(enCppHtml.includes('Hotel Stay Example'), 'Hotel example missing');
    assert.ok(enCppHtml.includes('Actual Redemption CPP vs. Estimated Point Valuation'), 'Distinction section missing');
    assert.ok(enCppHtml.includes('When CPP Alone Can Mislead'), 'Misleading pitfalls section missing');
    assert.ok(enCppHtml.includes('(Cash Price − Award Taxes and Fees) ÷ Points Required × 100'), 'Formula missing');
  });

  await t.test('6. Directory and high-potential page titles have no duplicate brands', () => {
    const zhIndexDom = new JSDOM(zhCalcIndexHtml);
    const enIndexDom = new JSDOM(enCalcIndexHtml);
    
    const zhTitle = zhIndexDom.window.document.title;
    const enTitle = enIndexDom.window.document.title;
    
    assert.strictEqual(zhTitle, '积分与里程计算器大全 | 里程账');
    assert.strictEqual(enTitle, 'All Calculators | Points & Miles Calculator');
    
    // Check brand count
    const zhBrandOccurrences = (zhTitle.match(/里程账/g) || []).length;
    const enBrandOccurrences = (enTitle.match(/Points & Miles Calculator/g) || []).length;
    assert.strictEqual(zhBrandOccurrences, 1, 'ZH title must contain brand exactly once');
    assert.strictEqual(enBrandOccurrences, 1, 'EN title must contain brand exactly once');
  });
});

test('Phase 9.11: High-potential page CTR, United Miles Value Calculator, and Amex MR Interactive Tooling', async (t) => {
  const p2dHtml = fs.readFileSync(path.resolve(__dirname, '../_site/en/calculators/points-to-dollars/index.html'), 'utf8');
  const chaseHtml = fs.readFileSync(path.resolve(__dirname, '../_site/en/values/chase-ultimate-rewards/index.html'), 'utf8');
  const amexHtml = fs.readFileSync(path.resolve(__dirname, '../_site/en/values/amex-membership-rewards/index.html'), 'utf8');
  const enUnitedHtml = fs.readFileSync(path.resolve(__dirname, '../_site/en/calculators/united-miles-value-calculator/index.html'), 'utf8');
  const zhUnitedHtml = fs.readFileSync(path.resolve(__dirname, '../_site/calculators/united-miles-value-calculator/index.html'), 'utf8');

  await t.test('1. Miles to Dollars Calculator: SEO title, meta description, direct answer, and United link', () => {
    const dom = new JSDOM(p2dHtml);
    const doc = dom.window.document;
    const title = doc.querySelector('title').textContent.trim();
    const desc = doc.querySelector('meta[name="description"]').getAttribute('content').trim();
    const h1 = doc.querySelector('h1').textContent.trim();
    const directAnswer = doc.querySelector('.direct-answer').textContent.trim();

    assert.strictEqual(title, 'Miles to Dollars Calculator – Estimate Mile Value');
    assert.ok(title.length <= 60, `Title too long: ${title.length}`);
    assert.strictEqual(h1, 'Miles to Dollars Calculator');
    assert.strictEqual(desc, 'Estimate the travel value of airline miles in seconds. Enter your mileage balance and value per mile to compare low, typical, and high redemption scenarios.');
    assert.ok(desc.length >= 140 && desc.length <= 165, `Meta description length ${desc.length} out of bounds`);
    assert.ok(directAnswer.includes('Enter any mileage balance to instantly estimate its travel value—no signup required.'));
    assert.ok(!p2dHtml.includes('cash equivalent'), 'Should not contain misleading cash equivalent');

    // Contextual link to United calculator
    const unitedLink = Array.from(doc.querySelectorAll('a')).find(a => a.getAttribute('href') === '/en/calculators/united-miles-value-calculator/');
    assert.ok(unitedLink, 'Link to United calculator missing');
  });

  await t.test('2. Chase UR Page: SEO title, meta description, direct answer, and 4-row comparison table', () => {
    const dom = new JSDOM(chaseHtml);
    const doc = dom.window.document;
    const title = doc.querySelector('title').textContent.trim();
    const desc = doc.querySelector('meta[name="description"]').getAttribute('content').trim();
    const directAnswer = doc.querySelector('.direct-answer').textContent.trim();

    assert.strictEqual(title, 'Chase Points Value: How Much Are UR Points Worth?');
    assert.ok(title.length <= 60, `Title too long: ${title.length}`);
    assert.strictEqual(desc, 'Estimate Chase Ultimate Rewards points value by redemption method, including cash back, Chase Travel, Points Boost and transfer partners.');
    
    const wordCount = directAnswer.split(/\s+/).length;
    assert.ok(wordCount >= 45 && wordCount <= 75, `Direct answer word count is ${wordCount} (expected 45-70)`);

    const tableRows = doc.querySelectorAll('table tbody tr');
    assert.strictEqual(tableRows.length, 4, 'Expected exactly 4 comparison table rows');
    const tableText = doc.querySelector('table').textContent;
    assert.ok(tableText.includes('Cash Back'));
    assert.ok(tableText.includes('Chase Travel'));
    assert.ok(tableText.includes('Points Boost'));
    assert.ok(tableText.includes('Transfer Partners'));
    assert.ok(!chaseHtml.includes('fixed 1.5¢'), 'Must not claim fixed 1.5¢');
  });

  await t.test('3. Amex MR Page: SEO title, meta description, and interactive balance calculator', () => {
    const dom = new JSDOM(amexHtml, { runScripts: 'dangerously' });
    const doc = dom.window.document;
    const title = doc.querySelector('title').textContent.trim();
    const desc = doc.querySelector('meta[name="description"]').getAttribute('content').trim();

    assert.strictEqual(title, 'Amex Points Value Calculator & MR Guide');
    assert.ok(title.length <= 60, `Title too long: ${title.length}`);
    assert.strictEqual(desc, 'Estimate the value of Amex Membership Rewards points across cash, travel and transfer-partner scenarios, with examples for common point balances.');

    const balanceInput = doc.getElementById('amexBalance');
    const scenarioSelect = doc.getElementById('amexScenario');
    const resultVal = doc.getElementById('amexResultValue');
    assert.ok(balanceInput && scenarioSelect && resultVal, 'Amex calculator elements missing');

    // Test 50,000 MR @ 1.5¢ = $750
    balanceInput.value = '50000';
    scenarioSelect.value = '1.5';
    scenarioSelect.dispatchEvent(new dom.window.Event('change'));
    assert.strictEqual(resultVal.textContent.trim(), '$750');

    // Test 100,000 MR @ custom 1.2¢ = $1,200
    balanceInput.value = '100000';
    scenarioSelect.value = 'custom';
    scenarioSelect.dispatchEvent(new dom.window.Event('change'));
    const amexCppInput = doc.getElementById('amexCpp');
    amexCppInput.value = '1.2';
    amexCppInput.dispatchEvent(new dom.window.Event('input'));
    assert.strictEqual(resultVal.textContent.trim(), '$1,200');

    // Test invalid/negative balance resets cleanly
    balanceInput.value = '-5000';
    balanceInput.dispatchEvent(new dom.window.Event('input'));
    assert.strictEqual(resultVal.textContent.trim(), '-');
  });

  await t.test('4. United Miles Value Calculator EN: Functional calculation, quick balances, share params, and outbound links', () => {
    const dom = new JSDOM(enUnitedHtml, { runScripts: 'dangerously', url: 'http://localhost/en/calculators/united-miles-value-calculator/?miles=60000&cpp=1.2' });
    const doc = dom.window.document;
    const title = doc.querySelector('title').textContent.trim();
    assert.strictEqual(title, 'United Miles Value Calculator – MileagePlus Worth');
    assert.ok(title.length <= 60, `Title too long: ${title.length}`);

    const milesInput = doc.getElementById('unitedMiles');
    const scenarioSelect = doc.getElementById('presetValuation');
    const dollarVal = doc.getElementById('dollarValue');
    assert.ok(milesInput && scenarioSelect && dollarVal, 'United calculator elements missing');

    // Check pre-filled share params: 60,000 @ 1.2 = $720
    assert.strictEqual(milesInput.value, '60000');
    assert.strictEqual(scenarioSelect.value, '1.2');
    assert.strictEqual(dollarVal.textContent.trim(), '$720');

    // Test 50,000 @ 1.5 = $750
    milesInput.value = '50000';
    scenarioSelect.value = '1.5';
    scenarioSelect.dispatchEvent(new dom.window.Event('change'));
    assert.strictEqual(dollarVal.textContent.trim(), '$750');

    // Test negative handling
    milesInput.value = '-10000';
    milesInput.dispatchEvent(new dom.window.Event('input'));
    assert.strictEqual(dollarVal.textContent.trim(), '-');

    // Check outbound links
    const outboundHrefs = Array.from(doc.querySelectorAll('a')).map(a => a.getAttribute('href'));
    assert.ok(outboundHrefs.includes('/en/calculators/points-vs-cash/'), 'Points vs cash link missing');
    assert.ok(outboundHrefs.includes('/en/calculators/points-to-dollars/'), 'Points to dollars link missing');
    assert.ok(outboundHrefs.includes('/en/calculators/cents-per-point/'), 'CPP calculator link missing');
    assert.ok(outboundHrefs.includes('/en/guides/airline-miles-value/'), 'Airline miles guide link missing');
    assert.ok(outboundHrefs.some(h => h && h.includes('united.com')), 'Official United link missing');
  });

  await t.test('5. United Miles Value Calculator ZH: USD/CNY toggle, calculation, and outbound links', () => {
    const dom = new JSDOM(zhUnitedHtml, { runScripts: 'dangerously', url: 'http://localhost/calculators/united-miles-value-calculator/' });
    const doc = dom.window.document;
    const title = doc.querySelector('title').textContent.trim();
    assert.ok(title.includes('美联航里程价值计算器'));

    const milesInput = doc.getElementById('unitedMiles');
    const scenarioSelect = doc.getElementById('presetValuation');
    const dollarVal = doc.getElementById('dollarValue');
    const currSelect = doc.getElementById('currency');

    // 50,000 @ 1.5¢ USD = $750, CNY @ 7.0 FX = ¥5,250
    milesInput.value = '50000';
    scenarioSelect.value = '1.5';
    scenarioSelect.dispatchEvent(new dom.window.Event('change'));
    
    // In USD mode (default)
    assert.strictEqual(dollarVal.textContent.trim(), '$750');

    // Switch to CNY mode
    currSelect.value = 'CNY';
    currSelect.dispatchEvent(new dom.window.Event('change'));
    assert.strictEqual(dollarVal.textContent.trim(), '¥5,250');

    // Switch back to USD mode
    currSelect.value = 'USD';
    currSelect.dispatchEvent(new dom.window.Event('change'));
    assert.strictEqual(dollarVal.textContent.trim(), '$750');

    // Check outbound links
    const outboundHrefs = Array.from(doc.querySelectorAll('a')).map(a => a.getAttribute('href'));
    assert.ok(outboundHrefs.includes('/calculators/points-vs-cash/'), 'ZH Points vs cash link missing');
    assert.ok(outboundHrefs.includes('/calculators/points-to-dollars/'), 'ZH Points to dollars link missing');
    assert.ok(outboundHrefs.includes('/calculators/cents-per-point/'), 'ZH CPP calculator link missing');
    assert.ok(outboundHrefs.includes('/guides/airline-miles-value/'), 'ZH Airline miles guide link missing');
  });

  await t.test('6. Inbound contextual link counts for United Calculator (>= 5 EN, >= 5 ZH)', () => {
    const cp = require('child_process');
    const htmlFiles = cp.execSync('find _site -name "*.html"').toString().trim().split('\n');

    let enCount = 0;
    let zhCount = 0;

    htmlFiles.forEach(f => {
      const html = fs.readFileSync(f, 'utf8');
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const main = doc.querySelector('main') || doc.body;

      // Exclude nav, footer
      main.querySelectorAll('nav, footer, .nav, .footer, header').forEach(el => el.remove());

      const links = Array.from(main.querySelectorAll('a[href]')).map(a => a.getAttribute('href'));
      if (links.includes('/en/calculators/united-miles-value-calculator/')) {
        enCount++;
      }
      if (links.includes('/calculators/united-miles-value-calculator/')) {
        zhCount++;
      }
    });

    assert.ok(enCount >= 5, `Expected >= 5 EN inbound links, found ${enCount}`);
    assert.ok(zhCount >= 5, `Expected >= 5 ZH inbound links, found ${zhCount}`);
  });
});

test('Phase 9.11.1: United Factual Tightening and Chase Scope Expansion', async (t) => {
  const enUnitedHtml = fs.readFileSync(path.resolve(__dirname, '../_site/en/calculators/united-miles-value-calculator/index.html'), 'utf8');
  const zhUnitedHtml = fs.readFileSync(path.resolve(__dirname, '../_site/calculators/united-miles-value-calculator/index.html'), 'utf8');
  const enChaseHtml = fs.readFileSync(path.resolve(__dirname, '../_site/en/values/chase-ultimate-rewards/index.html'), 'utf8');
  const zhChaseHtml = fs.readFileSync(path.resolve(__dirname, '../_site/values/chase-ultimate-rewards/index.html'), 'utf8');

  await t.test('1. United EN: Factual tightening and second example unification', () => {
    assert.ok(enUnitedHtml.includes('illustrative scenarios'), 'Must contain illustrative scenarios');
    assert.ok(enUnitedHtml.includes('not official United valuations'), 'Must contain not official United valuations');
    assert.ok(!enUnitedHtml.includes('1.6¢'), 'Must NOT contain 1.6¢');
    assert.ok(!enUnitedHtml.includes('$1,280'), 'Must NOT contain $1,280');
    assert.ok(enUnitedHtml.includes('80,000') && enUnitedHtml.includes('1.5¢') && enUnitedHtml.includes('$1,200'), 'Must contain 80k @ 1.5¢ = $1,200');
    assert.ok(enUnitedHtml.includes('The 1.5¢ figure is an illustrative user-selected assumption, not an official United redemption rate.'), 'Must contain explicit assumption disclaimer');
    assert.ok(!enUnitedHtml.includes('2x to 3x'), 'Must NOT contain 2x to 3x');
    assert.ok(!enUnitedHtml.includes('$150–$300'), 'Must NOT contain $150–$300');
    assert.ok(!enUnitedHtml.includes('1–2 weeks'), 'Must NOT contain 1–2 weeks');
    assert.ok(!enUnitedHtml.includes('$2,500+'), 'Must NOT contain $2,500+');
    assert.ok(!enUnitedHtml.includes('Saver awards offer the highest'), 'Must NOT contain Saver awards offer the highest');
    assert.ok(!enUnitedHtml.includes('travelers commonly model United miles between 1.0¢ and 1.5¢ each'), 'Must NOT contain old commonly model phrase');
  });

  await t.test('2. United ZH: Factual tightening and second example unification', () => {
    assert.ok(zhUnitedHtml.includes('估值示例'), 'Must contain 估值示例');
    assert.ok(zhUnitedHtml.includes('并非美联航官方'), 'Must contain 并非美联航官方');
    assert.ok(!zhUnitedHtml.includes('1.6¢') && !zhUnitedHtml.includes('1.6 美分'), 'Must NOT contain 1.6');
    assert.ok(!zhUnitedHtml.includes('1,280') && !zhUnitedHtml.includes('$1,280'), 'Must NOT contain 1,280');
    assert.ok(zhUnitedHtml.includes('80,000') && zhUnitedHtml.includes('1.5') && zhUnitedHtml.includes('1,200'), 'Must contain 80k @ 1.5¢ = $1,200');
    assert.ok(zhUnitedHtml.includes('每里 1.5 美分仅为用户选择的估值示例，并非美联航官方兑换比率。'), 'Must contain ZH assumption disclaimer');
    assert.ok(!zhUnitedHtml.includes('平季的数倍'), 'Must NOT contain 平季的数倍');
    assert.ok(!zhUnitedHtml.includes('$150 至 $300'), 'Must NOT contain $150 至 $300');
    assert.ok(!zhUnitedHtml.includes('在常规旅行规划中，美联航里程的参考兑换价值通常'), 'Must NOT contain old phrase');
  });

  await t.test('3. Chase Scope Expansion and Official Sources (EN & ZH)', () => {
    // EN assertions
    assert.ok(enChaseHtml.includes('Confirm the live transfer ratio in your rewards portal.'), 'EN table must contain live transfer ratio prompt');
    assert.ok(enChaseHtml.includes('Ratios may depend on the eligible Chase card, partner, account transition rules, and effective date; for example, some eligible cards use a 4:3 Hyatt ratio while many other partners remain 1:1.'), 'EN table must explain scope of ratios');
    assert.ok(!enChaseHtml.includes('all Chase cards use 4:3'), 'Must NOT claim uniform 4:3');
    assert.ok(!enChaseHtml.includes('all partners use 1:1'), 'Must NOT claim uniform 1:1');
    assert.ok(enChaseHtml.includes('creditcards.chase.com'), 'Must link official Chase source');

    // ZH assertions
    assert.ok(zhChaseHtml.includes('请以奖励后台实时显示的转点比例为准。'), 'ZH table must contain live transfer ratio prompt');
    assert.ok(zhChaseHtml.includes('比例可能因符合条件的 Chase 卡种、合作伙伴、账户过渡规则及生效日期而不同；例如，部分符合条件的卡种对 Hyatt 采用 4:3，而许多其他伙伴仍为 1:1。'), 'ZH table must explain scope of ratios');
    assert.ok(!zhChaseHtml.includes('所有 Chase 卡统一 4:3'), 'Must NOT claim uniform 4:3');
    assert.ok(!zhChaseHtml.includes('所有合作伙伴统一 1:1'), 'Must NOT claim uniform 1:1');
    assert.ok(zhChaseHtml.includes('creditcards.chase.com'), 'Must link official Chase source');
  });

  await t.test('4. Tone & Fact Scanning across 4 pages (no banned absolute claims)', () => {
    const pages = [
      { name: 'United EN', text: enUnitedHtml, lang: 'en' },
      { name: 'Chase EN', text: enChaseHtml, lang: 'en' },
      { name: 'United ZH', text: zhUnitedHtml, lang: 'zh' },
      { name: 'Chase ZH', text: zhChaseHtml, lang: 'zh' }
    ];

    const bannedEn = [
      'guaranteed value', 'always best', 'highest cpp', 'most lucrative',
      'commonly worth', 'industry standard', 'always transfer', 'strictly 1:1',
      'all chase cards', 'all partners', 'impossible to reverse', 'guaranteed availability'
    ];
    const bannedZh = [
      '保证价值', '最高价值', '一定最划算', '行业统一标准',
      '所有 chase 卡', '所有合作伙伴', '绝对不可撤销', '保证有票'
    ];

    pages.forEach(p => {
      const lower = p.text.toLowerCase();
      // Remove permissible disclaimers like "not guaranteed", "no guaranteed"
      const cleaned = lower.replace(/not guaranteed|no guarantee|not guaranteed cashout|neither guaranteed/g, '');
      if (p.lang === 'en') {
        bannedEn.forEach(phrase => {
          assert.ok(!cleaned.includes(phrase), `${p.name} contains banned phrase: "${phrase}"`);
        });
      } else {
        bannedZh.forEach(phrase => {
          assert.ok(!cleaned.includes(phrase), `${p.name} contains banned phrase: "${phrase}"`);
        });
      }
    });
  });

  await t.test('5. SEO Freeze and Metadata Invariance', () => {
    const enUDom = new JSDOM(enUnitedHtml);
    const zhUDom = new JSDOM(zhUnitedHtml);
    const enCDom = new JSDOM(enChaseHtml);
    const zhCDom = new JSDOM(zhChaseHtml);

    assert.strictEqual(enUDom.window.document.title, 'United Miles Value Calculator – MileagePlus Worth');
    assert.strictEqual(zhUDom.window.document.title, '美联航里程价值计算器 | 里程账');
    assert.strictEqual(enCDom.window.document.title, 'Chase Points Value: How Much Are UR Points Worth?');
    assert.strictEqual(zhCDom.window.document.title, 'Chase Ultimate Rewards (UR) 积分估值与使用攻略 | 里程账');

    assert.strictEqual(enUDom.window.document.querySelector('h1').textContent.trim(), 'United MileagePlus Miles Value Calculator');
    assert.strictEqual(zhUDom.window.document.querySelector('h1').textContent.trim(), '美联航 MileagePlus 里程价值计算器');
    assert.strictEqual(enCDom.window.document.querySelector('h1').textContent.trim(), 'Chase Ultimate Rewards (UR) Points Value Guide');
    assert.strictEqual(zhCDom.window.document.querySelector('h1').textContent.trim(), 'Chase Ultimate Rewards (UR) 积分估值与使用攻略');

    // JSON-LD parsing
    [enUDom, zhUDom, enCDom, zhCDom].forEach(d => {
      const jsonLd = d.window.document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        assert.doesNotThrow(() => JSON.parse(jsonLd.textContent), 'JSON-LD must be valid JSON');
      }
    });
  });
});

