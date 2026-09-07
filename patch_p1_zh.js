const fs = require('fs');
let html = fs.readFileSync('src/calculators/points-vs-cash.njk', 'utf8');

// 1. Remove the value clearing logic and replace with conversion
html = html.replace(/\$\('cashPrice'\)\.value = '';[\s\S]*?clearCalculatorResults\(\);/m, 
`const fx = 7.0;
        const multiply = currentCurrency === 'CNY' ? fx : (1 / fx);
        
        ['cashPrice', 'awardTaxes', 'forgoneValue'].forEach(id => {
          if ($(id).value) {
             const val = parseFloat($(id).value);
             $(id).value = (val * multiply).toFixed(0);
          }
        });
        
        if ($('personalValuation').value) {
           const v = parseFloat($('personalValuation').value);
           if (currentCurrency === 'CNY') {
             // USD to CNY: cents/point to CNY/point
             $('personalValuation').value = ((v * fx) / 100).toFixed(4);
           } else {
             // CNY to USD: CNY/point to cents/point
             $('personalValuation').value = ((v / fx) * 100).toFixed(2);
           }
        }`);

// 2. Fix the initialization of personalValuation if it wasn't provided in URL
html = html.replace(/parseParam\('valuation', 'personalValuation', 1000\);/m, 
`parseParam('valuation', 'personalValuation', 1000);
  if (!params.has('valuation')) {
    $('personalValuation').value = currentCurrency === 'USD' ? '1.5' : '0.105';
  }`);
  
// Also remove value="0.1" from the HTML input
html = html.replace(/id="personalValuation" value="0\.1"/, 'id="personalValuation"');

fs.writeFileSync('src/calculators/points-vs-cash.njk', html);
