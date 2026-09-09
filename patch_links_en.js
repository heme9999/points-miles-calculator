const fs = require('fs');

// 1. Chase Ultimate Rewards
let f1 = 'src/en/values/chase-ultimate-rewards.md';
let content1 = fs.readFileSync(f1, 'utf8');
content1 = content1.replace(
  'They transfer 1:1 to partners like World of Hyatt, United MileagePlus, and Southwest Rapid Rewards.',
  'They transfer 1:1 to partners like World of Hyatt, United MileagePlus, and Southwest Rapid Rewards. If you need to map out your transfer math across different ratios, you can use our [points to airline miles conversion tool](/en/calculators/points-to-miles-converter/) to calculate the exact payout.'
);
fs.writeFileSync(f1, content1);

// 2. Amex Membership Rewards
let f2 = 'src/en/values/amex-membership-rewards.md';
let content2 = fs.readFileSync(f2, 'utf8');
content2 = content2.replace(
  'Amex frequently offers transfer bonuses (e.g., 20% to Flying Blue or 30% to Virgin Atlantic), which can push the value of MR points well above 2.0¢.',
  'Amex frequently offers transfer bonuses (e.g., 20% to Flying Blue or 30% to Virgin Atlantic), which can push the value of MR points well above 2.0¢. Before initiating a transfer, we recommend you [calculate how many airline miles you will receive](/en/calculators/points-to-miles-converter/) based on your current bank balance.'
);
fs.writeFileSync(f2, content2);

// 3. Transfer Bonus Guide
let f3 = 'src/en/guides/transfer-bonus-calculator-guide.md';
let content3 = fs.readFileSync(f3, 'utf8');
content3 = content3.replace(
  'For example, if you need 65,000 miles for a business class flight',
  'However, if you already know how many bank points you have and just want to [calculate your exact airline miles output](/en/calculators/points-to-miles-converter/), you should use our dedicated converter tool. For example, if you need 65,000 miles for a business class flight'
);
fs.writeFileSync(f3, content3);
