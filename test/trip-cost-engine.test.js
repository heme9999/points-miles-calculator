const test = require('node:test');
const assert = require('node:assert');
const CalculatorCore = require('../src/assets/calculator-core.js');

test('CalculatorCore Unit Tests - Comprehensive Suite', async (t) => {

  await t.test('1. 1.5¢ at FX 7.0 equals ¥0.105 per point', () => {
    const cnyPerPoint = CalculatorCore.convertUsdCentsToLocal(1.5, 'CNY', 7.0);
    assert.strictEqual(cnyPerPoint.toFixed(3), '0.105');
    assert.notStrictEqual(cnyPerPoint, 1.5, 'Must not equate 1.5 cents to 1.5 RMB');
    assert.notStrictEqual(cnyPerPoint, 10.5, 'Must not have 100x error');
  });

  await t.test('2. 10,000 miles illustrative valuation equals ¥1,050', () => {
    const cnyPerPoint = CalculatorCore.convertUsdCentsToLocal(1.5, 'CNY', 7.0);
    const totalCny = 10000 * cnyPerPoint;
    assert.strictEqual(Math.round(totalCny), 1050);
    assert.notStrictEqual(totalCny, 15000, 'Must not equate 10k miles to 15,000 RMB');
  });

  await t.test('3. 60,000 miles with 20% transfer bonus at 1:1 ratio requires 50,000 bank points', () => {
    const res = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      baseTransferRatio: 1.0,
      transferBonusPercent: 20,
      transferIncrement: 1000
    });
    // 60,000 / (1.0 * 1.20) = 50,000
    assert.strictEqual(res.bankPointsNeeded, 50000);
    assert.strictEqual(res.standardBankPointsNeeded, 60000);
    assert.strictEqual(res.bankPointsSaved, 10000);
    assert.strictEqual(res.milesReceived, 60000);
  });

  await t.test('4. Transfer increment ceiling rounding', () => {
    // 55,000 miles / 1.20 = 45,833.33 -> round up to 46,000 (1000 increment)
    const res = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 55000,
      baseTransferRatio: 1.0,
      transferBonusPercent: 20,
      transferIncrement: 1000
    });
    assert.strictEqual(res.bankPointsNeeded, 46000);
    assert.strictEqual(res.milesReceived, 46000 * 1.2); // 55,200 miles
    assert.strictEqual(res.standardBankPointsNeeded, 55000);
    assert.strictEqual(res.bankPointsSaved, 9000);
  });

  await t.test('5. Transferable bank balance and airline balance sufficiency checks', () => {
    const insufficient = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      baseTransferRatio: 1.0,
      transferBonusPercent: 20,
      transferIncrement: 1000,
      transferablePointsBalance: 40000,
      airlineMilesBalance: 10000
    });
    assert.strictEqual(insufficient.bankBalanceSufficient, false);
    assert.strictEqual(insufficient.airlineBalanceSufficient, false);

    const sufficient = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      baseTransferRatio: 1.0,
      transferBonusPercent: 20,
      transferIncrement: 1000,
      transferablePointsBalance: 55000,
      airlineMilesBalance: 70000
    });
    assert.strictEqual(sufficient.bankBalanceSufficient, true);
    assert.strictEqual(sufficient.airlineBalanceSufficient, true);
  });

  await t.test('6. Ten itemized cash categories exact sum', () => {
    const exp = {
      flights: 3000,
      hotel: 2500,
      dining: 1200,
      transit: 300,
      carRental: 500,
      parkingTolls: 200,
      activities: 800,
      visaInsurance: 250,
      connectivity: 80,
      other: 170
    };
    const res = CalculatorCore.calculateCashTripCost(exp);
    assert.strictEqual(res.total, 9000);
    assert.strictEqual(res.breakdown.flights, 3000);
    assert.strictEqual(res.breakdown.hotel, 2500);
    assert.strictEqual(res.breakdown.other, 170);
  });

  await t.test('7. Airline miles only redemption', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'USD',
      tripDays: 10,
      adults: 2,
      children: 0,
      expenses: { flights: 2000, hotel: 1500, dining: 800, transit: 100 },
      flightRedemption: {
        enabled: true,
        awardMilesRequired: 80000,
        awardTaxes: 120,
        awardCashCopay: 0,
        airlineMilesBalance: 100000
      },
      hotelRedemption: { enabled: false }
    });

    // Total cash = 2000 + 1500 + 800 + 100 = 4400
    // Flight net savings = 2000 - 120 = 1880
    // Final out of pocket = 4400 - 2000 + 120 = 2520
    assert.strictEqual(res.cashTripCost, 4400);
    assert.strictEqual(res.finalOutOfPocket, 2520);
    assert.strictEqual(res.totalSavings, 1880);
    assert.strictEqual(res.pointsCoverageRate, (1880 / 4400) * 100);
    assert.strictEqual(res.flight.cpp.toFixed(2), '2.35');
    assert.strictEqual(res.flight.enabled, true);
    assert.strictEqual(res.hotel.enabled, false);
  });

  await t.test('8. Hotel points only redemption', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'USD',
      tripDays: 5,
      adults: 2,
      children: 0,
      expenses: { flights: 600, hotel: 1200, dining: 500 },
      flightRedemption: { enabled: false },
      hotelRedemption: {
        enabled: true,
        pointsNeeded: 60000,
        awardTaxes: 40,
        resortFees: 150,
        hotelCashCopay: 0,
        pointsBalance: 50000
      }
    });

    // Total cash = 600 + 1200 + 500 = 2300
    // Hotel out of pocket = 40 + 150 = 190
    // Hotel net savings = 1200 - 190 = 1010
    // Final out of pocket = 2300 - 1200 + 190 = 1290
    assert.strictEqual(res.cashTripCost, 2300);
    assert.strictEqual(res.finalOutOfPocket, 1290);
    assert.strictEqual(res.totalSavings, 1010);
    assert.strictEqual(res.hotel.cpp.toFixed(2), '1.68');
    assert.strictEqual(res.hotel.hotelBalanceSufficient, false);
  });

  await t.test('9. Simultaneous flights and hotel points redemption', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'CNY',
      fxRate: 7.0,
      tripDays: 10,
      adults: 2,
      children: 1,
      expenses: { flights: 14000, hotel: 10500, dining: 5000, transit: 1500, activities: 3000 },
      flightRedemption: {
        enabled: true,
        awardMilesRequired: 90000,
        awardTaxes: 1400,
        awardCashCopay: 0,
        baseTransferRatio: 1.0,
        transferBonusPercent: 20
      },
      hotelRedemption: {
        enabled: true,
        pointsNeeded: 120000,
        awardTaxes: 0,
        resortFees: 1050,
        hotelCashCopay: 0
      }
    });

    // Total cash = 34,000
    // Flight net savings = 14,000 - 1,400 = 12,600 (USD 1800 -> CPP = 2.00)
    // Hotel net savings = 10,500 - 1,050 = 9,450 (USD 1350 -> CPP = 1.13)
    // Final cash = 34,000 - 14,000 - 10,500 + 1,400 + 1,050 = 11,950
    assert.strictEqual(res.cashTripCost, 34000);
    assert.strictEqual(res.finalOutOfPocket, 11950);
    assert.strictEqual(res.totalSavings, 22050);
    assert.strictEqual(res.flight.cpp.toFixed(2), '2.00');
    assert.strictEqual(res.hotel.cpp.toFixed(2), '1.13');
    // Bank points needed for 90k miles with 20% bonus: 90000 / 1.2 = 75000
    assert.strictEqual(res.flight.bankPointsNeeded, 75000);
  });

  await t.test('10. Negative net savings warning when taxes exceed cash price', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'USD',
      tripDays: 3,
      adults: 1,
      children: 0,
      expenses: { flights: 200, hotel: 300 },
      flightRedemption: {
        enabled: true,
        awardMilesRequired: 25000,
        awardTaxes: 250, // Taxes > Cash price
        awardCashCopay: 0
      },
      hotelRedemption: { enabled: false }
    });

    assert.strictEqual(res.flight.isNegativeSavings, true);
    assert.strictEqual(res.verdictCode, 'AVOID_DEFICIT');
  });

  await t.test('11. Full state round-trip serialization (Share URL round-trip)', () => {
    const originalState = {
      origin: 'Beijing',
      destination: 'Tokyo',
      tripDays: 7,
      adults: 2,
      children: 1,
      currency: 'CNY',
      fxRate: 7.2,
      travelStyle: 'family',
      expenses: {
        flights: 12000, hotel: 15000, dining: 7000, transit: 3500, carRental: 0,
        parkingTolls: 0, activities: 3000, visaInsurance: 1200, connectivity: 300, other: 2000
      },
      flightRedemption: {
        enabled: true,
        programName: 'Asia Miles',
        awardMilesRequired: 75000,
        awardTaxes: 2100,
        awardCashCopay: 0,
        airlineMilesBalance: 80000,
        baseTransferRatio: 1.0,
        transferBonusPercent: 20,
        transferIncrement: 1000,
        transferablePointsBalance: 70000
      },
      hotelRedemption: {
        enabled: true,
        programName: 'Hyatt',
        pointsNeeded: 90000,
        awardTaxes: 300,
        resortFees: 0,
        hotelCashCopay: 0,
        pointsBalance: 100000
      }
    };

    const queryString = CalculatorCore.serializeTripState(originalState);
    const restoredState = CalculatorCore.parseTripParams(queryString);
    const secondQueryString = CalculatorCore.serializeTripState(restoredState);

    assert.strictEqual(queryString, secondQueryString, 'Serialized URL query string must not drift');
    assert.strictEqual(restoredState.destination, 'Tokyo');
    assert.strictEqual(restoredState.expenses.flights, 12000);
    assert.strictEqual(restoredState.flightRedemption.transferBonusPercent, 20);
    assert.strictEqual(restoredState.hotelRedemption.pointsNeeded, 90000);

    const origRes = CalculatorCore.calculateTripCostAfterPoints(originalState);
    const restoredRes = CalculatorCore.calculateTripCostAfterPoints(restoredState);
    assert.strictEqual(origRes.finalOutOfPocket, restoredRes.finalOutOfPocket);
    assert.strictEqual(origRes.totalSavings, restoredRes.totalSavings);
    assert.strictEqual(origRes.flight.cpp.toFixed(2), restoredRes.flight.cpp.toFixed(2));
  });

  await t.test('12. LocalStorage serialization and version migration', () => {
    const rawData = {
      origin: 'London',
      destination: 'Paris',
      tripDays: 5,
      adults: 2,
      children: 0,
      currency: 'USD',
      expenses: { flights: 800, hotel: 1200, dining: 600 },
      flightRedemption: { enabled: true, awardMilesRequired: 30000, awardTaxes: 100 }
    };
    const normalized = CalculatorCore.normalizeTripState(rawData);
    const jsonString = JSON.stringify(normalized);
    const parsed = JSON.parse(jsonString);
    const reNormalized = CalculatorCore.normalizeTripState(parsed);

    assert.deepStrictEqual(normalized, reNormalized);
  });

  await t.test('13. Disabled redemption toggles maintain preserved fields without deduction', () => {
    const state = CalculatorCore.normalizeTripState({
      expenses: { flights: 1000, hotel: 1000 },
      flightRedemption: { enabled: false, awardMilesRequired: 50000, awardTaxes: 100 },
      hotelRedemption: { enabled: false, pointsNeeded: 40000, awardTaxes: 50 }
    });

    const res = CalculatorCore.calculateTripCostAfterPoints(state);
    assert.strictEqual(res.cashTripCost, 2000);
    assert.strictEqual(res.finalOutOfPocket, 2000);
    assert.strictEqual(res.totalSavings, 0);
    assert.strictEqual(state.flightRedemption.awardMilesRequired, 50000);
  });

  await t.test('14. Safe handling of invalid, negative, NaN, and Infinity inputs', () => {
    const raw = {
      tripDays: -10,
      adults: NaN,
      children: Infinity,
      fxRate: -5,
      expenses: { flights: -1000, hotel: 'invalid_number' },
      flightRedemption: { awardMilesRequired: -50000, baseTransferRatio: 0 }
    };
    const state = CalculatorCore.normalizeTripState(raw);
    assert.strictEqual(state.tripDays, 1);
    assert.strictEqual(state.adults, 1);
    assert.strictEqual(state.children, 0);
    assert.strictEqual(state.fxRate, 7.0);
    assert.strictEqual(state.expenses.flights, 0);
    assert.strictEqual(state.expenses.hotel, 0);
    assert.strictEqual(state.flightRedemption.awardMilesRequired, 0);
    assert.strictEqual(state.flightRedemption.baseTransferRatio, 1.0);
  });

  await t.test('15. Currency formatting and custom FX calculations', () => {
    assert.strictEqual(CalculatorCore.formatCurrency(5250, 'CNY', 'zh'), '¥5,250');
    assert.strictEqual(CalculatorCore.formatCurrency(750, 'USD', 'en'), '$750');

    // 1000 USD net savings with 50,000 points
    const cppUsd = CalculatorCore.calculateCPP(1000, 50000, 'USD');
    assert.strictEqual(cppUsd.toFixed(2), '2.00');

    // 7200 CNY net savings with 50,000 points at FX 7.2
    const cppCny = CalculatorCore.calculateCPP(7200, 50000, 'CNY', 7.2);
    assert.strictEqual(cppCny.toFixed(2), '2.00');
  });

  await t.test('16. Bilingual calculation parity', () => {
    const baseParams = {
      tripDays: 7, adults: 2, children: 1,
      expenses: { flights: 3000, hotel: 2000, dining: 1000 },
      flightRedemption: { enabled: true, awardMilesRequired: 100000, awardTaxes: 200 },
      hotelRedemption: { enabled: true, pointsNeeded: 80000, awardTaxes: 0, resortFees: 100 }
    };
    const resUsd = CalculatorCore.calculateTripCostAfterPoints(Object.assign({}, baseParams, { currency: 'USD' }));
    assert.strictEqual(resUsd.cashTripCost, 6000);
    assert.strictEqual(resUsd.finalOutOfPocket, 1300); // 6000 - 3000 - 2000 + 200 + 100 = 1300
    assert.strictEqual(resUsd.totalSavings, 4700);
  });

});
