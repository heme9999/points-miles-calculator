const fs = require('fs');

const targets = [
  '/en/calculators/points-vs-cash/',
  '/en/calculators/cents-per-point/',
  '/en/calculators/points-to-dollars/',
  '/en/calculators/transfer-bonus/'
];

const cp = require('child_process');
const htmlFiles = cp.execSync('find _site/en -name "*.html"').toString().trim().split('\n');

let linkCounts = {};
targets.forEach(t => linkCounts[t] = 0);

htmlFiles.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  targets.forEach(target => {
    // simple count of href="target"
    const count = (html.match(new RegExp(`href=["']${target}["']`, 'g')) || []).length;
    linkCounts[target] += count;
  });
});

let failed = false;
targets.forEach(target => {
  console.log(`${target} has ${linkCounts[target]} internal links.`);
  if (linkCounts[target] < 5) {
    console.error(`[FAIL] ${target} has less than 5 links!`);
    failed = true;
  }
});

if (failed) process.exit(1);
