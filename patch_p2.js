const fs = require('fs');
let html = fs.readFileSync('src/en/values/chase-ultimate-rewards.md', 'utf8');

html = html.replace('This is the absolute minimum you should accept.', 'This is a common cash-equivalent baseline.');
html = html.replace('The process cannot be undone under any circumstances, so proceed with caution.', 'Transfers are generally final and normally cannot be reversed, so proceed with caution.');

fs.writeFileSync('src/en/values/chase-ultimate-rewards.md', html);
