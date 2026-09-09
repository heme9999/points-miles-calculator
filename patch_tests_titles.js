const fs = require('fs');
const files = ['test_production.js', 'verify_production_live.js', 'scripts/test_sitemap_strict.js', 'scripts/test_intent_mapping.js'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let file = fs.readFileSync(f, 'utf8');
    
    // Patch EN Homepage Title
    file = file.replace(/Points to Miles Converter & Award Travel Calculators/g, "Points to Miles & Award Calculators");
    
    // Patch EN Points to Dollars Title
    file = file.replace(/Miles to Dollars Calculator \| Points to Dollars/g, "Miles to Dollars Calculator");
    
    fs.writeFileSync(f, file);
    console.log(`Patched ${f}`);
  }
});
