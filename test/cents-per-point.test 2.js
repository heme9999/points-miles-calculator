const test = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

test('Cents Per Point Calculator Tests (EN/ZH Onload Defaults)', async (t) => {
  await t.test('English Page Default Load', () => {
    const htmlPath = path.resolve(__dirname, '../_site/en/calculators/cents-per-point/index.html');
    if (!fs.existsSync(htmlPath)) {
      assert.fail(`HTML not found at ${htmlPath}.`);
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { runScripts: 'dangerously' });
    const document = dom.window.document;
    
    // Check values after DOM loaded
    const cppResult = document.getElementById('cppResult').textContent;
    assert.strictEqual(cppResult.includes('3.00'), true, 'Expected default CPP to be 3.00 cents/point');
  });

  await t.test('Chinese Page Default Load', () => {
    const htmlPath = path.resolve(__dirname, '../_site/calculators/cents-per-point/index.html');
    if (!fs.existsSync(htmlPath)) {
      assert.fail(`HTML not found at ${htmlPath}.`);
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    // For Chinese page, the JS needs to interact with URL params or default values correctly.
    // The default inputs in HTML are 3000 cash, 400 taxes, 15000 points.
    // (3000 - 400) / 15000 = 0.17333333333
    // It should display ¥0.1733 /点
    const dom = new JSDOM(html, { runScripts: 'dangerously' });
    const document = dom.window.document;
    
    const cppResult = document.getElementById('cppResult').textContent;
    assert.strictEqual(cppResult.includes('0.1733'), true, 'Expected default CPP to be 0.1733 for Chinese page default values');
  });
});
