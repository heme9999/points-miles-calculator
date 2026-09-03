const fs = require('fs');

let hotel = fs.readFileSync('src/en/calculators/hotel-points-vs-cash.njk', 'utf8');
hotel = hotel.replace('<h1>Hotel Points vs Cash Calculator</h1>', '<h1>Hotel Award Stay Calculator</h1>');
fs.writeFileSync('src/en/calculators/hotel-points-vs-cash.njk', hotel);

let guide = fs.readFileSync('src/en/guides/transfer-bonus-calculator-guide.md', 'utf8');
guide = guide.replace(/title:\s*.*?Transfer Bonus Calculator.*?$/m, 'title: How to Maximize Points Transfer Bonuses');
fs.writeFileSync('src/en/guides/transfer-bonus-calculator-guide.md', guide);

