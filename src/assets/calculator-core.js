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
   */
  function calculateCPP(netSavingsLocal, pointsUsed, currency = 'USD', fxRate = DEFAULT_FX_RATE) {
    const net = parseFloat(netSavingsLocal) || 0;
    const pts = parseFloat(pointsUsed) || 0;
    if (pts <= 0) return 0;
    
    let netUsd = net;
    if (currency === 'CNY') {
      const fx = toNum(fxRate, DEFAULT_FX_RATE);
      netUsd = fx > 0 ? net / fx : 0;
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
   * Flight Redemption Savings
   */
  function calculateFlightSavings(flightCashPrice, milesNeeded, awardTaxes, awardCashCopay = 0) {
    const cash = toNum(flightCashPrice);
    const miles = toNum(milesNeeded);
    const taxes = toNum(awardTaxes);
    const copay = toNum(awardCashCopay);

    if (cash <= 0 || miles <= 0) {
      return {
        enabled: false,
        cashPrice: cash,
        milesNeeded: miles,
        awardTaxes: taxes,
        awardCashCopay: copay,
        outOfPocket: 0,
        netSavings: 0,
        isNegativeSavings: false
      };
    }

    const outOfPocket = taxes + copay;
    const netSavings = cash - outOfPocket;

    return {
      enabled: true,
      cashPrice: cash,
      milesNeeded: miles,
      awardTaxes: taxes,
      awardCashCopay: copay,
      outOfPocket: outOfPocket,
      netSavings: netSavings,
      isNegativeSavings: netSavings < 0
    };
  }

  /**
   * Hotel Redemption Savings
   */
  function calculateHotelSavings(hotelCashPrice, pointsNeeded, awardTaxes = 0, resortFees = 0, hotelCashCopay = 0) {
    const cash = toNum(hotelCashPrice);
    const points = toNum(pointsNeeded);
    const taxes = toNum(awardTaxes);
    const resort = toNum(resortFees);
    const copay = toNum(hotelCashCopay);

    if (cash <= 0 || points <= 0) {
      return {
        enabled: false,
        cashPrice: cash,
        pointsNeeded: points,
        awardTaxes: taxes,
        resortFees: resort,
        hotelCashCopay: copay,
        outOfPocket: 0,
        netSavings: 0,
        isNegativeSavings: false
      };
    }

    const outOfPocket = taxes + resort + copay;
    const netSavings = cash - outOfPocket;

    return {
      enabled: true,
      cashPrice: cash,
      pointsNeeded: points,
      awardTaxes: taxes,
      resortFees: resort,
      hotelCashCopay: copay,
      outOfPocket: outOfPocket,
      netSavings: netSavings,
      isNegativeSavings: netSavings < 0
    };
  }

  /**
   * Comprehensive Trip Cost After Points Engine
   */
  function calculateTripCostAfterPoints(params) {
    const data = params || {};
    const currency = data.currency === 'USD' ? 'USD' : 'CNY';
    const fxRate = toNum(data.fxRate, DEFAULT_FX_RATE);
    const tripDays = Math.max(1, parseInt(data.tripDays, 10) || 1);
    const adults = Math.max(1, parseInt(data.adults, 10) || 1);
    const children = Math.max(0, parseInt(data.children, 10) || 0);
    const totalTravelers = adults + children;

    // Itemized Cash Expenses
    const expenses = data.expenses || {};
    const flightsCash = toNum(expenses.flights);
    const hotelCash = toNum(expenses.hotel);
    const diningCash = toNum(expenses.dining);
    const transitCash = toNum(expenses.transit);
    const carRentalCash = toNum(expenses.carRental);
    const parkingTollsCash = toNum(expenses.parkingTolls);
    const activitiesCash = toNum(expenses.activities);
    const visaInsuranceCash = toNum(expenses.visaInsurance);
    const connectivityCash = toNum(expenses.connectivity);
    const otherCash = toNum(expenses.other);

    const cashTripCost = flightsCash + hotelCash + diningCash + transitCash + 
                         carRentalCash + parkingTollsCash + activitiesCash + 
                         visaInsuranceCash + connectivityCash + otherCash;

    // Redemptions
    const flightRedemption = data.flightRedemption || {};
    const isFlightPointsActive = Boolean(flightRedemption.enabled && flightsCash > 0 && flightRedemption.milesNeeded > 0);
    
    let flightRes = { enabled: false, netSavings: 0, outOfPocket: 0, isNegativeSavings: false, cpp: 0, localPerPoint: 0 };
    if (isFlightPointsActive) {
      const fBase = calculateFlightSavings(
        flightsCash,
        flightRedemption.milesNeeded,
        flightRedemption.awardTaxes,
        flightRedemption.awardCashCopay
      );
      const fCpp = calculateCPP(fBase.netSavings, fBase.milesNeeded, currency, fxRate);
      const fLocal = calculateLocalPerPoint(fBase.netSavings, fBase.milesNeeded);
      flightRes = Object.assign({}, fBase, { cpp: fCpp, localPerPoint: fLocal });
    }

    const hotelRedemption = data.hotelRedemption || {};
    const isHotelPointsActive = Boolean(hotelRedemption.enabled && hotelCash > 0 && hotelRedemption.pointsNeeded > 0);

    let hotelRes = { enabled: false, netSavings: 0, outOfPocket: 0, isNegativeSavings: false, cpp: 0, localPerPoint: 0 };
    if (isHotelPointsActive) {
      const hBase = calculateHotelSavings(
        hotelCash,
        hotelRedemption.pointsNeeded,
        hotelRedemption.awardTaxes,
        hotelRedemption.resortFees,
        hotelRedemption.hotelCashCopay
      );
      const hCpp = calculateCPP(hBase.netSavings, hBase.pointsNeeded, currency, fxRate);
      const hLocal = calculateLocalPerPoint(hBase.netSavings, hBase.pointsNeeded);
      hotelRes = Object.assign({}, hBase, { cpp: hCpp, localPerPoint: hLocal });
    }

    // Out of pocket calculation via explicit waterfall
    let finalOutOfPocket = cashTripCost;
    if (flightRes.enabled) {
      finalOutOfPocket = finalOutOfPocket - flightsCash + flightRes.outOfPocket;
    }
    if (hotelRes.enabled) {
      finalOutOfPocket = finalOutOfPocket - hotelCash + hotelRes.outOfPocket;
    }

    // Guard against negative out of pocket due to invalid math
    finalOutOfPocket = Math.max(0, finalOutOfPocket);

    const totalSavings = Math.max(0, cashTripCost - finalOutOfPocket);
    const pointsCoverageRate = cashTripCost > 0 ? Math.min(100, Math.max(0, (totalSavings / cashTripCost) * 100)) : 0;

    const perPersonCashOriginal = totalTravelers > 0 ? cashTripCost / totalTravelers : 0;
    const perPersonCashFinal = totalTravelers > 0 ? finalOutOfPocket / totalTravelers : 0;
    const dailyCashOriginal = tripDays > 0 ? cashTripCost / tripDays : 0;
    const dailyCashFinal = tripDays > 0 ? finalOutOfPocket / tripDays : 0;

    // Check balances if provided
    const flightBalance = flightRedemption.milesBalance !== undefined && flightRedemption.milesBalance !== '' 
      ? toNum(flightRedemption.milesBalance) : null;
    const flightBalanceSufficient = flightBalance !== null ? (flightBalance >= flightRedemption.milesNeeded) : null;

    const hotelBalance = hotelRedemption.pointsBalance !== undefined && hotelRedemption.pointsBalance !== '' 
      ? toNum(hotelRedemption.pointsBalance) : null;
    const hotelBalanceSufficient = hotelBalance !== null ? (hotelBalance >= hotelRedemption.pointsNeeded) : null;

    // Decision recommendation logic
    let flightVerdict = 'NONE';
    if (flightRes.enabled) {
      if (flightRes.isNegativeSavings) {
        flightVerdict = 'AVOID_NEGATIVE';
      } else if (flightRes.cpp >= 1.5) {
        flightVerdict = 'EXCELLENT_VALUE';
      } else if (flightRes.cpp >= 1.2) {
        flightVerdict = 'GOOD_VALUE';
      } else {
        flightVerdict = 'MARGINAL_VALUE';
      }
    }

    let hotelVerdict = 'NONE';
    if (hotelRes.enabled) {
      if (hotelRes.isNegativeSavings) {
        hotelVerdict = 'AVOID_NEGATIVE';
      } else if (hotelRes.cpp >= 0.8) {
        hotelVerdict = 'EXCELLENT_VALUE';
      } else if (hotelRes.cpp >= 0.6) {
        hotelVerdict = 'GOOD_VALUE';
      } else {
        hotelVerdict = 'MARGINAL_VALUE';
      }
    }

    return {
      currency: currency,
      fxRate: fxRate,
      tripDays: tripDays,
      adults: adults,
      children: children,
      totalTravelers: totalTravelers,
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
      flightBalanceSufficient: flightBalanceSufficient,
      hotelBalanceSufficient: hotelBalanceSufficient,
      flightVerdict: flightVerdict,
      hotelVerdict: hotelVerdict,
      breakdown: {
        flightsCash: flightsCash,
        hotelCash: hotelCash,
        diningCash: diningCash,
        transitCash: transitCash,
        carRentalCash: carRentalCash,
        parkingTollsCash: parkingTollsCash,
        activitiesCash: activitiesCash,
        visaInsuranceCash: visaInsuranceCash,
        connectivityCash: connectivityCash,
        otherCash: otherCash
      }
    };
  }

  /**
   * Format Currency
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

  return {
    DEFAULT_FX_RATE: DEFAULT_FX_RATE,
    toNum: toNum,
    convertUsdCentsToLocal: convertUsdCentsToLocal,
    convertLocalToUsd: convertLocalToUsd,
    calculateCPP: calculateCPP,
    calculateLocalPerPoint: calculateLocalPerPoint,
    calculateFlightSavings: calculateFlightSavings,
    calculateHotelSavings: calculateHotelSavings,
    calculateTripCostAfterPoints: calculateTripCostAfterPoints,
    formatCurrency: formatCurrency
  };
}));
