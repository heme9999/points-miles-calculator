const fs = require('fs');
let html = fs.readFileSync('src/en/values/chase-ultimate-rewards.md', 'utf8');

// Replace "How Your Card Product Impacts Value"
html = html.replace(/<h2>How Your Card Product Impacts Value<\/h2>[\s\S]*?<h2>The Chase Redemption Decision Flow<\/h2>/, `<h2>How Your Card Product Impacts Value (Updated for 2026)</h2>
<p>Historically, Chase offered fixed 1.25¢ and 1.5¢ multipliers across all travel booked in the portal. However, Chase's official rules have evolved. The base redemption value in Chase Travel is now typically <strong>1.0¢ per point</strong>, with dynamic <strong>Points Boost</strong> offers applying only to eligible, rotating hotel and flight bookings.</p>
<ul>
  <li><strong>Chase Sapphire Reserve®</strong>: Eligible Points Boost offers can increase the value of your points up to <strong>2.0¢</strong> each.</li>
  <li><strong>Chase Sapphire Preferred® & Ink Business Preferred®</strong>: Eligible Points Boost offers can increase value up to <strong>1.5¢</strong> each.</li>
  <li><strong>Grandfathered/Transition Accounts</strong>: Some older accounts or specific redemption categories may temporarily retain the legacy fixed 1.5¢/1.25¢ structure, but this is no longer universal for all cardholders.</li>
  <li><strong>Chase Freedom® Family</strong>: On their own, these cards offer a base <strong>1.0¢</strong> per point (cash back). You can combine points with a premium Sapphire or Ink card to access Points Boosts and transfer partners.</li>
</ul>
<p>While third-party editorial valuations often peg the theoretical value of Chase points around <strong>2.0¢ per point</strong>, your actual baseline depends on current Points Boost offers and transfer opportunities.</p>

<h2>The Chase Redemption Decision Flow</h2>`);

// Replace the specific text in "The Chase Redemption Decision Flow"
html = html.replace(/<li><strong>The Chase Travel Portal \(1\.25¢ - 1\.5¢\)<\/strong>: Before transferring points to a partner, check the cash price of the flight or hotel in the Chase Portal. If a flight is very cheap, booking it through the portal at 1\.5¢ per point might cost fewer points than an airline's award chart. \(Use our <a href="\/en\/calculators\/points-vs-cash\/">Points vs Cash Calculator<\/a> to do the math\).<\/li>/,
`<li><strong>The Chase Travel Portal & Points Boost</strong>: Before transferring points to a partner, check the cash price of the flight or hotel in the Chase Portal. Look for active Points Boost offers on your account. If a flight or hotel is eligible for a 1.5¢ or 2.0¢ boost, booking it directly might cost fewer points than using a transfer partner's award chart. (Use our <a href="/en/calculators/points-vs-cash/">Points vs Cash Calculator</a> to verify the math).</li>`);

html = html.replace(/<li><strong>Airline & Hotel Transfer Partners \(Potentially 2\.0¢\+\)<\/strong>: Transferring 1:1 to partners like World of Hyatt, United MileagePlus, or Air France\/KLM Flying Blue is how you unlock outsized value. This is especially true for luxury hotel stays and international business class flights.<\/li>/,
`<li><strong>Airline & Hotel Transfer Partners (Potentially 2.0¢+)</strong>: Transferring to partners like United MileagePlus, Air France/KLM Flying Blue, or World of Hyatt is typically how you unlock outsized value. Note that while historically all transfers were 1:1, recent changes mean some transfers (like Hyatt for certain newer accounts) may operate on a 4:3 ratio. Always verify the exact transfer ratio in your Chase portal before proceeding.</li>`);

fs.writeFileSync('src/en/values/chase-ultimate-rewards.md', html);
