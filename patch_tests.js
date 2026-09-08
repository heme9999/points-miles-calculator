const fs = require('fs');

function replaceFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /expectedTitle: 'Points and Miles Calculators \| Points & Miles Calculator'/g,
    "expectedTitle: 'Points to Miles Converter & Award Travel Calculators | Points & Miles Calculator'"
  );
  content = content.replace(
    /expectedTitle: 'Points to Dollars Calculator \| Miles Value \| Points & Miles Calculator'/g,
    "expectedTitle: 'Miles to Dollars Calculator | Points to Dollars | Points & Miles Calculator'"
  );
  if (path === 'test_production.js') {
    const newPageChecks = `    { path: '/en/calculators/points-to-miles-converter/', expectedH1: 'Points to Miles Converter', expectedTitle: 'Points to Miles Converter | Points & Miles Calculator' },\n    { path: '/calculators/points-to-miles-converter/', expectedH1: '积分转航空里程换算器', expectedTitle: '积分转航空里程换算器｜计算转点比例与加赠里程 | 里程账' },\n`;
    content = content.replace(/(const pagesToCheck = \[\n)/, `$1${newPageChecks}`);
  }
  fs.writeFileSync(path, content);
}

replaceFile('test_production.js');
replaceFile('scripts/test_sitemap_strict.js');
replaceFile('scripts/test_intent_mapping.js');
