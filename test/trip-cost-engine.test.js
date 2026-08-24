const test = require('node:test');
const assert = require('node:assert');
const CalculatorCore = require('../src/assets/calculator-core.js');

test('CalculatorCore Unit Tests - Comprehensive Suite', async (t) => {

  await t.test('Scenario A: Partial airline balance (60k required, 10k balance, 20% bonus, 42k bank balance)', () => {
    const res = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      airlineMilesBalance: 10000,
      baseTransferRatio: 1.0,
      transferBonusPercent: 20,
      transferIncrement: 1000,
      transferablePointsBalance: 42000
    });

    assert.strictEqual(res.remainingMilesNeeded, 50000);
    assert.strictEqual(Math.round(res.rawBankPointsNeeded * 100) / 100, 41666.67);
    assert.strictEqual(res.bankPointsNeeded, 42000);
    assert.strictEqual(res.milesReceived, 50400);
    assert.strictEqual(res.projectedAirlineMiles, 60400);
    assert.strictEqual(res.excessMilesAfterTransfer, 400);
    assert.strictEqual(res.bankBalanceSufficient, true);
    assert.strictEqual(res.airlineBalanceBeforeTransferSufficient, false);
    assert.strictEqual(res.airlineBalanceAfterTransferSufficient, true);
  });

  await t.test('Scenario B: Airline miles already sufficient (60k required, 70k balance)', () => {
    const res = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      airlineMilesBalance: 70000,
      baseTransferRatio: 1.0,
      transferBonusPercent: 20,
      transferIncrement: 1000
    });

    assert.strictEqual(res.remainingMilesNeeded, 0);
    assert.strictEqual(res.bankPointsNeeded, 0);
    assert.strictEqual(res.milesReceived, 0);
    assert.strictEqual(res.excessMilesAfterTransfer, 10000);
    assert.strictEqual(res.airlineBalanceBeforeTransferSufficient, true);
    assert.strictEqual(res.airlineBalanceAfterTransferSufficient, true);
  });

  await t.test('Scenario C: Bank balance short by 1 point (42k needed, 41999 balance)', () => {
    const res = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      airlineMilesBalance: 10000,
      baseTransferRatio: 1.0,
      transferBonusPercent: 20,
      transferIncrement: 1000,
      transferablePointsBalance: 41999
    });

    assert.strictEqual(res.bankPointsNeeded, 42000);
    assert.strictEqual(res.bankBalanceSufficient, false);
  });

  await t.test('Scenario D: Unspecified airline balance (null) calculates remaining as full award', () => {
    const res = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      airlineMilesBalance: null,
      baseTransferRatio: 1.0,
      transferBonusPercent: 20,
      transferIncrement: 1000
    });

    assert.strictEqual(res.airlineMilesBalance, null);
    assert.strictEqual(res.remainingMilesNeeded, 60000);
    assert.strictEqual(res.bankPointsNeeded, 50000);
    assert.strictEqual(res.milesReceived, 60000);
    assert.strictEqual(res.airlineBalanceBeforeTransferSufficient, false);
  });

  await t.test('Scenario E: Non 1:1 transfer ratios (0.5 and 2.0)', () => {
    // 50k remaining, ratio 0.5 (2 bank pts = 1 mile), 20% bonus -> multiplier = 0.6
    // 50000 / 0.6 = 83333.33 -> 84,000 bank points -> 84000 * 0.6 = 50,400 miles
    const resHalf = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      airlineMilesBalance: 10000,
      baseTransferRatio: 0.5,
      transferBonusPercent: 20,
      transferIncrement: 1000
    });
    assert.strictEqual(resHalf.bankPointsNeeded, 84000);
    assert.strictEqual(resHalf.milesReceived, 50400);

    // 50k remaining, ratio 2.0 (1 bank pt = 2 miles), 20% bonus -> multiplier = 2.4
    // 50000 / 2.4 = 20833.33 -> 21,000 bank points -> 21000 * 2.4 = 50,400 miles
    const resDouble = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      airlineMilesBalance: 10000,
      baseTransferRatio: 2.0,
      transferBonusPercent: 20,
      transferIncrement: 1000
    });
    assert.strictEqual(resDouble.bankPointsNeeded, 21000);
    assert.strictEqual(resDouble.milesReceived, 50400);
  });

  await t.test('Scenario F: Share URL parameters full round-trip verification', () => {
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
        awardMilesRequired: 60000,
        awardTaxes: 800,
        awardCashCopay: 0,
        airlineMilesBalance: 10000,
        baseTransferRatio: 1.0,
        transferBonusPercent: 20,
        transferIncrement: 1000,
        transferablePointsBalance: 42000
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
    assert.strictEqual(restoredState.flightRedemption.airlineMilesBalance, 10000);
    assert.strictEqual(restoredState.flightRedemption.baseTransferRatio, 1.0);
    assert.strictEqual(restoredState.flightRedemption.transferBonusPercent, 20);
    assert.strictEqual(restoredState.flightRedemption.transferIncrement, 1000);
    assert.strictEqual(restoredState.flightRedemption.transferablePointsBalance, 42000);

    const origTrans = CalculatorCore.calculateTransferRequirement(originalState.flightRedemption);
    const restTrans = CalculatorCore.calculateTransferRequirement(restoredState.flightRedemption);

    assert.strictEqual(origTrans.remainingMilesNeeded, restTrans.remainingMilesNeeded);
    assert.strictEqual(origTrans.bankPointsNeeded, restTrans.bankPointsNeeded);
    assert.strictEqual(origTrans.milesReceived, restTrans.milesReceived);
    assert.strictEqual(origTrans.projectedAirlineMiles, restTrans.projectedAirlineMiles);
    assert.strictEqual(origTrans.excessMilesAfterTransfer, restTrans.excessMilesAfterTransfer);
    assert.strictEqual(origTrans.bankBalanceSufficient, restTrans.bankBalanceSufficient);
  });

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

  await t.test('3. Ten itemized cash categories exact sum', () => {
    const exp = {
      flights: 3000, hotel: 2500, dining: 1200, transit: 300, carRental: 500,
      parkingTolls: 200, activities: 800, visaInsurance: 250, connectivity: 80, other: 170
    };
    const res = CalculatorCore.calculateCashTripCost(exp);
    assert.strictEqual(res.total, 9000);
    assert.strictEqual(res.breakdown.flights, 3000);
    assert.strictEqual(res.breakdown.hotel, 2500);
    assert.strictEqual(res.breakdown.other, 170);
  });

  await t.test('4. Airline miles only redemption', () => {
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

    assert.strictEqual(res.cashTripCost, 4400);
    assert.strictEqual(res.finalOutOfPocket, 2520);
    assert.strictEqual(res.totalSavings, 1880);
    assert.strictEqual(res.pointsCoverageRate, (1880 / 4400) * 100);
    assert.strictEqual(res.flight.cpp.toFixed(2), '2.35');
    assert.strictEqual(res.flight.enabled, true);
    assert.strictEqual(res.hotel.enabled, false);
  });

  await t.test('5. Hotel points only redemption', () => {
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

    assert.strictEqual(res.cashTripCost, 2300);
    assert.strictEqual(res.finalOutOfPocket, 1290);
    assert.strictEqual(res.totalSavings, 1010);
    assert.strictEqual(res.hotel.cpp.toFixed(2), '1.68');
    assert.strictEqual(res.hotel.hotelBalanceSufficient, false);
  });

  await t.test('6. Negative net savings warning when taxes exceed cash price', () => {
    const res = CalculatorCore.calculateTripCostAfterPoints({
      currency: 'USD',
      tripDays: 3,
      adults: 1,
      children: 0,
      expenses: { flights: 200, hotel: 300 },
      flightRedemption: {
        enabled: true,
        awardMilesRequired: 25000,
        awardTaxes: 250,
        awardCashCopay: 0
      },
      hotelRedemption: { enabled: false }
    });

    assert.strictEqual(res.flight.isNegativeSavings, true);
    assert.strictEqual(res.verdictCode, 'AVOID_DEFICIT');
  });

  await t.test('7. LocalStorage serialization and version migration', () => {
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

  await t.test('8. Safe handling of invalid, negative, NaN, and Infinity inputs', () => {
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

  await t.test('9. Transfer Bonus standalone calculation (airlineMilesBalance: 0)', () => {
    const res = CalculatorCore.calculateTransferRequirement({
      awardMilesRequired: 60000,
      baseTransferRatio: 1.0,
      transferBonusPercent: 20,
      transferIncrement: 1000,
      airlineMilesBalance: 0
    });

    assert.strictEqual(res.remainingMilesNeeded, 60000);
    assert.strictEqual(res.bankPointsNeeded, 50000);
    assert.strictEqual(res.milesReceived, 60000);
    assert.strictEqual(res.projectedAirlineMiles, 60000);
    assert.strictEqual(res.excessMilesAfterTransfer, 0);
  });

  await t.test('10. Transfer Bonus legacy param mapping equivalence', () => {
    const standardParams = { targetMiles: 60000, baseRatio: 1.0, bonusPercent: 20, increment: 1000 };
    const legacyParams = { req: 60000, ratio: 1.0, bonus: 20, inc: 1000 };

    const mappedFromLegacy = {
      awardMilesRequired: legacyParams.req,
      baseTransferRatio: legacyParams.ratio,
      transferBonusPercent: legacyParams.bonus,
      transferIncrement: legacyParams.inc,
      airlineMilesBalance: 0
    };

    const mappedFromStandard = {
      awardMilesRequired: standardParams.targetMiles,
      baseTransferRatio: standardParams.baseRatio,
      transferBonusPercent: standardParams.bonusPercent,
      transferIncrement: standardParams.increment,
      airlineMilesBalance: 0
    };

    const resLegacy = CalculatorCore.calculateTransferRequirement(mappedFromLegacy);
    const resStd = CalculatorCore.calculateTransferRequirement(mappedFromStandard);

    assert.deepStrictEqual(resLegacy, resStd);
    assert.strictEqual(resLegacy.bankPointsNeeded, 50000);
    assert.strictEqual(resLegacy.milesReceived, 60000);
  });

});
