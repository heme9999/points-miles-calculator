const fs = require('fs');

const targets = [
  '_site/en/calculators/points-vs-cash/index.html',
  '_site/en/calculators/cents-per-point/index.html',
  '_site/en/calculators/points-to-dollars/index.html',
  '_site/en/calculators/transfer-bonus/index.html'
];

targets.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i)[1];
  const title = html.match(/<title>(.*?)<\/title>/i)[1];
  const desc = html.match(/<meta name="description" content="(.*?)"/i)[1];
  console.log(`\nURL: ${file.replace('_site', '')}`);
  console.log(`H1: ${h1}`);
  console.log(`Title: ${title}`);
  console.log(`Description: ${desc}`);
});
