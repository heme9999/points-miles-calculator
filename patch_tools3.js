const fs = require('fs');

let ptd = fs.readFileSync('src/en/calculators/points-to-dollars.njk', 'utf8');
if (!ptd.includes('<div class="formula-box">')) {
  ptd = ptd.replace('<div class="article-content prose"',
`<div class="article-content prose" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid var(--line);">
<h2>The Conversion Formula</h2>
<p>To convert your points balance into an estimated cash value, we use a simple multiplication formula based on the Cents Per Point (CPP) valuation you select:</p>
<div class="formula-box">
  <span class="formula-name">Total Cash Value =</span>
  <span class="formula-expression">Total Points × (Valuation in Cents ÷ 100)</span>
</div>

<h3>Calculation Example</h3>
<div class="example-box">
  <h4>Example: Valuing a Chase Ultimate Rewards Balance</h4>
  <p>You have a balance of 50,000 Chase Ultimate Rewards points. You plan to transfer them to Hyatt, so you assign a conservative valuation of 1.5¢ per point.</p>
  <ul>
    <li><strong>Calculation</strong>: 50,000 points × (1.5¢ ÷ 100) = $750</li>
  </ul>
  <p>Your 50,000 points are worth an estimated $750 towards future travel. <em>Limitation: This is an estimated value for planning purposes, not liquid cash you can withdraw from an ATM.</em></p>
</div>

<div class="article-content prose"`);
  fs.writeFileSync('src/en/calculators/points-to-dollars.njk', ptd);
}

let tb = fs.readFileSync('src/en/calculators/transfer-bonus.njk', 'utf8');
if (!tb.includes('<div class="formula-box">')) {
  tb = tb.replace('<div class="article-content prose"',
`<div class="article-content prose" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid var(--line);">
<h2>The Transfer Bonus Math</h2>
<p>To calculate exactly how many bank points you need to transfer during a bonus promotion, we use this two-step formula, which also accounts for the bank's minimum transfer increments (usually 1,000 points):</p>
<div class="formula-box">
  <span class="formula-name">Effective Ratio =</span>
  <span class="formula-expression">Base Ratio × (1 + Bonus Percentage)</span>
</div>
<div class="formula-box" style="margin-top: -1rem;">
  <span class="formula-name">Bank Points Needed =</span>
  <span class="formula-expression">ROUNDUP((Remaining Miles Needed ÷ Effective Ratio) ÷ Increment) × Increment</span>
</div>

<h3>Calculation Example</h3>
<div class="example-box">
  <h4>Example: 30% Virgin Atlantic Transfer Bonus</h4>
  <p>You want to book a Virgin Atlantic flight that requires 60,000 miles. You already have 10,000 miles in your account, so you need 50,000 more. Chase is offering a 30% transfer bonus to Virgin (Base ratio 1:1, Increment 1,000).</p>
  <ul>
    <li><strong>Effective Ratio</strong>: 1 × (1 + 0.30) = 1.3 miles per point</li>
    <li><strong>Raw Points Needed</strong>: 50,000 ÷ 1.3 = 38,461.5 points</li>
    <li><strong>Rounding Up</strong>: Since you must transfer in blocks of 1,000, you round up to 39,000 points.</li>
    <li><strong>Final Result</strong>: You transfer 39,000 Chase points and receive 50,700 Virgin miles. You now have enough to book your flight, with 700 excess miles left over.</li>
  </ul>
</div>

<div class="article-content prose"`);
  fs.writeFileSync('src/en/calculators/transfer-bonus.njk', tb);
}
