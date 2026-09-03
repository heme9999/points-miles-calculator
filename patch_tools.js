const fs = require('fs');

// 1. Points vs Cash
let pvc = fs.readFileSync('src/en/calculators/points-vs-cash.njk', 'utf8');
if (!pvc.includes('<div class="formula-box">')) {
  pvc = pvc.replace('<h2>What is the Points vs Cash Calculator?</h2>', 
`<h2>The Math Behind the Calculator</h2>
<p>Our advanced calculator uses the following formula to determine the actual Cents Per Point (CPP) after accounting for all fees and forgone rewards:</p>
<div class="formula-box">
  <span class="formula-name">Actual CPP =</span>
  <span class="formula-expression">[(Cash Price - Award Taxes - Forgone Rewards) ÷ Required Points] × 100</span>
</div>
<p>It then compares this Actual CPP against your Personal Valuation. If Actual CPP > Personal Valuation, using points is mathematically optimal.</p>

<h3>Real-World Example</h3>
<div class="example-box">
  <h4>Example: The Hidden Cost of Forgone Rewards</h4>
  <p>A flight costs $500 cash or 40,000 points + $50 in taxes. If you pay cash using a travel card that earns 3x points, you would earn 1,500 points (worth ~$30). The "Forgone Rewards" is $30.</p>
  <ul>
    <li><strong>Net Cash Saved</strong>: $500 (Cash Price) - $50 (Taxes) - $30 (Forgone) = $420</li>
    <li><strong>Actual CPP</strong>: ($420 ÷ 40,000) × 100 = 1.05¢ / point</li>
  </ul>
  <p>If your personal baseline valuation for these points is 1.5¢, the calculator will recommend <strong>Paying Cash</strong> because 1.05¢ < 1.5¢.</p>
</div>

<h2>What is the Points vs Cash Calculator?</h2>`);
  fs.writeFileSync('src/en/calculators/points-vs-cash.njk', pvc);
}

// 2. Points to Dollars
let ptd = fs.readFileSync('src/en/calculators/points-to-dollars.njk', 'utf8');
if (!ptd.includes('<div class="formula-box">')) {
  ptd = ptd.replace('<h2>How to use the Points to Dollars Calculator</h2>',
`<h2>The Conversion Formula</h2>
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

<h2>How to use the Points to Dollars Calculator</h2>`);
  fs.writeFileSync('src/en/calculators/points-to-dollars.njk', ptd);
}

// 3. Transfer Bonus
let tb = fs.readFileSync('src/en/calculators/transfer-bonus.njk', 'utf8');
if (!tb.includes('<div class="formula-box">')) {
  tb = tb.replace('<h2>How Transfer Bonuses Work</h2>',
`<h2>The Transfer Bonus Math</h2>
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

<h2>How Transfer Bonuses Work</h2>`);
  fs.writeFileSync('src/en/calculators/transfer-bonus.njk', tb);
}
