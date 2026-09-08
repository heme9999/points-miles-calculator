const fs = require('fs');
let html = fs.readFileSync('src/en/index.njk', 'utf8');

// 1. Change title
html = html.replace(/title: Points and Miles Calculators/, 'title: Points to Miles Converter & Award Travel Calculators');

// 2. Modify tasks list
const newTasks = `<div class="tasks">
  <h2>Choose Your Task</h2>
  <a class="item" href="/en/calculators/points-to-miles-converter/">
    <span>Convert points to airline miles</span>
    <span class="desc">Calculate exact airline miles received from your bank points</span>
  </a>
  <a class="item" href="/en/calculators/points-to-dollars/">
    <span>Miles to Dollars Calculator</span>
    <span class="desc">Convert airline miles to an estimated total cash value</span>
  </a>
  <a class="item" href="/en/calculators/points-vs-cash/">
    <span>Compare points vs cash</span>
    <span class="desc">Compare flight award ticket costs against paying cash</span>
  </a>
  <a class="item" href="/en/calculators/cents-per-point/">
    <span>Calculate cents per point</span>
    <span class="desc">Calculate CPP redemption value for any award ticket</span>
  </a>
  <a class="item" href="/en/calculators/transfer-bonus/">
    <span>Calculate points needed for target miles</span>
    <span class="desc">Find minimum bank points required for a specific award flight</span>
  </a>
</div>`;

html = html.replace(/<div class="tasks">[\s\S]*?<\/div>/, newTasks);

// 3. Add explanation about the homepage calculator
html = html.replace(
  /<p>\s*For award taxes, fees, transfer bonuses[\s\S]*?<\/p>/,
  `<p>
  This homepage tool is for quick estimation between cashing out points and transferring them to airline miles. For exact airline miles calculation based on bank transfer increments, use the <a href="/en/calculators/points-to-miles-converter/">Points to Miles Converter</a>. For detailed flight comparisons including award taxes, fees, and forgone earnings, use the <a href="/en/calculators/points-vs-cash/">Advanced Points vs Cash Calculator</a>.
</p>`
);

// 4. Update internal links in the SEO section
const newSeoList = `<ul>
    <li><strong><a href="/en/calculators/points-to-miles-converter/">Points to Miles Converter</a></strong>: Use this to precisely calculate how many airline miles you will get from a given bank point balance.</li>
    <li><strong><a href="/en/calculators/points-vs-cash/">Points vs Cash Calculator</a></strong>: Use this when evaluating a specific flight or hotel redemption. It compares the full cash price against the required points, accounting for award taxes and forgone earnings.</li>
    <li><strong><a href="/en/calculators/cents-per-point/">Cents Per Point Calculator</a></strong>: A quick tool to find out exactly how much value you are getting per point for a given redemption.</li>
    <li><strong><a href="/en/calculators/points-to-dollars/">Miles to Dollars Calculator</a></strong>: Best for estimating the total cash value of your entire points balance based on various valuation scenarios.</li>
    <li><strong><a href="/en/calculators/transfer-bonus/">Transfer Bonus Calculator</a></strong>: Essential for finding the exact number of bank points to transfer during a promotion, respecting minimum increments.</li>
  </ul>`;

html = html.replace(/<ul>\s*<li><strong><a href="\/en\/calculators\/points-vs-cash\/">[\s\S]*?<\/ul>/, newSeoList);

fs.writeFileSync('src/en/index.njk', html);
