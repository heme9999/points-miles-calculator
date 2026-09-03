const fs = require('fs');

function addLink(file, oldStr, newStr) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes(newStr)) {
    content = content.replace(oldStr, newStr);
    fs.writeFileSync(file, content);
  }
}

// 1. what-is-cents-per-point.md
addLink('src/en/guides/what-is-cents-per-point.md', 
'To easily calculate this yourself,', 
'To easily calculate this yourself, we recommend using our <a href="/en/calculators/cents-per-point/">Cents Per Point Calculator</a> to quickly determine the exact value of your redemption,');

// 2. points-vs-cash.md
addLink('src/en/guides/points-vs-cash.md',
'# Points vs Cash: When to Redeem and When to Pay',
'# Points vs Cash: When to Redeem and When to Pay\n\nIf you want to instantly do the math on a specific flight, jump straight to our [Points vs Cash Calculator](/en/calculators/points-vs-cash/). Otherwise, read on to understand the framework.');

// 3. transfer-bonus-calculator-guide.md
addLink('src/en/guides/transfer-bonus-calculator-guide.md',
'# How to Maximize Transfer Bonuses',
'# How to Maximize Transfer Bonuses\n\nTo figure out exactly how many points you need to transfer during a promotion, use our dedicated [Transfer Bonus Calculator](/en/calculators/transfer-bonus/).');

// 4. airline-miles-value.md
addLink('src/en/guides/airline-miles-value.md',
'# The Real Value of Airline Miles',
'# The Real Value of Airline Miles\n\nWondering what your current balance is worth? Use our [Points to Dollars Calculator](/en/calculators/points-to-dollars/) to estimate your total cash value, or our [Points vs Cash Calculator](/en/calculators/points-vs-cash/) to evaluate a specific flight.');

