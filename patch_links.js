const fs = require('fs');

function addLink(file, linkHtml) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /(<div class="related-tools">[\s\S]*?<ul>)/,
    `$1\n      ${linkHtml}`
  );
  fs.writeFileSync(file, content);
}

addLink('src/en/calculators/transfer-bonus.njk', '<li><a href="/en/calculators/points-to-miles-converter/">Points to Miles Converter</a>: Calculate exact airline miles from a bank point balance.</li>');
addLink('src/calculators/transfer-bonus.njk', '<li><a href="/calculators/points-to-miles-converter/">积分转航空里程换算器</a>：已知银行积分，正向计算能换出多少航空里程。</li>');
