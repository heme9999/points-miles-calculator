const fs = require('fs');

let file = fs.readFileSync('scripts/test_sitemap_strict.js', 'utf8');

// Add presence checks for Points to Miles Converters
const checkCode = `
  if (!urls.includes('https://points-miles-calculator.pages.dev/en/calculators/points-to-miles-converter/')) {
    console.error('[FAIL] Missing EN Points to Miles Converter');
    failures++;
  }
  if (!urls.includes('https://points-miles-calculator.pages.dev/calculators/points-to-miles-converter/')) {
    console.error('[FAIL] Missing ZH Points to Miles Converter');
    failures++;
  }
`;

file = file.replace(
  /if \(urls\.length !== 106\) \{/,
  checkCode + '\n  if (urls.length !== 106) {'
);

fs.writeFileSync('scripts/test_sitemap_strict.js', file);
