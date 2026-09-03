const fs = require('fs');
const path = require('path');

const targets = [
  { intent: 'points vs cash calculator', mainUrl: '/en/calculators/points-vs-cash/' },
  { intent: 'cents per point calculator', mainUrl: '/en/calculators/cents-per-point/' },
  { intent: 'points to dollars calculator', mainUrl: '/en/calculators/points-to-dollars/' },
  { intent: 'transfer bonus calculator', mainUrl: '/en/calculators/transfer-bonus/' }
];

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, filesList);
    } else if (filePath.endsWith('.html')) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

const files = getFiles('_site/en');
let failures = 0;

targets.forEach(target => {
  const keyword = target.intent.toLowerCase();
  console.log(`\nChecking intent: "${target.intent}"`);
  
  let h1Matches = [];
  let titleMatches = [];

  files.forEach(file => {
    const html = fs.readFileSync(file, 'utf8').toLowerCase();
    const url = '/' + file.replace('_site/', '').replace(/index\.html$/, '');
    
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/);
    if (h1Match && h1Match[1].includes(keyword)) {
      h1Matches.push(url);
    }

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    if (titleMatch && titleMatch[1].includes(keyword)) {
      titleMatches.push(url);
    }
  });

  console.log(`  H1 matches: ${h1Matches.join(', ')}`);
  console.log(`  Title matches: ${titleMatches.join(', ')}`);

  const competingH1 = h1Matches.filter(u => u !== target.mainUrl && u !== target.mainUrl.replace(/\/$/, ''));
  const competingTitle = titleMatches.filter(u => u !== target.mainUrl && u !== target.mainUrl.replace(/\/$/, '') && !u.includes('/en/') ); // Wait, '/en/' is the homepage. We don't want the homepage to compete. Wait, `!u.includes('/en/')` is wrong because ALL URLs here start with `/en/`.
  
  if (competingH1.length > 0) {
    console.error(`  [FAIL] Competing H1 found for "${keyword}" on: ${competingH1.join(', ')}`);
    failures++;
  }
  
  // Re-eval competing title logic
  const strictCompeteTitle = titleMatches.filter(u => u !== target.mainUrl && u !== target.mainUrl.replace(/\/$/, '') && u !== '/en/');
  if (strictCompeteTitle.length > 0) {
     console.error(`  [FAIL] Competing Title found for "${keyword}" on: ${strictCompeteTitle.join(', ')}`);
     failures++;
  }
});

if (failures > 0) {
  process.exit(1);
} else {
  console.log('\n[PASS] Intent mapping check passed!');
}
