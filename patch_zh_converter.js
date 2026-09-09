const fs = require('fs');

let file = fs.readFileSync('src/calculators/points-to-miles-converter.njk', 'utf8');

file = file.replace(
  /虽然 Chase 和 Bilt 的常规转点都是 1:1，但万豪、Amex、Citi 和 Capital One 等在部分航司上存在特殊比例。请务必登录您的银行网银，进入转点操作界面，系统会明确标示当前的准确兑换比例/,
  "许多转点伙伴采用 1:1 比例，但也存在例外及账户过渡规则。操作前请以银行奖励后台当日显示的比例为准。"
);

file = file.replace(
  /一旦您将银行积分转换为航空里程或酒店积分，就绝对无法退回银行账户。/,
  "转点通常不可撤销。"
);

fs.writeFileSync('src/calculators/points-to-miles-converter.njk', file);
