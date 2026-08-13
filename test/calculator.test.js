const test = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

test('Points vs Cash Advanced Calculator Tests', async (t) => {
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
    assert.strictEqual($('costCompare').textContent, '积分成本: -现金成本: -');
    assert.strictEqual($('verdictCode').textContent, 'DIFF —');
    assert.ok(!$('cppResult').classList.contains('win'), 'Should clear win class');
  });

  await t.test('4. Tax exceeds cash price', () => {
    input('pointsNeeded', '40000');
    input('awardTaxes', '6000');
    input('transferBonus', '0');
    // actualCpp = (5000 - 6000 - 200) / 40000 < 0
    assert.strictEqual($('verdictText').textContent, '绝对亏本');
    assert.strictEqual($('verdictCode').textContent, 'DIFF < 0');
  });

  await t.test('5. Empty input protection (NaN)', () => {
    input('awardTaxes', '');
    // If tax is empty, it should parse as 0. 
    // CPP = (5000 - 0 - 200) / 40000 = 0.1200
    assert.strictEqual($('cppResult').textContent, '¥0.1200 / 点');
  });

  await t.test('6. Negative inputs are clamped to 0 or ignored', () => {
    // We will test if our Nunjucks script intercepts negative values
    input('pointsNeeded', '-40000');
    assert.strictEqual($('cppResult').textContent, '-');
    assert.strictEqual($('verdictText').textContent, '—');
  });
});

test('Homepage Base Calculator Tests', async (t) => {
  const htmlPath = path.resolve(__dirname, '../_site/index.html');
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

  await t.test('1. Points is 0 clears states', () => {
    input('points', '0');
    assert.strictEqual($('verdictText').textContent, '—');
    assert.strictEqual($('explain').textContent, '请输入有效的积分数量。');
  });
});
