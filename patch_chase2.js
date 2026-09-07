const fs = require('fs');

let html = fs.readFileSync('src/en/values/chase-ultimate-rewards.md', 'utf8');

html = html.replace('<h2>Crucial Transfer Rules</h2>', '<h2>Important Guidelines Before Transferring</h2>');
html = html.replace('Check Availability First', 'Confirm Inventory Prior to Transfer');
html = html.replace('Irreversible Transfers', 'Transfers Are Final');
html = html.replace('Calculate the Final Cost', 'Verify the Required Amount');
html = html.replace('Never transfer points speculatively. Always ensure the specific award flight or hotel night is available to book on the partner\'s website.', 
'Do not move your UR points without a concrete plan. Make certain that the exact award space you want is open for booking on the partner airline or hotel portal.');
html = html.replace('Once you transfer Chase points to an airline or hotel program, the transfer is <strong>strictly one-way and cannot be reversed</strong>.', 
'Moving Ultimate Rewards to a partner program is a one-way street. The process cannot be undone under any circumstances, so proceed with caution.');

fs.writeFileSync('src/en/values/chase-ultimate-rewards.md', html);
