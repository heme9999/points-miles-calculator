const fs = require('fs');
let html = fs.readFileSync('src/en/values/chase-ultimate-rewards.md', 'utf8');

html = html.replace('<h2>Crucial Transfer Rules</h2>', '<h2>Key Considerations for Partner Transfers</h2>');
html = html.replace('Check Availability First', 'Always Confirm Award Availability');
html = html.replace('never transfer points speculatively. Always ensure the specific award flight or hotel night is available to book on the partner\'s website.', 
'Do not move your UR points without a concrete plan. Make certain that the exact award space you want is open for booking on the partner airline or hotel portal.');
html = html.replace('Once you transfer Chase points to an airline or hotel program, the transfer is <strong>strictly one-way and cannot be reversed</strong>.', 
'Moving Ultimate Rewards to a partner program is a one-way street. The process cannot be undone under any circumstances, so proceed with caution.');
html = html.replace('Calculate the Final Cost', 'Verify the Exact Transfer Amount');
html = html.replace('If you are relying on a limited-time transfer bonus, use our <a href="/en/calculators/transfer-bonus/">Transfer Bonus Calculator</a> to ensure you don\'t transfer more points than absolutely necessary.',
'When taking advantage of promotional transfer bonuses, run the numbers through our <a href="/en/calculators/transfer-bonus/">Transfer Bonus Calculator</a> to precisely determine how many UR points to send.');

html = html.replace('<h2>Data Sources and Last Fact-Checked</h2>', '<h2>Reference Data and Fact-Checking</h2>');
html = html.replace('<ul>\n  <li><strong>[Editorial] TPG Monthly Valuations</strong>: <a href="https://thepointsguy.com/guide/monthly-valuations/" target="_blank" rel="noopener">Baseline Value (2.0¢)</a></li>\n  <li><strong>[Official] Chase Rewards Program</strong>: <a href="https://ultimaterewardspoints.chase.com/" target="_blank" rel="noopener">Chase Ultimate Rewards Portal</a></li>\n</ul>',
'<ul>\n  <li><strong>Editorial Estimates (e.g. TPG)</strong>: <a href="https://thepointsguy.com/guide/monthly-valuations/" target="_blank" rel="noopener">Usually around 2.0¢ per point</a></li>\n  <li><strong>Official Portal Information</strong>: <a href="https://ultimaterewardspoints.chase.com/" target="_blank" rel="noopener">Direct from Chase</a></li>\n</ul>');

fs.writeFileSync('src/en/values/chase-ultimate-rewards.md', html);
