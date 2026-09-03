const fs = require('fs');
const file = 'src/index.njk';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div class="unit" id="unitMilesRatio">例:输入3,代表3积分换1英里</div>',
  '<div class="unit" id="unitMilesRatio">示例比例，不同银行和兑换伙伴可能不同。请以银行或积分计划转点页面当日显示的比例为准。</div>'
);

content = content.replace(
  '如果按 10:1 转入航空常客计划，可获得 10,000 里程。',
  '这是另一种积分体系的 10:1 演示情景，如果按 10:1 转入航空常客计划，可获得 10,000 里程（请以银行或积分计划转点页面当日显示的比例为准）。'
);

fs.writeFileSync(file, content);

const fileEn = 'src/en/index.njk';
let contentEn = fs.readFileSync(fileEn, 'utf8');

contentEn = contentEn.replace(
  'Alternatively, you can transfer them 1:1 to United MileagePlus.',
  'This is a 1:1 demonstration scenario (actual ratios vary by bank and program). Alternatively, you can transfer them 1:1 to United MileagePlus (please check the exact ratio on your bank\'s transfer page).'
);

fs.writeFileSync(fileEn, contentEn);
