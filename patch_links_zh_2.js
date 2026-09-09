const fs = require('fs');

// 1. Chase Ultimate Rewards
let f1 = 'src/values/chase-ultimate-rewards.md';
let content1 = fs.readFileSync(f1, 'utf8');
content1 = content1.replace(
  '1:1 转入 World of Hyatt 兑换高端奢华酒店，或转入美联航 (United Airlines) 兑换星空联盟网络。</em>',
  '1:1 转入 World of Hyatt 兑换高端奢华酒店，或转入美联航 (United Airlines) 兑换星空联盟网络。如果您需要规划不同比例下的兑换，可以使用我们的[积分转航空里程工具](/calculators/points-to-miles-converter/)来计算准确的转换结果。</em>'
);
fs.writeFileSync(f1, content1);

// 2. Amex Membership Rewards
let f2 = 'src/values/amex-membership-rewards.md';
let content2 = fs.readFileSync(f2, 'utf8');
content2 = content2.replace(
  '比如全日空 (ANA) 的跨洋商务舱、维珍航空 (Virgin Atlantic) 兑换达美航空，或利用 30% 转点加赠活动等。',
  '比如全日空 (ANA) 的跨洋商务舱、维珍航空 (Virgin Atlantic) 兑换达美航空，或利用 30% 转点加赠活动等。在进行操作前，我们建议您[计算实际可获得的航空里程数](/calculators/points-to-miles-converter/)，以确保结果符合预期。'
);
fs.writeFileSync(f2, content2);

// 3. Transfer Bonus Guide
let f3 = 'src/guides/transfer-bonus-calculator-guide.md';
let content3 = fs.readFileSync(f3, 'utf8');
content3 = content3.replace(
  '（如果您需要反向计算已知银行积分能获得多少里程，请见下方说明）',
  '反之，如果您已经确定了手头的银行积分数量，想要[计算实际能换算出的航空里程](/calculators/points-to-miles-converter/)，请使用我们的正向换算工具。'
);
fs.writeFileSync(f3, content3);
