const fs = require('fs');

// 1. /en/guides/how-to-calculate-point-value.md
let f1 = fs.readFileSync('src/en/guides/how-to-calculate-point-value.md', 'utf8');
f1 = f1.replace(
  /- 🧮 \[Advanced Points vs Cash Calculator\]/,
  "- 💵 [Miles to Dollars Calculator](/en/calculators/points-to-dollars/): Estimate the dollar value of miles for your entire points balance.\n- 🧮 [Advanced Points vs Cash Calculator]"
);
fs.writeFileSync('src/en/guides/how-to-calculate-point-value.md', f1);

// 2. /en/guides/airline-miles-value.md
let f2 = fs.readFileSync('src/en/guides/airline-miles-value.md', 'utf8');
f2 = f2.replace(/\[Points to Dollars Calculator\]\(\/en\/calculators\/points-to-dollars\/\)/, '[Miles to Dollars Calculator](/en/calculators/points-to-dollars/)');
fs.writeFileSync('src/en/guides/airline-miles-value.md', f2);

// 3. /en/values/index.njk
let f3 = fs.readFileSync('src/en/values/index.njk', 'utf8');
f3 = f3.replace(
  /<div class="reads" style="margin-top: 40px;">\s*<h2>Credit Card Points<\/h2>/,
  '<p>If you want to estimate the total cash value of your entire points balance based on these valuations, use our <a href="/en/calculators/points-to-dollars/">Miles to Dollars Calculator</a>.</p>\n\n<div class="reads" style="margin-top: 40px;">\n  <h2>Credit Card Points</h2>'
);
fs.writeFileSync('src/en/values/index.njk', f3);

// 4. /en/methodology.md
let f4 = fs.readFileSync('src/en/methodology.md', 'utf8');
f4 = f4.replace(
  /Here is how we determine those numbers\./,
  `Here is how we determine those numbers.

## Apply the Method

Put our methodology into practice with our free calculators:
- [Points to Miles Converter](/en/calculators/points-to-miles-converter/): Convert bank points to exact airline miles.
- [Miles to Dollars Calculator](/en/calculators/points-to-dollars/): Estimate the dollar value of miles.
- [Cents Per Point Calculator](/en/calculators/cents-per-point/): Find the precise redemption value of a ticket.
- [Points vs Cash Calculator](/en/calculators/points-vs-cash/): Compare the full cost of awards vs. cash.`
);
fs.writeFileSync('src/en/methodology.md', f4);

