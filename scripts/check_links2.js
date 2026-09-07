const fs = require('fs');
const cp = require('child_process');

const targets = [
  '/en/calculators/points-vs-cash/',
  '/en/calculators/hotel-points-vs-cash/',
  '/en/values/amex-membership-rewards/',
  '/en/values/chase-ultimate-rewards/'
];

const htmlFiles = cp.execSync('find _site/en -name "*.html"').toString().trim().split('\n');

let inboundStats = {};
targets.forEach(t => inboundStats[t] = { total: 0, uniquePages: new Set() });

htmlFiles.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  targets.forEach(target => {
    // simple regex to find hrefs to target
    const regex = new RegExp(`href=["']${target}["']`, 'g');
    const matches = html.match(regex);
    if (matches && matches.length > 0) {
      inboundStats[target].total += matches.length;
      
      // Check if it's a contextual link (inside <article>, <main> or <div class="direct-answer"> etc, 
      // excluding <nav> or <footer>)
      // A simple heuristic: strip nav/footer and check if it's still there
      let contextualArea = html;
      contextualArea = contextualArea.replace(/<nav[\s\S]*?<\/nav>/gi, '');
      contextualArea = contextualArea.replace(/<footer[\s\S]*?<\/footer>/gi, '');
      contextualArea = contextualArea.replace(/class="reads"[\s\S]*?<\/div>/gi, ''); // Exclude "Explore Additional Resources" block if we want strictly inline text, but the prompt said "唯一正文上下文入口数"
      
      if (contextualArea.match(regex)) {
         inboundStats[target].uniquePages.add(file);
      }
    }
  });
});

let failed = false;
targets.forEach(target => {
  const stats = inboundStats[target];
  console.log(`${target} has ${stats.total} total inbound links, and ${stats.uniquePages.size} unique contextual page sources.`);
  if (stats.uniquePages.size < 2) {
    console.error(`[FAIL] ${target} lacks sufficient unique contextual sources.`);
    failed = true;
  }
});

if (failed) process.exit(1);
