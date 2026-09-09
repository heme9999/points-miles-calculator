const fs = require('fs');

// 1. Chase Ultimate Rewards
let f1 = 'src/values/chase-ultimate-rewards.md';
let content1 = fs.readFileSync(f1, 'utf8');
content1 = content1.replace(
  '如果您需要规划不同比例下的兑换，可以使用我们的[积分转航空里程工具](/calculators/points-to-miles-converter/)来计算准确的转换结果。</em>',
  '如果您需要规划不同比例下的兑换，可以使用我们的<a href="/calculators/points-to-miles-converter/">积分转航空里程工具</a>来计算准确的转换结果。</em>'
);
fs.writeFileSync(f1, content1);

// 2. Amex Membership Rewards
let f2 = 'src/values/amex-membership-rewards.md';
let content2 = fs.readFileSync(f2, 'utf8');
content2 = content2.replace(
  '转点至全日空 (ANA) 兑换中美往返商务舱，或在转点加赠期间转入英国航空 (BA Avios) 兑换短途机票。</em>',
  '转点至全日空 (ANA) 兑换中美往返商务舱，或在转点加赠期间转入英国航空 (BA Avios) 兑换短途机票。在进行操作前，我们建议您使用<a href="/calculators/points-to-miles-converter/">计算实际可获得的航空里程数</a>，以确保结果符合预期。</em>'
);
fs.writeFileSync(f2, content2);

// 3. Transfer Bonus Guide
let f3 = 'src/guides/transfer-bonus-calculator-guide.md';
let content3 = fs.readFileSync(f3, 'utf8');
content3 = content3.replace(
  '这里，您不能直接用 65,000 除以 1.25，因为信用卡的转点单位通常是 1,000 点的整数倍。',
  '反之，如果您已经确定了手头的银行积分数量，想要<a href="/calculators/points-to-miles-converter/">计算实际能换算出的航空里程</a>，请使用我们的正向换算工具。这里，您不能直接用 65,000 除以 1.25，因为信用卡的转点单位通常是 1,000 点的整数倍。'
);
fs.writeFileSync(f3, content3);
