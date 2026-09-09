const fs = require('fs');

const files = ['test_production.js', 'verify_production_live.js'];

files.forEach(f => {
  let file = fs.readFileSync(f, 'utf8');
  
  file = file.replace(
    /'Points and Miles Calculators \| Points & Miles Calculator'/g,
    "'Points to Miles & Award Calculators | Points & Miles Calculator'"
  );
  
  file = file.replace(
    /'Points to Dollars Calculator \| Miles Value \| Points & Miles Calculator'/g,
    "'Miles to Dollars Calculator | Points & Miles Calculator'"
  );
  
  file = file.replace(
    /'Points vs Cash Calculator \| Award Travel \| Points & Miles Calculator'/g,
    "'Points vs Cash Calculator | Points & Miles Calculator'"
  );

  fs.writeFileSync(f, file);
  console.log(`Patched titles in ${f}`);
});
