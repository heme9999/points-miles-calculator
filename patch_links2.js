const fs = require('fs');

function addLink(filepath, searchRegex, replaceWith) {
  let html = fs.readFileSync(filepath, 'utf8');
  if (searchRegex.test(html) && !html.includes('/en/calculators/points-to-dollars/')) {
    html = html.replace(searchRegex, replaceWith);
    fs.writeFileSync(filepath, html);
    console.log(`Patched ${filepath}`);
  } else {
    console.log(`Failed or already patched: ${filepath}`);
  }
}

// 1. /en/guides/how-to-calculate-point-value/
// It has text: "Once you understand how to calculate cents per point for a single flight..."
// We can find a good place to insert it.
// Let's just append it to a paragraph or replace a phrase.
