# Phase 9.7: SEO Baseline & Indexability Audit

## 1. Google Search Console (GSC) Data
**Status: UNAVAILABLE**
*Note: Direct access to Google Search Console is not possible from the automated environment. The metrics below must be manually filled in by the site owner. We will NOT assume that a page returning HTTP 200 or present in the sitemap is actually indexed by Google.*

- **Total Clicks (28 days)**: [Manual Entry Required]
- **Total Impressions (28 days)**: [Manual Entry Required]
- **Average CTR**: [Manual Entry Required]
- **Average Position**: [Manual Entry Required]
- **Indexed Pages Count**: [Manual Entry Required]
- **"Crawled - currently not indexed" Count**: [Manual Entry Required]
- **"Discovered - currently not indexed" Count**: [Manual Entry Required]

## 2. Snippet Optimization Candidates
Because GSC CTR data is unavailable, we are not blindly bulk modifying Titles or Descriptions in this phase. The following pages are key calculators that should be monitored for CTR optimization once data is available:
- `/en/calculators/points-to-miles-converter/`
- `/en/calculators/transfer-bonus/`
- `/en/calculators/points-to-dollars/`
- `/en/calculators/points-vs-cash/`
- `/en/calculators/cents-per-point/`

## 3. Search Intent Mapping & Deduplication Audit
- **Points to Miles Converter**: Input bank points → Calculate airline miles output.
- **Transfer Bonus Calculator**: Input target miles needed → Calculate bank points required.
- **Miles to Dollars Calculator**: Input points/miles balance → Estimate monetary value.
- **Points vs Cash Calculator**: Input redemption vs cash flight → Compare and decide.
- **Cents Per Point Calculator**: Input points cost and cash cost → Calculate actual CPP value.

No intent collision detected among these core tools.

## 4. Internal Linking Status (Points to Miles Converter)
- **EN Target**: `/en/calculators/points-to-miles-converter/` -> Minimum 3 contextual links required. (Verified: 3 contextual links present)
- **ZH Target**: `/calculators/points-to-miles-converter/` -> Minimum 3 contextual links required. (Verified: 3 contextual links present)

## 5. Phase 9.7 Baseline Indexability Status (Prior to Phase 9.7.1)
**Status**: TECHNICAL INDEXABILITY PASSED — 46 CONTENT/LINK WARNINGS REMAIN

These warnings may reduce discovery or perceived page importance, but they do not prove that Google has excluded the URLs. Actual indexing status requires GSC validation.
（这些告警可能影响页面发现效率或内部重要性信号，但不能证明 Google 未收录这些 URL；实际收录状态必须通过 GSC 验证。）

### Initial 46 Content/Link Warnings Breakdown (Pre-9.7.1)
- **High Priority (Tools & Valuations - 10 URLs)**:
  - Missing contextual inbound links: `/values/aeroplan-points/`, `/values/capital-one-miles/`, `/values/hilton-points/`, `/values/hyatt-points/`, `/values/marriott-points/`, `/en/values/capital-one-miles/`, `/en/values/hilton-points/`, `/en/values/hyatt-points/`, `/en/values/marriott-points/`, `/en/calculators/trip-cost-after-points/`
- **Medium Priority (Guides, Comparisons & Blogs - 21 URLs)**:
  - Missing contextual inbound links across guides and comparison articles.
- **Low Priority (Case Studies & Meta Pages - 15 URLs)**:
  - Missing contextual inbound links across specific case studies and static pages.

---
*Note: The subsequent link plan and resolution of the 10 High Priority targets are documented in `docs/seo-phase-9.7.1-link-plan.md` and `docs/seo-phase-9.7.1-warnings.md`.*
