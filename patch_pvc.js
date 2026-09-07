const fs = require('fs');

let html = fs.readFileSync('src/en/calculators/points-vs-cash.njk', 'utf8');

// The prompt requires:
// 2. 首屏增加 40–70 词直接说明，必须回答：输入现金票价、奖励所需积分和税费；页面会计算实际 CPP；页面会比较现金与积分方案；结果取决于用户自己的积分估值。
// 3. 清楚说明它与英文首页快速估算工具的区别...
// 4. 增加一个完整、可复算的示例，明确列出各种参数...
// 6. 增加 “When paying cash may be better” 小节...

const directAnswer = `
<div class="direct-answer" style="margin-top: 1rem; margin-bottom: 2rem;">
  <p>To use this <strong>Points vs Cash Calculator</strong>, simply input the cash price of your ticket, the points required for the award flight, and any associated taxes. The calculator will immediately determine your actual Cents Per Point (CPP) value and compare the two options side-by-side. The final recommendation to redeem points or pay cash depends entirely on your personal baseline valuation for those points.</p>
  <p style="font-size: 0.9em; color: #64748b; margin-top: 0.5rem;"><em>Note: Unlike the quick estimate tool on our homepage, this advanced calculator is designed for evaluating a specific flight. It precisely accounts for out-of-pocket taxes, transfer bonuses, and the opportunity cost of points you would have earned by paying cash.</em></p>
</div>
`;

// Insert the direct answer right after the <p class="sub">
html = html.replace('<p class="sub">Compare the true cost of an award ticket against a cash fare, factoring in taxes, forgone miles, and transfer bonuses.</p>', 
  '<p class="sub">Compare the true cost of an award ticket against a cash fare, factoring in taxes, forgone miles, and transfer bonuses.</p>' + directAnswer);


// We already have a "Real-World Example" box in the file from the previous prompt. Let's replace it with the new comprehensive one.
const newExample = `
<h3>Comprehensive Calculation Example</h3>
<div class="example-box">
  <h4>Example: Evaluating a Business Class Award</h4>
  <ul>
    <li><strong>Cash Price</strong>: $2,500</li>
    <li><strong>Award Taxes & Fees</strong>: $200</li>
    <li><strong>Points Required</strong>: 80,000 points</li>
    <li><strong>Forgone Earnings</strong>: $125 (What you would earn if paying cash)</li>
    <li><strong>Transfer Bonus</strong>: 20%</li>
  </ul>
  <p>First, we calculate the <strong>Net Cash Saved</strong>: $2,500 - $200 - $125 = $2,175.</p>
  <p>Next, we determine the <strong>Effective Points Used</strong>: With a 20% transfer bonus, you only need to transfer 66,667 bank points to get the 80,000 miles.</p>
  <p><strong>Actual CPP</strong>: ($2,175 ÷ 66,667) × 100 = 3.26¢ / point.</p>
  <p><strong>Conclusion</strong>: If your personal valuation is 1.5¢, the calculator strongly recommends transferring points, as 3.26¢ is much higher.</p>
</div>
`;

// Replace the existing example box
html = html.replace(/<h3>Real-World Example<\/h3>[\s\S]*?<\/div>/, newExample);

// Add "When paying cash may be better" section before "The 5-Step Award vs. Cash Decision Framework"
const cashBetterSection = `
<h2>When Paying Cash May Be Better</h2>
<p>Even if you have a large points balance, there are several scenarios where paying cash is the more logical choice:</p>
<ul>
  <li><strong>Low CPP Redemptions</strong>: If the calculated CPP is lower than your baseline valuation, you are losing value.</li>
  <li><strong>High Award Surcharges</strong>: Some international carriers impose exorbitant fuel surcharges ($500+) on award tickets, wiping out your cash savings.</li>
  <li><strong>Earning Elite Status</strong>: Cash tickets earn redeemable miles and count towards elite status qualification, while award flights typically do not.</li>
  <li><strong>Strict Cancellation Policies</strong>: If the cash ticket offers better flexibility or the award ticket has high redeposit fees, cash may reduce your risk.</li>
  <li><strong>Points Devaluation</strong>: While hoarding points is risky due to devaluations, spending them on a terrible redemption is not the solution. Save them for a better opportunity.</li>
</ul>
`;

html = html.replace('<h2>The 5-Step Award vs. Cash Decision Framework</h2>', cashBetterSection + '\n<h2>The 5-Step Award vs. Cash Decision Framework</h2>');

fs.writeFileSync('src/en/calculators/points-vs-cash.njk', html);
