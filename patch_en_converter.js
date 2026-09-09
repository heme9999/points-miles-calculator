const fs = require('fs');

let file = fs.readFileSync('src/en/calculators/points-to-miles-converter.njk', 'utf8');

// Fix 1: Draft text leak
file = file.replace(
  /You have 50,500 Marriott Bonvoy points and want to transfer them to United Airlines\. The ratio is 3:1 \(which means 0\.333 or technically 3 points = 1 mile\)\. Wait, the easiest way to represent 3:1 in our calculator is <code>0\.33333<\/code> or conceptually <code>1 point = 0\.333 miles<\/code>\. However, to be exact, let's look at Capital One to EVA Air which is 4:3 \(0\.75 ratio\)\. You have 50,500 Capital One miles\. Increment is 1,000\. Bonus is 0%\./,
  "Suppose you have 50,500 points and the selected partner uses a 4:3 transfer ratio, equivalent to 0.75 airline miles per bank point. With a 1,000-point transfer increment and no bonus, 50,000 points can be transferred for 37,500 miles, leaving 500 points in the account."
);

// Fix 2: Chase wording
file = file.replace(
  /While Chase and Bilt transfer strictly at 1:1, programs like American Express, Citi, and Capital One have exceptions\./,
  "Many transfers use a 1:1 ratio, but exceptions and account-specific transition rules exist. Always verify the live ratio shown in your rewards portal before transferring."
);

// Fix 3: "Transfers are Final" -> "Transfers are generally final and normally cannot be reversed."
file = file.replace(
  /Once you convert bank points to airline miles, the transaction cannot be reversed\./,
  "Transfers are generally final and normally cannot be reversed."
);

fs.writeFileSync('src/en/calculators/points-to-miles-converter.njk', file);
