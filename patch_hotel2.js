const fs = require('fs');
let html = fs.readFileSync('src/en/calculators/hotel-points-vs-cash.njk', 'utf8');

const directAnswer = `
<div class="direct-answer" style="margin-top: 1rem; margin-bottom: 2rem;">
  <p>Our <strong>Hotel Award Stay Calculator</strong> provides a complete comparison between paying the full cash rate and redeeming hotel points. It precisely factors in standard cash costs, award points required, mandatory resort or destination fees, taxes on both cash and award stays, elite status benefits, and popular "fifth night free" perks.</p>
</div>
`;

html = html.replace('<p class="sub">Compare hotel cash rates against points redemptions, factoring in resort fees, taxes, and 5th-night-free benefits.</p>', 
  '<p class="sub">Compare hotel cash rates against points redemptions, factoring in resort fees, taxes, and 5th-night-free benefits.</p>' + directAnswer);


const newSections = `
<div class="article-content prose" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid var(--line);">
  <h2>The Core Formula for Hotel Point Valuations</h2>
  <p>To decide whether to use hotel points, you must compare the "cash expenditure avoided" against the "actual points consumed." This calculator uses the following precise formula:</p>
  <div class="formula-box">
    <span class="formula-name">Cash Avoided =</span>
    <span class="formula-expression">(Nightly Rate × Nights) + Cash Taxes + Cash Resort Fees - (Base Points Forgone + CC Rewards) - Award Cash Taxes - Award Resort Fees</span>
  </div>
  <div class="formula-box" style="margin-top: -1rem;">
    <span class="formula-name">Actual CPP =</span>
    <span class="formula-expression">Cash Avoided ÷ Actual Points Consumed</span>
  </div>

  <h3>Comprehensive 5-Night Stay Example</h3>
  <div class="example-box">
    <h4>Example: 5 Nights at a Luxury Resort</h4>
    <ul>
      <li><strong>Cash Rate</strong>: $300 / night ($1,500 total)</li>
      <li><strong>Cash Taxes & Resort Fees</strong>: $350 total</li>
      <li><strong>Points Required</strong>: 50,000 / night</li>
    </ul>
    <p><strong>Applying the 5th Night Free</strong>: Since many programs (like Marriott and Hilton) offer the 5th night free on award stays, you only pay for 4 nights, requiring 200,000 points total instead of 250,000.</p>
    <p><strong>Net Cash Saved</strong>: If the program waives resort fees and taxes on award stays, you save the full $1,850. The resulting value is ($1,850 ÷ 200,000) × 100 = <strong>0.925¢ per point</strong>.</p>
  </div>

  <h2>Important Program Variations</h2>
  <p>Hotel loyalty programs have vastly different policies for award stays. The features in this calculator adapt based on these rules, which vary by program and specific property:</p>
  <ul>
    <li><strong>Taxes on Award Stays</strong>: Some jurisdictions require hotels to charge local taxes based on the cash value of an award night.</li>
    <li><strong>Resort Fee Waivers</strong>: Hilton Honors and World of Hyatt generally waive resort and destination fees on fully points-booked award stays. Marriott Bonvoy, however, typically <em>does not</em> waive resort fees on award stays. Always verify with the specific property.</li>
    <li><strong>Fifth Night Free</strong>: Hilton (for elite members) and Marriott (for all members) offer the 5th consecutive award night free. Hyatt and IHG have different structures or credit card requirements for similar perks.</li>
    <li><strong>Elite Benefits</strong>: Free breakfast, parking, or lounge access can significantly reduce your out-of-pocket costs, altering the math.</li>
  </ul>

  <h2>When Cash May Still Be Better</h2>
  <p>Even if the math looks close, paying cash for a hotel stay might be preferable in certain situations:</p>
  <ul>
    <li><strong>Cash Promotions</strong>: Seasonal sales, OTA discounts, or cashback portals can drastically lower the cash price.</li>
    <li><strong>Earning Points and Nights</strong>: Cash stays earn base points, elite bonus points, and qualifying elite nights, which have their own monetary value.</li>
    <li><strong>Cancellation Policies</strong>: While award stays are usually flexible, some cash rates offer even better cancellation terms or pay-at-property convenience.</li>
    <li><strong>Resort Fees Still Payable</strong>: If the property charges a $50 daily resort fee that isn't waived on award stays, your "free" night could still be expensive.</li>
    <li><strong>Low Points Value</strong>: If the calculated value is significantly below standard benchmarks (e.g., getting 0.3¢ per Marriott point), it's usually better to save the points.</li>
  </ul>
`;

html = html.replace(/<div class="article-content prose"[^>]*>[\s\S]*?<div class="formula-box" style="margin-top: -1rem;">[\s\S]*?<\/div>/, newSections);
fs.writeFileSync('src/en/calculators/hotel-points-vs-cash.njk', html);
