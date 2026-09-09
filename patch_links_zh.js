const fs = require('fs');

// 1. Chase Ultimate Rewards
let f1 = 'src/values/chase-ultimate-rewards.md';
let content1 = fs.readFileSync(f1, 'utf8');
content1 = content1.replace(
  '最核心的价值来自于 1:1 转换到凯悦（World of Hyatt）和美联航（United MileagePlus）等优质伙伴。',
  '最核心的价值来自于 1:1 转换到凯悦（World of Hyatt）和美联航（United MileagePlus）等优质伙伴。如果您需要规划不同比例下的兑换，可以使用我们的[积分转航空里程工具](/calculators/points-to-miles-converter/)来计算准确的转换结果。'
);
fs.writeFileSync(f1, content1);

// 2. Amex Membership Rewards
let f2 = 'src/values/amex-membership-rewards.md';
let content2 = fs.readFileSync(f2, 'utf8');
content2 = content2.replace(
  'Amex MR 拥有最多的航空合作伙伴，且经常推出转点加赠活动（如 30% 加赠至维珍航空或法荷航）',
  'Amex MR 拥有最多的航空合作伙伴，且经常推出转点加赠活动（如 30% 加赠至维珍航空或法荷航）。在进行操作前，我们建议您[计算实际可获得的航空里程数](/calculators/points-to-miles-converter/)，以确保结果符合预期。'
);
fs.writeFileSync(f2, content2);

// 3. Transfer Bonus Guide
let f3 = 'src/guides/transfer-bonus-calculator-guide.md';
let content3 = fs.readFileSync(f3, 'utf8');
content3 = content3.replace(
  '此时，您不能直接用 65,000 除以 1.25',
  '反之，如果您已经确定了手头的银行积分数量，想要[计算实际能换算出的航空里程](/calculators/points-to-miles-converter/)，请使用我们的正向换算工具。而在这里，您不能直接用 65,000 除以 1.25'
);
fs.writeFileSync(f3, content3);
