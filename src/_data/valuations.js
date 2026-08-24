/**
 * Canonical Loyalty Program Valuations & Benchmark Scenarios
 * 
 * RULE: All point valuations are canonically stored in `valueUsdCentsPerPoint` (USD Cents / Point).
 * For example: 1.5 means 1.5¢ = $0.015 USD per point.
 * 
 * To convert to CNY / point: `(valueUsdCentsPerPoint / 100) * fxRate` (default fxRate = 7.0).
 */

const valuations = [
  {
    programId: "chase_ur",
    programName: "Chase Ultimate Rewards (UR)",
    valueUsdCentsPerPoint: 2.0,
    valuationType: "flexible_bank_points",
    sourceName: "Editorial Benchmark (TPG/OMAAT)",
    sourceUrl: "https://thepointsguy.com/guide/monthly-valuations/",
    lastVerified: "2026-08-20",
    notes: "High versatility with 1:1 transfers to Hyatt, United, and British Airways.",
    isIllustrative: true
  },
  {
    programId: "amex_mr",
    programName: "American Express Membership Rewards (MR)",
    valueUsdCentsPerPoint: 2.0,
    valuationType: "flexible_bank_points",
    sourceName: "Editorial Benchmark (TPG/OMAAT)",
    sourceUrl: "https://onemileatatime.com/guides/value-frequent-flyer-miles/",
    lastVerified: "2026-08-20",
    notes: "Strong international airline transfer partners (ANA, Aeroplan, Flying Blue).",
    isIllustrative: true
  },
  {
    programId: "capital_one",
    programName: "Capital One Miles",
    valueUsdCentsPerPoint: 1.85,
    valuationType: "flexible_bank_points",
    sourceName: "Editorial Benchmark",
    sourceUrl: "https://thepointsguy.com/guide/monthly-valuations/",
    lastVerified: "2026-08-20",
    notes: "Broad 1:1 transfer partners with purchase eraser baseline flexibility.",
    isIllustrative: true
  },
  {
    programId: "citi_typ",
    programName: "Citi ThankYou Points (TYP)",
    valueUsdCentsPerPoint: 1.8,
    valuationType: "flexible_bank_points",
    sourceName: "Editorial Benchmark",
    sourceUrl: "https://thepointsguy.com/guide/monthly-valuations/",
    lastVerified: "2026-08-20",
    notes: "Valuable airline partners including Avianca LifeMiles and Turkish Miles&Smiles.",
    isIllustrative: true
  },
  {
    programId: "hyatt",
    programName: "World of Hyatt",
    valueUsdCentsPerPoint: 1.7,
    valuationType: "hotel_points",
    sourceName: "Editorial Benchmark",
    sourceUrl: "https://thepointsguy.com/guide/monthly-valuations/",
    lastVerified: "2026-08-20",
    notes: "Fixed award chart with no resort fees on award nights.",
    isIllustrative: true
  },
  {
    programId: "marriott",
    programName: "Marriott Bonvoy",
    valueUsdCentsPerPoint: 0.8,
    valuationType: "hotel_points",
    sourceName: "Editorial Benchmark",
    sourceUrl: "https://thepointsguy.com/guide/monthly-valuations/",
    lastVerified: "2026-08-20",
    notes: "Dynamic pricing with 5th night free benefit on award stays.",
    isIllustrative: true
  },
  {
    programId: "hilton",
    programName: "Hilton Honors",
    valueUsdCentsPerPoint: 0.55,
    valuationType: "hotel_points",
    sourceName: "Editorial Benchmark",
    sourceUrl: "https://thepointsguy.com/guide/monthly-valuations/",
    lastVerified: "2026-08-20",
    notes: "Dynamic pricing, 5th night free for Silver+ elite members, no resort fees on awards.",
    isIllustrative: true
  },
  {
    programId: "aeroplan",
    programName: "Air Canada Aeroplan",
    valueUsdCentsPerPoint: 1.5,
    valuationType: "airline_miles",
    sourceName: "Editorial Benchmark",
    sourceUrl: "https://onemileatatime.com/guides/value-frequent-flyer-miles/",
    lastVerified: "2026-08-20",
    notes: "No carrier fuel surcharges on partner awards; stopovers for 5,000 points.",
    isIllustrative: true
  },
  {
    programId: "avios",
    programName: "British Airways / Qatar Avios",
    valueUsdCentsPerPoint: 1.4,
    valuationType: "airline_miles",
    sourceName: "Editorial Benchmark",
    sourceUrl: "https://thepointsguy.com/guide/monthly-valuations/",
    lastVerified: "2026-08-20",
    notes: "Distance-based chart best for direct short-haul flights.",
    isIllustrative: true
  },
  // Benchmark scenarios for general calculators
  {
    programId: "scenario_low_value",
    programName: "Low-value points scenario (低面值积分情景)",
    valueUsdCentsPerPoint: 0.6,
    valuationType: "benchmark_scenario",
    sourceName: "Calculation Benchmark",
    sourceUrl: "/methodology/",
    lastVerified: "2026-08-23",
    notes: "Illustrative scenario for hotel points or lower-value redemptions.",
    isIllustrative: true
  },
  {
    programId: "scenario_conservative",
    programName: "Conservative baseline scenario (保守估值情景)",
    valueUsdCentsPerPoint: 1.2,
    valuationType: "benchmark_scenario",
    sourceName: "Calculation Benchmark",
    sourceUrl: "/methodology/",
    lastVerified: "2026-08-23",
    notes: "Conservative estimate when no historical data exists.",
    isIllustrative: true
  },
  {
    programId: "scenario_typical_airline",
    programName: "Typical airline-mile scenario (中性航空里程情景)",
    valueUsdCentsPerPoint: 1.5,
    valuationType: "benchmark_scenario",
    sourceName: "Calculation Benchmark",
    sourceUrl: "/methodology/",
    lastVerified: "2026-08-23",
    notes: "Standard illustrative benchmark for airline miles.",
    isIllustrative: true
  },
  {
    programId: "scenario_high_value",
    programName: "Higher-value redemption scenario (较高价值兑换情景)",
    valueUsdCentsPerPoint: 2.0,
    valuationType: "benchmark_scenario",
    sourceName: "Calculation Benchmark",
    sourceUrl: "/methodology/",
    lastVerified: "2026-08-23",
    notes: "Favorable sweet spots or premium cabin award bookings.",
    isIllustrative: true
  }
];

module.exports = valuations;
