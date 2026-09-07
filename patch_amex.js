const fs = require('fs');

const content = `---
layout: base.njk
title: Amex Membership Rewards (MR) Points Value Guide
description: Maximize your Amex Membership Rewards points. Learn the best transfer partners, airline vs hotel valuations, and how to avoid the excise tax.
schemaType: Article
eyebrow: Valuations
breadcrumbs:
  - name: Points Valuations
    url: /en/values/
  - name: Amex MR
---
<h1>Amex Membership Rewards (MR) Points Value Guide</h1>
<p class="lead">Amex Membership Rewards (MR) is American Express's flexible credit card rewards program. Unlike cashback programs with fixed values, the immense value of MR points comes entirely from how you utilize its massive network of airline and hotel transfer partners.</p>

<h2>The True Value of Amex Points</h2>
<p>There is no official fixed cash value for Amex points. The generally accepted baseline value for Amex Membership Rewards is around <strong>2.0¢ per point</strong>, based on third-party estimates from major travel media outlets (like TPG or OMAAT). However, <em>your</em> actual value depends on exactly how you redeem them.</p>

<p>It is crucial to understand the difference between <strong>valuation scenarios</strong> (a theoretical average) and <strong>actual CPP (Cents Per Point)</strong> (the exact value of a specific ticket). When you actually redeem your points, the value you get will fall into one of three distinct categories:</p>
<ul>
  <li><strong>Sub-optimal Redemptions (Below 1.0¢)</strong>: Redeeming for statement credits, shopping at Amazon, or paying with points at checkout usually yields poor value (often 0.6¢ - 0.7¢). This is generally not recommended.</li>
  <li><strong>Standard Partner Transfers (1.2¢ - 2.0¢)</strong>: Transferring points to book domestic economy flights or mid-tier international flights. This is the most common use case and justifies earning the points.</li>
  <li><strong>Outsized Value (Above 2.0¢)</strong>: Transferring points for long-haul international First or Business Class tickets. This is where the true power of Amex points lies, often exceeding 4.0¢ or more per point.</li>
</ul>

<h2>Airline vs. Hotel Transfer Partners</h2>
<p>Amex Membership Rewards has both airline and hotel partners, but they are not created equal:</p>
<ul>
  <li><strong>Airline Partners</strong>: Transferring to programs like Air Canada Aeroplan, British Airways, or ANA Mileage Club is generally the best path to high-value redemptions. (Read our <a href="/en/guides/transfer-bonus-calculator-guide/">guide on points transfer bonuses</a> to stretch these even further).</li>
  <li><strong>Hotel Partners</strong>: While you can transfer MR points to Marriott Bonvoy or Hilton Honors, hotel points are typically valued at less than 1.0¢ each. Unless there is a massive transfer bonus or an urgent need to top off an account for a specific stay, transferring Amex points to hotels is often a poor mathematical proposition.</li>
</ul>

<h2>The Amex Redemption Decision Flow</h2>
<p>Before you use your Membership Rewards, follow this recommended decision path:</p>
<ol>
  <li><strong>Search Award Availability</strong>: Never transfer points speculatively. Always confirm the award seat or hotel room is actually available to book using points on the partner's website.</li>
  <li><strong>Calculate the Math</strong>: Compare the cash price (including taxes) against the points required. Use our <a href="/en/calculators/points-vs-cash/">Advanced Points vs Cash Calculator</a> to determine your exact CPP.</li>
  <li><strong>Evaluate the Excise Tax Offset Fee</strong>: If transferring to a U.S. domestic airline (like Delta or JetBlue), American Express charges a small excise tax offset fee. Factor this cash cost into your calculations.</li>
  <li><strong>Execute the Transfer</strong>: Amex transfers are <strong>strictly irreversible</strong>. Once points leave your Amex account, they cannot be returned.</li>
</ol>
<p>If you're unsure which credit card ecosystem is right for you, check out our comparison of <a href="/en/compare/chase-ur-vs-amex-mr/">Chase Ultimate Rewards vs Amex Membership Rewards</a>.</p>

<h2>Data Sources and Last Fact-Checked</h2>
<ul>
  <li><strong>[Editorial] TPG Monthly Valuations</strong>: <a href="https://thepointsguy.com/guide/monthly-valuations/" target="_blank" rel="noopener">Baseline Value (2.0¢)</a></li>
  <li><strong>[Editorial] OMAAT Value Guide</strong>: <a href="https://onemileatatime.com/guides/value-frequent-flyer-miles/" target="_blank" rel="noopener">Baseline Value (1.7¢)</a></li>
  <li><strong>[Official] Amex Official Rules</strong>: <a href="https://www.americanexpress.com/en-us/rewards/membership-rewards/" target="_blank" rel="noopener">Transfer Ratios</a></li>
</ul>
<p class="disclaimer"><em>Last Fact-Checked: September 2026. Editorial Disclaimer: Valuations are estimates for educational purposes and do not constitute financial advice. Third-party valuations are not real-time or guaranteed.</em></p>
`;
fs.writeFileSync('src/en/values/amex-membership-rewards.md', content);
