const fs = require('fs');

function patchFile(filepath) {
  let html = fs.readFileSync(filepath, 'utf8');

  // Replace the conversion block
  const oldConversionBlockRegex = /const fx = 7\.0;[\s\S]*?pvEl\.value = [^;]+;\s*\}\s*\}/;
  // wait, the previous patch used `$('personalValuation').value = ...` 
  
  // Let's use a simpler replacement strategy. We will replace from `const fx = 7.0;` down to the `}` right before `try { localStorage.setItem`
  const replaceRegex = /const fx = 7\.0;[\s\S]*?\}\s*try \{ localStorage\.setItem/;
  
  const newConversionBlock = `const fx = 7.0;
        const multiply = currentCurrency === 'CNY' ? fx : (1 / fx);
        
        ['cashPrice', 'awardTaxes', 'forgoneValue'].forEach(id => {
          const el = $(id);
          if (el && el.value) {
             let val = parseFloat(el.dataset.rawValue || el.value);
             if (!isNaN(val)) {
                let newVal = val * multiply;
                el.dataset.rawValue = newVal;
                el.value = Math.round(newVal);
             }
          }
        });
        
        const pvEl = $('personalValuation');
        if (pvEl && pvEl.value) {
           let v = parseFloat(pvEl.dataset.rawValue || pvEl.value);
           if (!isNaN(v)) {
             if (currentCurrency === 'CNY') {
               let newVal = (v * fx) / 100;
               pvEl.dataset.rawValue = newVal;
               pvEl.value = newVal.toFixed(4);
             } else {
               let newVal = (v / fx) * 100;
               pvEl.dataset.rawValue = newVal;
               pvEl.value = newVal.toFixed(2);
             }
           }
        }
      }
      try { localStorage.setItem`;

  html = html.replace(replaceRegex, newConversionBlock);

  // Replace the event listener assignment
  const oldEventListenerBlock = /\['cashPrice', 'pointsNeeded', 'awardTaxes', 'forgoneValue', 'transferBonus', 'personalValuation'\]\.forEach\(id => \{\s*if\(\$\(id\)\) \$\(id\)\.addEventListener\('input', calcAdv\);\s*\}\);/;
  
  const newEventListenerBlock = `['cashPrice', 'pointsNeeded', 'awardTaxes', 'forgoneValue', 'transferBonus', 'personalValuation'].forEach(id => {
    if($(id)) {
      $(id).addEventListener('input', (e) => {
         e.target.dataset.rawValue = e.target.value;
         calcAdv();
      });
    }
  });`;
  
  html = html.replace(oldEventListenerBlock, newEventListenerBlock);
  fs.writeFileSync(filepath, html);
}

patchFile('src/en/calculators/points-vs-cash.njk');
patchFile('src/calculators/points-vs-cash.njk');
