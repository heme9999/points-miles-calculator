const fs = require('fs');

let html = fs.readFileSync('src/en/index.njk', 'utf8');

// 1. Change milesRatio value to 1
html = html.replace('id="milesRatio" value="3"', 'id="milesRatio" value="1"');

// 2. Add heading and hint
const hintHtml = `
<h2 style="margin-top: 2rem;">Quick Points Transfer vs Cashout Estimate</h2>
<p style="margin-bottom: 1.5rem; color: #475569; font-size: 0.95rem;">
  For award taxes, fees, transfer bonuses, and the value of points you would otherwise earn, use the <a href="/en/calculators/points-vs-cash/">Advanced Points vs Cash Calculator</a>.
</p>
<div class="panel">`;
html = html.replace('<div class="panel">', hintHtml);

// 3. Replace seo-content article
const seoRegex = /<article class="seo-content"[\s\S]*?<\/article>/;
const newSeo = `<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>How to Choose the Right Tool</h2>
  <p>To help you navigate the complexities of award travel, we provide four distinct calculators:</p>
  <ul>
    <li><strong><a href="/en/calculators/points-vs-cash/">Points vs Cash Calculator</a></strong>: Use this when evaluating a specific flight or hotel redemption. It compares the full cash price against the required points, accounting for award taxes and forgone earnings.</li>
    <li><strong><a href="/en/calculators/cents-per-point/">Cents Per Point Calculator</a></strong>: A quick tool to find out exactly how much value you are getting per point for a given redemption.</li>
    <li><strong><a href="/en/calculators/points-to-dollars/">Points to Dollars Calculator</a></strong>: Best for estimating the total cash value of your entire points balance based on various valuation scenarios.</li>
    <li><strong><a href="/en/calculators/transfer-bonus/">Transfer Bonus Calculator</a></strong>: Essential for finding the exact number of bank points to transfer during a promotion, respecting minimum increments.</li>
  </ul>
  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>Last Fact-Checked: September 2026. Editorial Disclaimer: Valuations and calculations are estimates for educational purposes and do not constitute financial advice.</em></p>
</article>`;
html = html.replace(seoRegex, newSeo);

fs.writeFileSync('src/en/index.njk', html);
