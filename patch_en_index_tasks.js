const fs = require('fs');
let file = fs.readFileSync('src/en/index.njk', 'utf8');

// Compress Title
file = file.replace(
  /title: Points to Miles Converter & Award Travel Calculators/,
  "title: Points to Miles & Award Calculators"
);

// Add Points to Miles Converter to the grid and update Transfer Bonus
file = file.replace(
  /<div class="popular-calculators-grid">[\s\S]*?<\/div>/,
  `<div class="popular-calculators-grid">
    <a href="/en/calculators/points-to-miles-converter/" class="calculator-link-card">
      Convert points to airline miles →
      <span>Calculate how many miles you will get from your bank points</span>
    </a>
    <a href="/en/calculators/points-vs-cash/" class="calculator-link-card">
      Compare points vs cash →
      <span>Compare flight award ticket costs against paying cash</span>
    </a>
    <a href="/en/calculators/cents-per-point/" class="calculator-link-card">
      Calculate cents per point →
      <span>Calculate CPP redemption value for any award ticket</span>
    </a>
    <a href="/en/calculators/points-to-dollars/" class="calculator-link-card">
      Convert points to dollars →
      <span>Convert airline miles to an estimated total cash value</span>
    </a>
    <a href="/en/calculators/transfer-bonus/" class="calculator-link-card">
      Calculate a transfer bonus →
      <span>Calculate points needed for target miles</span>
    </a>
  </div>`
);

fs.writeFileSync('src/en/index.njk', file);
