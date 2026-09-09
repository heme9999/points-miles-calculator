const fs = require('fs');
let file = fs.readFileSync('src/en/calculators/points-to-dollars.njk', 'utf8');

file = file.replace(
  '<p>You have a balance of 50,000 Chase Ultimate Rewards points. You plan to transfer them to Hyatt, so you assign a conservative valuation of 1.5¢ per point.</p>',
  '<p>You have a balance of 50,000 Chase Ultimate Rewards points. You plan to transfer them to Hyatt, so you assign a conservative valuation of 1.5¢ per point.</p>\n  <p><em>Note: Actual transfer ratios and account-specific transition rules may vary. Always verify the live ratio in your bank\'s rewards portal before transferring.</em></p>'
);

fs.writeFileSync('src/en/calculators/points-to-dollars.njk', file);
