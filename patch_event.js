const fs = require('fs');

function patchFile(filepath) {
  let html = fs.readFileSync(filepath, 'utf8');

  // Regex to match the array and the forEach block regardless of spaces or order
  const replaceRegex = /\[['\s\w,]+\]\.forEach\(id => \{\s*if\(\$\(id\)\) \$\(id\)\.addEventListener\('input', calcAdv\);\s*\}\);/;
  
  const newEventListenerBlock = `['cashPrice', 'pointsNeeded', 'awardTaxes', 'forgoneValue', 'transferBonus', 'personalValuation'].forEach(id => {
    if($(id)) {
      $(id).addEventListener('input', (e) => {
         e.target.dataset.rawValue = e.target.value;
         calcAdv();
      });
    }
  });`;
  
  if (replaceRegex.test(html)) {
    html = html.replace(replaceRegex, newEventListenerBlock);
    fs.writeFileSync(filepath, html);
    console.log('Patched', filepath);
  } else {
    console.log('Did not match', filepath);
  }
}

patchFile('src/en/calculators/points-vs-cash.njk');
patchFile('src/calculators/points-vs-cash.njk');
