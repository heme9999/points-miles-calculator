const fs = require('fs');

const content = `---
layout: base.njk
title: Chase Ultimate Rewards (UR) Points Value Guide
description: Learn how to maximize Chase Ultimate Rewards. Understand portal multipliers, transfer partners, and how your card product changes your points' value.
schemaType: Article
eyebrow: Valuations
breadcrumbs:
  - name: Points Valuations
    url: /en/values/
  - name: Chase UR
---
<h1>Chase Ultimate Rewards (UR) Points Value Guide</h1>
<p class="lead">Chase Ultimate Rewards (UR) is one of the most versatile and valuable credit card point currencies. Its unique structure means that the value of your points is heavily dependent on which specific Chase credit card you hold and which redemption path you choose.</p>

<h2>How Your Card Product Impacts Value</h2>
<p>Unlike some programs, Chase assigns a guaranteed minimum cash value to your points when you book travel through the Chase Travel Portal or use the "Pay Yourself Back" feature. However, this multiplier varies by card:</p>
<ul>
  <li><strong>Chase Sapphire Reserve®</strong>: Points are worth a fixed <strong>1.5¢</strong> each towards travel in the portal.</li>
  <li><strong>Chase Sapphire Preferred® & Ink Business Preferred®</strong>: Points are worth a fixed <strong>1.25¢</strong> each towards travel in the portal.</li>
  <li><strong>Chase Freedom® Family</strong>: On their own, these cards only offer <strong>1.0¢</strong> per point (effectively cash back). But if you hold a premium Sapphire or Ink card, you can combine your points to unlock the higher multipliers and transfer partners.</li>
</ul>
<p>While third-party editorial valuations (like TPG) often peg the theoretical value of Chase points around <strong>2.0¢ per point</strong>, your actual baseline is strictly defined by the card you carry.</p>

<h2>The Chase Redemption Decision Flow</h2>
<p>To maximize your Chase Ultimate Rewards, you have three distinct redemption paths. You should always compare them before booking:</p>
<ol>
  <li><strong>The Cash Equivalent (1.0¢)</strong>: Redeeming for statement credits or cash back provides a floor value of 1.0¢. This is the absolute minimum you should accept.</li>
  <li><strong>The Chase Travel Portal (1.25¢ - 1.5¢)</strong>: Before transferring points to a partner, check the cash price of the flight or hotel in the Chase Portal. If a flight is very cheap, booking it through the portal at 1.5¢ per point might cost fewer points than an airline's award chart. (Use our <a href="/en/calculators/points-vs-cash/">Points vs Cash Calculator</a> to do the math).</li>
  <li><strong>Airline & Hotel Transfer Partners (Potentially 2.0¢+)</strong>: Transferring 1:1 to partners like World of Hyatt, United MileagePlus, or Air France/KLM Flying Blue is how you unlock outsized value. This is especially true for luxury hotel stays and international business class flights.</li>
</ol>
<p>For a detailed breakdown of how this ecosystem compares to its main competitor, read our guide on <a href="/en/compare/capital-one-vs-chase/">Capital One Miles vs Chase Ultimate Rewards</a>.</p>

<h2>Crucial Transfer Rules</h2>
<p>When you decide that transferring to a partner offers the best value, keep these rules in mind:</p>
<ul>
  <li><strong>Check Availability First</strong>: Never transfer points speculatively. Always ensure the specific award flight or hotel night is available to book on the partner's website.</li>
  <li><strong>Irreversible Transfers</strong>: Once you transfer Chase points to an airline or hotel program, the transfer is <strong>strictly one-way and cannot be reversed</strong>.</li>
  <li><strong>Calculate the Final Cost</strong>: If you are relying on a limited-time transfer bonus, use our <a href="/en/calculators/transfer-bonus/">Transfer Bonus Calculator</a> to ensure you don't transfer more points than absolutely necessary.</li>
</ul>

<h2>Data Sources and Last Fact-Checked</h2>
<ul>
  <li><strong>[Editorial] TPG Monthly Valuations</strong>: <a href="https://thepointsguy.com/guide/monthly-valuations/" target="_blank" rel="noopener">Baseline Value (2.0¢)</a></li>
  <li><strong>[Official] Chase Rewards Program</strong>: <a href="https://ultimaterewardspoints.chase.com/" target="_blank" rel="noopener">Chase Ultimate Rewards Portal</a></li>
</ul>
<p class="disclaimer"><em>Last Fact-Checked: September 2026. Editorial Disclaimer: Valuations are estimates for educational purposes and do not constitute financial advice. Third-party valuations are not real-time or guaranteed.</em></p>
`;
fs.writeFileSync('src/en/values/chase-ultimate-rewards.md', content);
