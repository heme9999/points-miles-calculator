const fs = require('fs');

function patchZH() {
  let html = fs.readFileSync('src/calculators/points-vs-cash.njk', 'utf8');
  
  html = html.replace(/实际用出 \$\{actualCpp\.toFixed\(2\)\} 美分\/点的价值，高出个人期望 \(\$\{V\} 美分\/点\)，兑换收益突出。/g, 
    "实际用出 ${actualCpp.toFixed(2)} 美分/点的价值，高于个人估值基准 (${V} 美分/点)。使用积分在当前假设下更具价值。");
    
  html = html.replace(/实际用出 ¥\$\{actualCpp\.toFixed\(4\)\}\/点的价值，高出个人估值 \(¥\$\{V\}\/点\)，非常划算。/g, 
    "实际用出 ¥${actualCpp.toFixed(4)}/点的价值，高于个人估值基准 (¥${V}/点)。使用积分在当前假设下更具价值。");

  html = html.replace(/实际仅用出 \$\{actualCpp\.toFixed\(2\)\} 美分\/点，低于期望估值 \(\$\{V\} 美分\/点\)，建议保留积分直接买票。/g,
    "实际用出 ${actualCpp.toFixed(2)} 美分/点，低于个人估值基准 (${V} 美分/点)。在当前假设下，建议使用现金购票并保留积分。");

  html = html.replace(/实际仅用出 ¥\$\{actualCpp\.toFixed\(4\)\}\/点，低于个人估值 \(¥\$\{V\}\/点\)，建议直接花钱买票并积累新里程。/g,
    "实际用出 ¥${actualCpp.toFixed(4)}/点，低于个人估值基准 (¥${V}/点)。在当前假设下，建议使用现金购票并保留积分。");

  fs.writeFileSync('src/calculators/points-vs-cash.njk', html);
}

function patchEN() {
  let html = fs.readFileSync('src/en/calculators/points-vs-cash.njk', 'utf8');
  
  html = html.replace(/This redemption yields \$\{diff\}% more value than your personal valuation\. A great deal!/g, 
    "This redemption yields ${diff}% more value than your personal baseline. Using points is mathematically advantageous under these assumptions.");

  html = html.replace(/The actual value falls \$\{diff\}% short of your personal valuation\. You are better off paying cash and saving the points\./g,
    "This redemption falls ${diff}% short of your personal baseline. Under these assumptions, paying cash and conserving points is recommended.");

  fs.writeFileSync('src/en/calculators/points-vs-cash.njk', html);
}

patchZH();
patchEN();
