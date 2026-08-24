const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const num = parseInt(hex, 16);
  return [num >> 16, (num >> 8) & 255, num & 255];
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test('Trip Cost Waterfall Table Accessibility & Contrast Tests', async (t) => {

  await t.test('1. Mathematical WCAG 2.1 AA Contrast Ratio Calculations', () => {
    const pairs = [
      { name: 'Table Header: #0e1a2b on #e7edf4', fg: '#0e1a2b', bg: '#e7edf4', minRatio: 4.5 },
      { name: 'Table Body: #0e1a2b on #ffffff', fg: '#0e1a2b', bg: '#ffffff', minRatio: 4.5 },
      { name: 'Card Muted: #475569 on #ffffff', fg: '#475569', bg: '#ffffff', minRatio: 4.5 },
      { name: 'Deduction Green: #166534 on #ffffff', fg: '#166534', bg: '#ffffff', minRatio: 4.5 },
      { name: 'Taxes Red: #b42318 on #ffffff', fg: '#b42318', bg: '#ffffff', minRatio: 4.5 },
      { name: 'Total Row Highlight: #1e3a8a on #dbeafe', fg: '#1e3a8a', bg: '#dbeafe', minRatio: 4.5 },
      { name: 'Total Row Dark Text: #0e1a2b on #dbeafe', fg: '#0e1a2b', bg: '#dbeafe', minRatio: 4.5 }
    ];

    pairs.forEach(p => {
      const ratio = getContrastRatio(p.fg, p.bg);
      assert.ok(ratio >= p.minRatio, `${p.name} ratio ${ratio.toFixed(2)}:1 must be >= ${p.minRatio}:1`);
    });
  });

  await t.test('2. Chinese Trip Cost Table Headers & DOM Structure', () => {
    const htmlPath = path.join(__dirname, '../_site/calculators/trip-cost-after-points/index.html');
    if (!fs.existsSync(htmlPath)) return;
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const thead = doc.querySelector('.waterfall-table thead');
    assert.ok(thead, 'thead must exist inside .waterfall-table');

    const ths = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim());
    assert.strictEqual(ths.length, 5, 'Must have exactly 5 table headers');
    assert.deepStrictEqual(ths, [
      '预算类别',
      '全现金基准',
      '积分抵扣扣减',
      '必须自付税费/附加费',
      '最终实际自付现金'
    ]);
  });

  await t.test('3. English Trip Cost Table Headers & DOM Structure', () => {
    const htmlPath = path.join(__dirname, '../_site/en/calculators/trip-cost-after-points/index.html');
    if (!fs.existsSync(htmlPath)) return;
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const thead = doc.querySelector('.waterfall-table thead');
    assert.ok(thead, 'thead must exist inside .waterfall-table');

    const ths = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim());
    assert.strictEqual(ths.length, 5, 'Must have exactly 5 table headers');
    assert.deepStrictEqual(ths, [
      'Budget Category',
      'All-Cash Baseline',
      'Points Deduction',
      'Mandatory Taxes / Fees',
      'Final Out-of-Pocket Cash'
    ]);
  });

  await t.test('4. CSS Rules & Print Stylesheet Verification in style.css', () => {
    const cssPath = path.join(__dirname, '../src/assets/style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('.ticket .main .waterfall-table thead th'), 'Must contain scoped table header rule');
    assert.ok(css.includes('background: #e7edf4;') || css.includes('background:#e7edf4;'), 'Header bg must be #e7edf4');
    assert.ok(css.includes('color: #0e1a2b;') || css.includes('color:#0e1a2b;'), 'Header text must be #0e1a2b');
    assert.ok(css.includes('#166534'), 'Must contain high-contrast green #166534');
    assert.ok(css.includes('#b42318'), 'Must contain high-contrast red #b42318');
    assert.ok(css.includes('@media print'), 'Must contain print styles');
    assert.ok(css.includes('.ticket .main .waterfall-table thead th') && css.includes('color: #000000 !important;'), 'Print styles must force black text on headers');
  });

});
