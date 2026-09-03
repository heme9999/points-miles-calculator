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
