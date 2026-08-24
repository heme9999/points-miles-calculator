/**
 * Core Calculation Engine for Points & Miles Calculator (里程账)
 * Isomorphic module: usable in Node.js and Browser environments.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalculatorCore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const DEFAULT_FX_RATE = 7.0;

  /**
   * Safe number parser
   */
  function toNum(val, fallback = 0) {
    const n = parseFloat(val);
    return !isNaN(n) && isFinite(n) && n >= 0 ? n : fallback;
  }

  /**
   * Currency & Unit Conversions
   */
  function convertUsdCentsToLocal(usdCents, currency = 'USD', fxRate = DEFAULT_FX_RATE) {
    const cents = toNum(usdCents);
    const fx = toNum(fxRate, DEFAULT_FX_RATE);
    if (currency === 'CNY') {
      // 1.5 cents = 0.015 USD = 0.015 * fx CNY
      return (cents / 100) * fx;
    }
    return cents; // in cents for USD display
  }

  function convertLocalToUsd(amount, currency = 'USD', fxRate = DEFAULT_FX_RATE) {
    const a = toNum(amount);
    const fx = toNum(fxRate, DEFAULT_FX_RATE);
    if (currency === 'CNY') {
      return fx > 0 ? a / fx : 0;
    }
    return a;
  }

  /**
   * Cents Per Point (CPP) Calculation
   * Standard formula: (Net Savings in USD / Points Used) * 100
   * Supports positional args: (netSavingsLocal, pointsUsed, currency, fxRate)
   * or object arg: { netSavings, points, currency, fxRate }
   */
  function calculateCPP(netSavingsLocal, pointsUsed, currency = 'USD', fxRate = DEFAULT_FX_RATE) {
    let net = 0;
    let pts = 0;
    let curr = currency;
    let fx = fxRate;

    if (typeof netSavingsLocal === 'object' && netSavingsLocal !== null) {
      net = parseFloat(netSavingsLocal.netSavings || netSavingsLocal.netSavingsLocal) || 0;
      pts = parseFloat(netSavingsLocal.points || netSavingsLocal.pointsUsed) || 0;
      curr = netSavingsLocal.currency || 'USD';
      fx = toNum(netSavingsLocal.fxRate, DEFAULT_FX_RATE);
    } else {
      net = parseFloat(netSavingsLocal) || 0;
      pts = parseFloat(pointsUsed) || 0;
    }

    if (pts <= 0) return 0;
    
    let netUsd = net;
    if (curr === 'CNY') {
      const rate = toNum(fx, DEFAULT_FX_RATE);
      netUsd = rate > 0 ? net / rate : 0;
    }
    return (netUsd / pts) * 100;
  }

  /**
   * Local Currency Value Per Point
   */
  function calculateLocalPerPoint(netSavingsLocal, pointsUsed) {
    const net = parseFloat(netSavingsLocal) || 0;
    const pts = parseFloat(pointsUsed) || 0;
    if (pts <= 0) return 0;
    return net / pts;
  }

  /**
   * Itemized Cash Trip Cost Summing
   */
  function calculateCashTripCost(expenses = {}) {
    const flights = toNum(expenses.flights);
    const hotel = toNum(expenses.hotel);
    const dining = toNum(expenses.dining);
    const transit = toNum(expenses.transit);
    const carRental = toNum(expenses.carRental);
    const parkingTolls = toNum(expenses.parkingTolls);
    const activities = toNum(expenses.activities);
    const visaInsurance = toNum(expenses.visaInsurance);
    const connectivity = toNum(expenses.connectivity);
    const other = toNum(expenses.other);

    const total = flights + hotel + dining + transit + carRental + 
                  parkingTolls + activities + visaInsurance + connectivity + other;

    return {
      total: total,
      breakdown: {
        flights: flights,
        hotel: hotel,
        dining: dining,
        transit: transit,
        carRental: carRental,
        parkingTolls: parkingTolls,
        activities: activities,
        visaInsurance: visaInsurance,
        connectivity: connectivity,
        other: other
      }
    };
  }

  /**
   * Transfer Requirement & Bonus Engine
   */
  function calculateTransferRequirement(input = {}) {
    const awardMilesRequired = toNum(input.awardMilesRequired || input.milesNeeded);
    const baseRatio = input.baseTransferRatio !== undefined && input.baseTransferRatio !== '' ? parseFloat(input.baseTransferRatio) || 1.0 : 1.0;
    const bonusPercent = toNum(input.transferBonusPercent || input.bonusPercent);
    const increment = Math.max(1, parseInt(input.transferIncrement || input.increment, 10) || 1);

    const airlineMilesBalance = input.airlineMilesBalance !== undefined && input.airlineMilesBalance !== null && input.airlineMilesBalance !== ''
      ? toNum(input.airlineMilesBalance) : null;
    const transferablePointsBalance = input.transferablePointsBalance !== undefined && input.transferablePointsBalance !== null && input.transferablePointsBalance !== ''
      ? toNum(input.transferablePointsBalance) : null;

    const currentMiles = airlineMilesBalance !== null ? airlineMilesBalance : 0;
    const airlineBalanceBeforeTransferSufficient = airlineMilesBalance !== null ? (airlineMilesBalance >= awardMilesRequired) : false;

    if (awardMilesRequired <= 0) {
      return {
        awardMilesRequired: 0,
        airlineMilesBalance: airlineMilesBalance,
        remainingMilesNeeded: 0,
        baseTransferRatio: baseRatio,
        transferBonusPercent: bonusPercent,
        transferIncrement: increment,
        rawBankPointsNeeded: 0,
        bankPointsNeeded: 0,
        standardBankPointsNeeded: 0,
        bankPointsSaved: 0,
        milesReceived: 0,
        projectedAirlineMiles: currentMiles,
        excessMilesAfterTransfer: currentMiles,
        transferablePointsBalance: transferablePointsBalance,
        bankBalanceSufficient: true,
        airlineBalanceBeforeTransferSufficient: true,
        airlineBalanceAfterTransferSufficient: true
      };
    }

    const remainingMilesNeeded = Math.max(0, awardMilesRequired - currentMiles);
    const effectiveMultiplier = (baseRatio > 0 ? baseRatio : 1.0) * (1 + bonusPercent / 100);

    if (remainingMilesNeeded === 0) {
      const excessMiles = Math.max(0, currentMiles - awardMilesRequired);
      return {
        awardMilesRequired: awardMilesRequired,
        airlineMilesBalance: airlineMilesBalance,
        remainingMilesNeeded: 0,
        baseTransferRatio: baseRatio,
        transferBonusPercent: bonusPercent,
        transferIncrement: increment,
        rawBankPointsNeeded: 0,
        bankPointsNeeded: 0,
        standardBankPointsNeeded: 0,
        bankPointsSaved: 0,
        milesReceived: 0,
        projectedAirlineMiles: currentMiles,
        excessMilesAfterTransfer: excessMiles,
        transferablePointsBalance: transferablePointsBalance,
        bankBalanceSufficient: true,
        airlineBalanceBeforeTransferSufficient: true,
        airlineBalanceAfterTransferSufficient: true
      };
    }

    const rawBankPointsNeeded = effectiveMultiplier > 0 ? (remainingMilesNeeded / effectiveMultiplier) : remainingMilesNeeded;
    const bankPointsNeeded = Math.ceil(rawBankPointsNeeded / increment) * increment;

    const rawStandardNeeded = baseRatio > 0 ? (remainingMilesNeeded / baseRatio) : remainingMilesNeeded;
    const standardBankPointsNeeded = Math.ceil(rawStandardNeeded / increment) * increment;
    const bankPointsSaved = Math.max(0, standardBankPointsNeeded - bankPointsNeeded);

    const milesReceived = Math.round(bankPointsNeeded * effectiveMultiplier);
    const projectedAirlineMiles = currentMiles + milesReceived;
    const excessMilesAfterTransfer = Math.max(0, projectedAirlineMiles - awardMilesRequired);

    const bankBalanceSufficient = transferablePointsBalance !== null ? (transferablePointsBalance >= bankPointsNeeded) : null;
    const airlineBalanceAfterTransferSufficient = projectedAirlineMiles >= awardMilesRequired;

    return {
      awardMilesRequired: awardMilesRequired,
      airlineMilesBalance: airlineMilesBalance,
      remainingMilesNeeded: remainingMilesNeeded,
      baseTransferRatio: baseRatio,
      transferBonusPercent: bonusPercent,
      transferIncrement: increment,
      rawBankPointsNeeded: rawBankPointsNeeded,
      bankPointsNeeded: bankPointsNeeded,
      standardBankPointsNeeded: standardBankPointsNeeded,
      bankPointsSaved: bankPointsSaved,
      milesReceived: milesReceived,
      projectedAirlineMiles: projectedAirlineMiles,
      excessMilesAfterTransfer: excessMilesAfterTransfer,
      transferablePointsBalance: transferablePointsBalance,
      bankBalanceSufficient: bankBalanceSufficient,
      airlineBalanceBeforeTransferSufficient: airlineBalanceBeforeTransferSufficient,
      airlineBalanceAfterTransferSufficient: airlineBalanceAfterTransferSufficient
    };
  }

  /**
   * Flight Redemption Savings
   */
  function calculateFlightPointsSavings(input = {}, currency = 'USD', fxRate = DEFAULT_FX_RATE) {
    const cash = toNum(input.cashPrice || input.flightCashPrice || input.expFlights);
    const miles = toNum(input.awardMilesRequired || input.milesNeeded || input.flightMilesNeeded);
    const taxes = toNum(input.awardTaxes || input.flightAwardTaxes);
    const copay = toNum(input.awardCashCopay || input.flightAwardCopay);
    const enabled = Boolean(input.enabled !== false && cash > 0 && miles > 0);

    if (!enabled) {
      return {
        enabled: false,
        cashPrice: cash,
        milesNeeded: miles,
        awardTaxes: taxes,
        awardCashCopay: copay,
        outOfPocket: 0,
        netSavings: 0,
        isNegativeSavings: false,
        cpp: 0,
        localPerPoint: 0,
        bankPointsNeeded: 0,
        bankPointsSaved: 0,
        effectiveBankCpp: 0,
        transferDetails: null
      };
    }

    const outOfPocket = taxes + copay;
    const netSavings = cash - outOfPocket;
    const cpp = calculateCPP(netSavings, miles, currency, fxRate);
    const localPerPoint = calculateLocalPerPoint(netSavings, miles);

    // Transfer bonus integration with remaining miles
    const transferInput = {
      awardMilesRequired: miles,
      baseTransferRatio: input.baseTransferRatio,
      transferBonusPercent: input.transferBonusPercent,
      transferIncrement: input.transferIncrement,
      transferablePointsBalance: input.transferablePointsBalance,
      airlineMilesBalance: input.airlineMilesBalance
    };
    const transferDetails = calculateTransferRequirement(transferInput);

    const effectiveBankCpp = transferDetails.bankPointsNeeded > 0
      ? calculateCPP(netSavings, transferDetails.bankPointsNeeded, currency, fxRate)
      : 0;

    return {
      enabled: true,
      programName: input.programName || '',
      cashPrice: cash,
      milesNeeded: miles,
      awardTaxes: taxes,
      awardCashCopay: copay,
      outOfPocket: outOfPocket,
      netSavings: netSavings,
      isNegativeSavings: netSavings < 0,
      cpp: cpp,
      localPerPoint: localPerPoint,
      bankPointsNeeded: transferDetails.bankPointsNeeded,
      bankPointsSaved: transferDetails.bankPointsSaved,
      effectiveBankCpp: effectiveBankCpp,
      transferDetails: transferDetails
    };
  }

  /**
   * Hotel Redemption Savings
   */
  function calculateHotelPointsSavings(input = {}, currency = 'USD', fxRate = DEFAULT_FX_RATE) {
    const cash = toNum(input.cashPrice || input.hotelCashPrice || input.expHotel);
    const points = toNum(input.pointsNeeded || input.hotelPointsNeeded);
    const taxes = toNum(input.awardTaxes || input.hotelAwardTaxes);
    const resort = toNum(input.resortFees || input.hotelResortFees);
    const copay = toNum(input.hotelCashCopay || input.hotelCashCopay);
    const enabled = Boolean(input.enabled !== false && cash > 0 && points > 0);

    if (!enabled) {
      return {
        enabled: false,
        cashPrice: cash,
        pointsNeeded: points,
        awardTaxes: taxes,
        resortFees: resort,
        hotelCashCopay: copay,
        outOfPocket: 0,
        netSavings: 0,
        isNegativeSavings: false,
        cpp: 0,
        localPerPoint: 0
      };
    }

    const outOfPocket = taxes + resort + copay;
    const netSavings = cash - outOfPocket;
    const cpp = calculateCPP(netSavings, points, currency, fxRate);
    const localPerPoint = calculateLocalPerPoint(netSavings, points);

    const pointsBalance = input.pointsBalance !== undefined && input.pointsBalance !== null && input.pointsBalance !== ''
      ? toNum(input.pointsBalance) : null;
    const hotelBalanceSufficient = pointsBalance !== null ? (pointsBalance >= points) : null;

    return {
      enabled: true,
      programName: input.programName || '',
      cashPrice: cash,
      pointsNeeded: points,
      awardTaxes: taxes,
      resortFees: resort,
      hotelCashCopay: copay,
      outOfPocket: outOfPocket,
      netSavings: netSavings,
      isNegativeSavings: netSavings < 0,
      cpp: cpp,
      localPerPoint: localPerPoint,
      pointsBalance: pointsBalance,
      hotelBalanceSufficient: hotelBalanceSufficient
    };
  }

  /**
   * Comprehensive Trip Cost After Points Engine
   */
  function calculateTripCostAfterPoints(params = {}) {
    const data = params || {};
    const currency = data.currency === 'USD' ? 'USD' : 'CNY';
    const fxRate = toNum(data.fxRate, DEFAULT_FX_RATE);
    const tripDays = Math.max(1, parseInt(data.tripDays, 10) || 1);
    const adults = Math.max(1, parseInt(data.adults, 10) || 1);
    const children = Math.max(0, parseInt(data.children, 10) || 0);
    const totalTravelers = adults + children;

    // Itemized Cash Expenses
    const expenses = data.expenses || {};
    const cashResult = calculateCashTripCost(expenses);
    const cashTripCost = cashResult.total;
    const flightsCash = cashResult.breakdown.flights;
    const hotelCash = cashResult.breakdown.hotel;

    // Redemptions
    const flightRedemptionInput = Object.assign({}, data.flightRedemption, {
      cashPrice: flightsCash
    });
    const flightRes = calculateFlightPointsSavings(flightRedemptionInput, currency, fxRate);

    const hotelRedemptionInput = Object.assign({}, data.hotelRedemption, {
      cashPrice: hotelCash
    });
    const hotelRes = calculateHotelPointsSavings(hotelRedemptionInput, currency, fxRate);

    // Out of pocket calculation via explicit waterfall
    let finalOutOfPocket = cashTripCost;
    if (flightRes.enabled) {
      finalOutOfPocket = finalOutOfPocket - flightsCash + flightRes.outOfPocket;
    }
    if (hotelRes.enabled) {
      finalOutOfPocket = finalOutOfPocket - hotelCash + hotelRes.outOfPocket;
    }

    finalOutOfPocket = Math.max(0, finalOutOfPocket);
    const totalSavings = Math.max(0, cashTripCost - finalOutOfPocket);
    const pointsCoverageRate = cashTripCost > 0 ? Math.min(100, Math.max(0, (totalSavings / cashTripCost) * 100)) : 0;

    const perPersonCashOriginal = totalTravelers > 0 ? cashTripCost / totalTravelers : 0;
    const perPersonCashFinal = totalTravelers > 0 ? finalOutOfPocket / totalTravelers : 0;
    const dailyCashOriginal = tripDays > 0 ? cashTripCost / tripDays : 0;
    const dailyCashFinal = tripDays > 0 ? finalOutOfPocket / tripDays : 0;

    // Decision recommendation
    let verdictCode = 'ALL_CASH';
    let verdictTextZh = '纯现金出行';
    let verdictTextEn = 'All-Cash Trip';

    if (flightRes.isNegativeSavings || hotelRes.isNegativeSavings) {
      verdictCode = 'AVOID_DEFICIT';
      verdictTextZh = '部分项目不建议用分';
      verdictTextEn = 'Avoid Points on Deficit Items';
    } else if (flightRes.enabled || hotelRes.enabled) {
      verdictCode = 'USE_POINTS';
      verdictTextZh = '推荐使用积分';
      verdictTextEn = 'Points Redemption Recommended';
    }

    return {
      currency: currency,
      fxRate: fxRate,
      tripDays: tripDays,
      adults: adults,
      children: children,
      totalTravelers: totalTravelers,
      travelStyle: data.travelStyle || 'balanced',
      cashTripCost: cashTripCost,
      finalOutOfPocket: finalOutOfPocket,
      totalSavings: totalSavings,
      pointsCoverageRate: pointsCoverageRate,
      perPersonCashOriginal: perPersonCashOriginal,
      perPersonCashFinal: perPersonCashFinal,
      dailyCashOriginal: dailyCashOriginal,
      dailyCashFinal: dailyCashFinal,
      flight: flightRes,
      hotel: hotelRes,
      verdictCode: verdictCode,
      verdictTextZh: verdictTextZh,
      verdictTextEn: verdictTextEn,
      breakdown: cashResult.breakdown
    };
  }

  /**
   * Format Currency Helper
   */
  function formatCurrency(amount, currency = 'USD', lang = 'en') {
    const val = toNum(amount);
    if (currency === 'CNY') {
      return '¥' + val.toLocaleString(lang === 'zh' || lang === 'zh-CN' ? 'zh-CN' : 'en-US', {
        maximumFractionDigits: 0
      });
    }
    return '$' + val.toLocaleString('en-US', {
      maximumFractionDigits: 0
    });
  }

  /**
   * Unified State Normalizer
   */
  function normalizeTripState(raw = {}) {
    const currency = raw.currency === 'USD' ? 'USD' : 'CNY';
    const fxRate = Math.min(20, Math.max(1, toNum(raw.fxRate, DEFAULT_FX_RATE)));
    const tripDays = Math.min(365, Math.max(1, parseInt(raw.tripDays, 10) || 1));
    const adults = Math.min(50, Math.max(1, parseInt(raw.adults, 10) || 1));
    const children = Math.min(50, Math.max(0, parseInt(raw.children, 10) || 0));
    
    const validStyles = ['balanced', 'luxury', 'budget', 'family'];
    const travelStyle = validStyles.includes(raw.travelStyle) ? raw.travelStyle : 'balanced';

    const rawExp = raw.expenses || {};
    const expenses = {
      flights: Math.min(10000000, toNum(rawExp.flights || raw.expFlights || raw.fCash)),
      hotel: Math.min(10000000, toNum(rawExp.hotel || raw.expHotel || raw.hCash)),
      dining: Math.min(10000000, toNum(rawExp.dining || raw.expDining || raw.dCash)),
      transit: Math.min(10000000, toNum(rawExp.transit || raw.expTransit || raw.tCash)),
      carRental: Math.min(10000000, toNum(rawExp.carRental || raw.expCarRental || raw.carCash)),
      parkingTolls: Math.min(10000000, toNum(rawExp.parkingTolls || raw.expParkingTolls || raw.gasCash)),
      activities: Math.min(10000000, toNum(rawExp.activities || raw.expActivities || raw.actCash)),
      visaInsurance: Math.min(10000000, toNum(rawExp.visaInsurance || raw.expVisaInsurance || raw.visaCash)),
      connectivity: Math.min(10000000, toNum(rawExp.connectivity || raw.expConnectivity || raw.simCash)),
      other: Math.min(10000000, toNum(rawExp.other || raw.expOther || raw.othCash))
    };

    const rawFlight = raw.flightRedemption || {};
    const flightEnabled = rawFlight.enabled !== undefined ? Boolean(rawFlight.enabled)
      : (raw.enableFlightPoints !== undefined ? Boolean(raw.enableFlightPoints) : true);

    const flightRedemption = {
      enabled: flightEnabled,
      programName: String(rawFlight.programName || raw.flightProgramName || '').slice(0, 50),
      awardMilesRequired: Math.min(10000000, toNum(rawFlight.awardMilesRequired || raw.flightMilesNeeded || raw.fMiles)),
      awardTaxes: Math.min(10000000, toNum(rawFlight.awardTaxes || raw.flightAwardTaxes || raw.fTaxes)),
      awardCashCopay: Math.min(10000000, toNum(rawFlight.awardCashCopay || raw.flightAwardCopay || raw.fCopay)),
      airlineMilesBalance: (rawFlight.airlineMilesBalance !== undefined && rawFlight.airlineMilesBalance !== '' && rawFlight.airlineMilesBalance !== null) || (raw.flightMilesBalance !== undefined && raw.flightMilesBalance !== '' && raw.flightMilesBalance !== null)
        ? Math.min(10000000, toNum(rawFlight.airlineMilesBalance !== undefined ? rawFlight.airlineMilesBalance : raw.flightMilesBalance)) : null,
      baseTransferRatio: Math.min(10, Math.max(0.1, parseFloat(rawFlight.baseTransferRatio || raw.flightBaseTransferRatio || raw.fRatio) || 1.0)),
      transferBonusPercent: Math.min(500, Math.max(0, toNum(rawFlight.transferBonusPercent || raw.flightTransferBonus || raw.fBonus))),
      transferIncrement: Math.min(100000, Math.max(1, parseInt(rawFlight.transferIncrement || raw.flightTransferIncrement || raw.fInc, 10) || 1000)),
      transferablePointsBalance: (rawFlight.transferablePointsBalance !== undefined && rawFlight.transferablePointsBalance !== '' && rawFlight.transferablePointsBalance !== null) || (raw.flightTransferableBalance !== undefined && raw.flightTransferableBalance !== '' && raw.flightTransferableBalance !== null)
        ? Math.min(10000000, toNum(rawFlight.transferablePointsBalance !== undefined ? rawFlight.transferablePointsBalance : raw.flightTransferableBalance)) : null
    };

    const rawHotel = raw.hotelRedemption || {};
    const hotelEnabled = rawHotel.enabled !== undefined ? Boolean(rawHotel.enabled)
      : (raw.enableHotelPoints !== undefined ? Boolean(raw.enableHotelPoints) : true);

    const hotelRedemption = {
      enabled: hotelEnabled,
      programName: String(rawHotel.programName || raw.hotelProgramName || '').slice(0, 50),
      pointsNeeded: Math.min(10000000, toNum(rawHotel.pointsNeeded || raw.hotelPointsNeeded || raw.hPoints)),
      awardTaxes: Math.min(10000000, toNum(rawHotel.awardTaxes || raw.hotelAwardTaxes || raw.hTaxes)),
      resortFees: Math.min(10000000, toNum(rawHotel.resortFees || raw.hotelResortFees || raw.hResort)),
      hotelCashCopay: Math.min(10000000, toNum(rawHotel.hotelCashCopay || raw.hotelCashCopay || raw.hCopay)),
      pointsBalance: (rawHotel.pointsBalance !== undefined && rawHotel.pointsBalance !== '' && rawHotel.pointsBalance !== null) || (raw.hotelPointsBalance !== undefined && raw.hotelPointsBalance !== '' && raw.hotelPointsBalance !== null)
        ? Math.min(10000000, toNum(rawHotel.pointsBalance !== undefined ? rawHotel.pointsBalance : raw.hotelPointsBalance)) : null
    };

    return {
      origin: String(raw.origin || '').slice(0, 50),
      destination: String(raw.destination || '').slice(0, 50),
      tripDays: tripDays,
      adults: adults,
      children: children,
      currency: currency,
      fxRate: fxRate,
      travelStyle: travelStyle,
      expenses: expenses,
      flightRedemption: flightRedemption,
      hotelRedemption: hotelRedemption
    };
  }

  /**
   * Serialize Trip State to URL Search Params String
   */
  function serializeTripState(state = {}) {
    const s = normalizeTripState(state);
    const p = new URLSearchParams();

    p.set('currency', s.currency);
    if (s.fxRate !== DEFAULT_FX_RATE) p.set('fx', String(s.fxRate));
    if (s.origin) p.set('orig', s.origin);
    if (s.destination) p.set('dest', s.destination);
    p.set('days', String(s.tripDays));
    p.set('adults', String(s.adults));
    if (s.children > 0) p.set('children', String(s.children));
    if (s.travelStyle !== 'balanced') p.set('style', s.travelStyle);

    // Expenses (only serialize non-zero to keep URL concise)
    const expMap = [
      ['fCash', s.expenses.flights],
      ['hCash', s.expenses.hotel],
      ['dCash', s.expenses.dining],
      ['tCash', s.expenses.transit],
      ['carCash', s.expenses.carRental],
      ['gasCash', s.expenses.parkingTolls],
      ['actCash', s.expenses.activities],
      ['visaCash', s.expenses.visaInsurance],
      ['simCash', s.expenses.connectivity],
      ['othCash', s.expenses.other]
    ];
    expMap.forEach(([key, val]) => {
      if (val > 0) p.set(key, String(val));
    });

    // Flight redemption
    p.set('fEn', s.flightRedemption.enabled ? '1' : '0');
    if (s.flightRedemption.programName) p.set('fProg', s.flightRedemption.programName);
    if (s.flightRedemption.awardMilesRequired > 0) p.set('fMiles', String(s.flightRedemption.awardMilesRequired));
    if (s.flightRedemption.awardTaxes > 0) p.set('fTaxes', String(s.flightRedemption.awardTaxes));
    if (s.flightRedemption.awardCashCopay > 0) p.set('fCopay', String(s.flightRedemption.awardCashCopay));
    if (s.flightRedemption.airlineMilesBalance !== null) p.set('fBal', String(s.flightRedemption.airlineMilesBalance));
    if (s.flightRedemption.baseTransferRatio !== 1.0) p.set('fRatio', String(s.flightRedemption.baseTransferRatio));
    if (s.flightRedemption.transferBonusPercent > 0) p.set('fBonus', String(s.flightRedemption.transferBonusPercent));
    if (s.flightRedemption.transferIncrement !== 1000) p.set('fInc', String(s.flightRedemption.transferIncrement));
    if (s.flightRedemption.transferablePointsBalance !== null) p.set('fTransBal', String(s.flightRedemption.transferablePointsBalance));

    // Hotel redemption
    p.set('hEn', s.hotelRedemption.enabled ? '1' : '0');
    if (s.hotelRedemption.programName) p.set('hProg', s.hotelRedemption.programName);
    if (s.hotelRedemption.pointsNeeded > 0) p.set('hPoints', String(s.hotelRedemption.pointsNeeded));
    if (s.hotelRedemption.awardTaxes > 0) p.set('hTaxes', String(s.hotelRedemption.awardTaxes));
    if (s.hotelRedemption.resortFees > 0) p.set('hResort', String(s.hotelRedemption.resortFees));
    if (s.hotelRedemption.hotelCashCopay > 0) p.set('hCopay', String(s.hotelRedemption.hotelCashCopay));
    if (s.hotelRedemption.pointsBalance !== null) p.set('hBal', String(s.hotelRedemption.pointsBalance));

    return p.toString();
  }

  /**
   * Parse Search Params or Object to Trip State
   */
  function parseTripParams(searchParamsOrString) {
    let params;
    if (typeof searchParamsOrString === 'string') {
      const q = searchParamsOrString.includes('?') ? searchParamsOrString.split('?')[1] : searchParamsOrString;
      params = new URLSearchParams(q);
    } else if (searchParamsOrString instanceof URLSearchParams) {
      params = searchParamsOrString;
    } else {
      return normalizeTripState(searchParamsOrString);
    }

    const raw = {
      currency: params.get('currency'),
      fxRate: params.get('fx'),
      origin: params.get('orig'),
      destination: params.get('dest'),
      tripDays: params.get('days'),
      adults: params.get('adults'),
      children: params.get('children'),
      travelStyle: params.get('style'),
      expenses: {
        flights: params.get('fCash'),
        hotel: params.get('hCash'),
        dining: params.get('dCash'),
        transit: params.get('tCash'),
        carRental: params.get('carCash'),
        parkingTolls: params.get('gasCash'),
        activities: params.get('actCash'),
        visaInsurance: params.get('visaCash'),
        connectivity: params.get('simCash'),
        other: params.get('othCash')
      },
      flightRedemption: {
        enabled: params.has('fEn') ? params.get('fEn') === '1' : (params.has('fMiles') ? true : undefined),
        programName: params.get('fProg'),
        awardMilesRequired: params.get('fMiles'),
        awardTaxes: params.get('fTaxes'),
        awardCashCopay: params.get('fCopay'),
        airlineMilesBalance: params.get('fBal'),
        baseTransferRatio: params.get('fRatio'),
        transferBonusPercent: params.get('fBonus'),
        transferIncrement: params.get('fInc'),
        transferablePointsBalance: params.get('fTransBal')
      },
      hotelRedemption: {
        enabled: params.has('hEn') ? params.get('hEn') === '1' : (params.has('hPoints') ? true : undefined),
        programName: params.get('hProg'),
        pointsNeeded: params.get('hPoints'),
        awardTaxes: params.get('hTaxes'),
        resortFees: params.get('hResort'),
        hotelCashCopay: params.get('hCopay'),
        pointsBalance: params.get('hBal')
      }
    };

    return normalizeTripState(raw);
  }

  return {
    DEFAULT_FX_RATE: DEFAULT_FX_RATE,
    toNum: toNum,
    convertUsdCentsToLocal: convertUsdCentsToLocal,
    convertLocalToUsd: convertLocalToUsd,
    calculateCPP: calculateCPP,
    calculateLocalPerPoint: calculateLocalPerPoint,
    calculateCashTripCost: calculateCashTripCost,
    calculateTransferRequirement: calculateTransferRequirement,
    calculateFlightPointsSavings: calculateFlightPointsSavings,
    calculateHotelPointsSavings: calculateHotelPointsSavings,
    calculateTripCostAfterPoints: calculateTripCostAfterPoints,
    formatCurrency: formatCurrency,
    normalizeTripState: normalizeTripState,
    serializeTripState: serializeTripState,
    parseTripParams: parseTripParams
  };
}));
