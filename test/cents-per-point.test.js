const assert = require('node:assert');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

test('Cents Per Point (CPP) Calculator Onload Evaluation', async (t) => {

  await t.test('1. EN CPP default load (500, 50, 15000) calculates to 3.00¢', () => {
    const html = fs.readFileSync(path.join(__dirname, '../_site/en/calculators/cents-per-point/index.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'dangerously' });
    const { document } = dom.window;

    const cppResult = document.getElementById('cppResult').textContent;
    const savedCash = document.getElementById('savedCash').textContent;

    assert.equal(cppResult, '3.00¢ / point', 'EN CPP should default to 3.00¢ / point');
    assert.equal(savedCash, '$450', 'EN saved cash should default to $450');
  });

  await t.test('2. ZH CPP default load calculates correctly', () => {
    const html = fs.readFileSync(path.join(__dirname, '../_site/calculators/cents-per-point/index.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'dangerously' });
    const { document } = dom.window;

    const cppResult = document.getElementById('cppResult').textContent;
    assert.ok(cppResult.includes('0.1733') || cppResult.includes('0.0347'), 'ZH CPP should calculate default value');
  });

  await t.test('3. URL params initialize correctly', () => {
    const html = fs.readFileSync(path.join(__dirname, '../_site/en/calculators/cents-per-point/index.html'), 'utf8');
    const dom = new JSDOM(html, { 
      runScripts: 'dangerously',
      url: 'http://localhost/en/calculators/cents-per-point/?cashPrice=600&awardTaxes=100&pointsNeeded=20000'
    });
    const { document } = dom.window;

    const cashPrice = document.getElementById('cashPrice').value;
    const cppResult = document.getElementById('cppResult').textContent;
    
    assert.equal(cashPrice, '600', 'URL param should populate input');
    assert.equal(cppResult, '2.50¢ / point', 'Should calculate correctly from URL params');
  });

  await t.test('4. Boundary/Edge cases (0 points)', () => {
    const html = fs.readFileSync(path.join(__dirname, '../_site/en/calculators/cents-per-point/index.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/en/calculators/cents-per-point/?cashPrice=500&awardTaxes=50&pointsNeeded=0' });
    const { document } = dom.window;
    
    const cppResult = document.getElementById('cppResult').textContent;
    assert.equal(cppResult, '-', 'CPP result should safely reset when points <= 0');
  });
});
