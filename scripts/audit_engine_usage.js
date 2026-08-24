const fs = require('fs');
const path = require('path');

const calculators = [
  { name: 'Trip Cost After Points (ZH)', file: 'src/calculators/trip-cost-after-points.njk' },
  { name: 'Trip Cost After Points (EN)', file: 'src/en/calculators/trip-cost-after-points.njk' },
  { name: 'Transfer Bonus (ZH)', file: 'src/calculators/transfer-bonus.njk' },
  { name: 'Transfer Bonus (EN)', file: 'src/en/calculators/transfer-bonus.njk' },
  { name: 'Points vs Cash (ZH)', file: 'src/calculators/points-vs-cash.njk' },
  { name: 'Points vs Cash (EN)', file: 'src/en/calculators/points-vs-cash.njk' },
  { name: 'Cents Per Point (ZH)', file: 'src/calculators/cents-per-point.njk' },
  { name: 'Cents Per Point (EN)', file: 'src/en/calculators/cents-per-point.njk' },
  { name: 'Points to Dollars (ZH)', file: 'src/calculators/points-to-dollars.njk' },
  { name: 'Points to Dollars (EN)', file: 'src/en/calculators/points-to-dollars.njk' },
  { name: 'Buy Points (ZH)', file: 'src/examples/buy-points-100-percent-bonus.md' },
  { name: 'Buy Points (EN)', file: 'src/en/examples/buy-points-100-percent-bonus.md' },
  { name: 'Hotel Points vs Cash (ZH)', file: 'src/examples/hotel-points-vs-cash.md' },
  { name: 'Hotel Points vs Cash (EN)', file: 'src/en/examples/hotel-points-vs-cash.md' }
];

console.log('=== CALCULATOR CORE SHARED ENGINE AUDIT ===\n');

const auditResults = [];

calculators.forEach(calc => {
  const fullPath = path.join(__dirname, '..', calc.file);
  if (!fs.existsSync(fullPath)) {
    console.log(`[NOT FOUND] ${calc.name}: ${calc.file}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const loadsScript = content.includes('/assets/calculator-core.js');
  
  const methodsCalled = [];
  if (content.includes('calculateTransferRequirement')) methodsCalled.push('calculateTransferRequirement');
  if (content.includes('calculateTripCostAfterPoints')) methodsCalled.push('calculateTripCostAfterPoints');
  if (content.includes('calculateCPP')) methodsCalled.push('calculateCPP');
  if (content.includes('convertUsdCentsToLocal')) methodsCalled.push('convertUsdCentsToLocal');
  if (content.includes('calculateFlightPointsSavings')) methodsCalled.push('calculateFlightPointsSavings');
  if (content.includes('calculateHotelPointsSavings')) methodsCalled.push('calculateHotelPointsSavings');

  const status = loadsScript && methodsCalled.length > 0
    ? 'MIGRATED (Fully Shared)'
    : (loadsScript ? 'PARTIALLY LOADED' : 'INLINE / INDEPENDENT SCRIPT');

  auditResults.push({
    name: calc.name,
    file: calc.file,
    loadsScript,
    methodsCalled,
    status
  });

  console.log(`[${status}] ${calc.name}`);
  console.log(`  File: ${calc.file}`);
  console.log(`  Loads calculator-core.js: ${loadsScript ? 'YES' : 'NO'}`);
  console.log(`  Methods Called: ${methodsCalled.length > 0 ? methodsCalled.join(', ') : 'None'}`);
  console.log('');
});

module.exports = auditResults;
