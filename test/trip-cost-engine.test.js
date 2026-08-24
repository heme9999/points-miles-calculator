const test = require('node:test');
const assert = require('node:assert');
const CalculatorCore = require('../src/assets/calculator-core.js');

test('CalculatorCore Unit Tests - Trip Cost After Points Engine', async (t) => {

  await t.test('1. Pure cash trip (No points applied)', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'USD',
      tripDays: 7,
      adults: 2,
      children: 1,
      expenses: {
        flights: 1200,
        hotel: 1400,
        dining: 700,
        transit: 200,
        carRental: 300,
        parkingTolls: 100,
        activities: 400,
        visaInsurance: 150,
        connectivity: 50,
        other: 100
      },
      flightRedemption: { enabled: false },
      hotelRedemption: { enabled: false }
    });

    assert.strictEqual(res.cashTripCost, 4600);
    assert.strictEqual(res.finalOutOfPocket, 4600);
    assert.strictEqual(res.totalSavings, 0);
    assert.strictEqual(res.pointsCoverageRate, 0);
    assert.strictEqual(res.perPersonCashFinal, 4600 / 3);
    assert.strictEqual(res.dailyCashFinal, 4600 / 7);
    assert.strictEqual(res.flight.enabled, false);
    assert.strictEqual(res.hotel.enabled, false);
  });

  await t.test('2. Airline miles only redemption', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'USD',
      tripDays: 10,
      adults: 2,
      children: 0,
      expenses: {
        flights: 2000,
        hotel: 1500,
        dining: 800,
        transit: 100
      },
      flightRedemption: {
        enabled: true,
        milesNeeded: 80000,
        awardTaxes: 120,
        awardCashCopay: 0,
        milesBalance: 100000
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
    // CPP = (1880 / 80000) * 100 = 2.35 cents
    assert.strictEqual(res.flight.cpp.toFixed(2), '2.35');
    assert.strictEqual(res.flightBalanceSufficient, true);
    assert.strictEqual(res.flightVerdict, 'EXCELLENT_VALUE');
  });

  await t.test('3. Hotel points only redemption', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'USD',
      tripDays: 5,
      adults: 2,
      children: 0,
      expenses: {
        flights: 600,
        hotel: 1200,
        dining: 500
      },
      flightRedemption: { enabled: false },
      hotelRedemption: {
        enabled: true,
        pointsNeeded: 60000,
        awardTaxes: 40,
        resortFees: 150,
        hotelCashCopay: 0,
        pointsBalance: 50000 // Insufficient
      }
    });

    // Total cash = 600 + 1200 + 500 = 2300
    // Hotel out of pocket = 40 + 150 = 190
    // Hotel net savings = 1200 - 190 = 1010
    // Final out of pocket = 2300 - 1200 + 190 = 1290
    assert.strictEqual(res.cashTripCost, 2300);
    assert.strictEqual(res.finalOutOfPocket, 1290);
    assert.strictEqual(res.totalSavings, 1010);
    // CPP = (1010 / 60000) * 100 = 1.683 cents
    assert.strictEqual(res.hotel.cpp.toFixed(2), '1.68');
    assert.strictEqual(res.hotelBalanceSufficient, false);
    assert.strictEqual(res.hotelVerdict, 'EXCELLENT_VALUE');
  });

  await t.test('4. Simultaneous flights and hotel points redemption', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'CNY',
      fxRate: 7.0,
      tripDays: 10,
      adults: 2,
      children: 1,
      expenses: {
        flights: 14000,
        hotel: 10500,
        dining: 5000,
        transit: 1500,
        activities: 3000
      },
      flightRedemption: {
        enabled: true,
        milesNeeded: 90000,
        awardTaxes: 1400, // 200 USD * 7.0
        awardCashCopay: 0
      },
      hotelRedemption: {
        enabled: true,
        pointsNeeded: 120000,
        awardTaxes: 0,
        resortFees: 1050, // 150 USD * 7.0
        hotelCashCopay: 0
      }
    });

    // Total cash = 14000 + 10500 + 5000 + 1500 + 3000 = 34000
    // Flight out of pocket = 1400. Flight net savings = 14000 - 1400 = 12600
    // Hotel out of pocket = 1050. Hotel net savings = 10500 - 1050 = 9450
    // Final cash = 34000 - 14000 - 10500 + 1400 + 1050 = 11950
    assert.strictEqual(res.cashTripCost, 34000);
    assert.strictEqual(res.finalOutOfPocket, 11950);
    assert.strictEqual(res.totalSavings, 22050);
    
    // Flight CPP in USD cents: (12600 CNY / 7.0 = 1800 USD) / 90000 * 100 = 2.0 cents
    assert.strictEqual(res.flight.cpp.toFixed(2), '2.00');
    // Hotel CPP in USD cents: (9450 CNY / 7.0 = 1350 USD) / 120000 * 100 = 1.125 cents
    assert.strictEqual(res.hotel.cpp.toFixed(2), '1.13');
  });

  await t.test('5. Negative net savings warning (Taxes higher than cash price)', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'USD',
      tripDays: 3,
      adults: 1,
      children: 0,
      expenses: {
        flights: 200,
        hotel: 300
      },
      flightRedemption: {
        enabled: true,
        milesNeeded: 25000,
        awardTaxes: 250, // Taxes > Cash price
        awardCashCopay: 0
      },
      hotelRedemption: { enabled: false }
    });

    assert.strictEqual(res.flight.isNegativeSavings, true);
    assert.strictEqual(res.flightVerdict, 'AVOID_NEGATIVE');
  });

  await t.test('6. Unit conversion & 10x/100x error guard', () => {
    // 1.5 cents / point
    const cnyPerPoint = CalculatorCore.convertUsdCentsToLocal(1.5, 'CNY', 7.0);
    // 1.5 / 100 * 7 = 0.105 CNY
    assert.strictEqual(cnyPerPoint.toFixed(3), '0.105');
    assert.notStrictEqual(cnyPerPoint, 1.5, 'Must not equate 1.5 cents to 1.5 RMB');
    assert.notStrictEqual(cnyPerPoint, 10.5, 'Must not have 100x error');

    // 0.6 cents / point
    const hotelCny = CalculatorCore.convertUsdCentsToLocal(0.6, 'CNY', 7.0);
    // 0.6 / 100 * 7 = 0.042 CNY
    assert.strictEqual(hotelCny.toFixed(3), '0.042');
  });

  await t.test('7. Safe handling of 0, negative, and invalid values', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'USD',
      tripDays: 0, // Should fallback to 1
      adults: -2,  // Should fallback to 1
      children: -5, // Should fallback to 0
      expenses: {
        flights: -500, // Safe parsed to 0
        hotel: 'invalid' // Safe parsed to 0
      }
    });

    assert.strictEqual(res.tripDays, 1);
    assert.strictEqual(res.totalTravelers, 1);
    assert.strictEqual(res.cashTripCost, 0);
    assert.strictEqual(res.finalOutOfPocket, 0);
  });

  await t.test('8. Currency formatting for CNY and USD', () => {
    assert.strictEqual(CalculatorCore.formatCurrency(5250, 'CNY', 'zh'), '¥5,250');
    assert.strictEqual(CalculatorCore.formatCurrency(750, 'USD', 'en'), '$750');
  });
});
