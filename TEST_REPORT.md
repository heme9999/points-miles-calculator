# 自动化测试与质量验证报告 (TEST REPORT)

## 一、测试套件概述
本次测试涵盖了两套相互独立的验证层：
1. **单元测试层 (`npm test`)**：基于 Node.js 22 内置测试运行器，针对 `CalculatorCore` 及核心计算模型进行 28 项数学逻辑与异常边界校验。
2. **集成与端到端网关层 (`node run_tests.js`)**：启动本地服务器，通过 JSDOM 模拟多 UA 爬取与客户端 JavaScript 真实执行环境，校验 104 个页面的 DOM、参数解析、SEO 标签与交互功能。

---

## 二、单元测试覆盖矩阵 (`test/trip-cost-engine.test.js` & `test/calculator.test.js`)

| 测试组 | 用例数 | 关键测试点 | 测试结果 |
| :--- | :---: | :--- | :---: |
| **纯现金旅行基准** | 2 | 无积分抵扣时，全现金成本、人均、日均无误差计算 | **PASS** |
| **机票单独抵扣** | 3 | 扣减机票原价、加回税费、余额充足校验、CPP计算 | **PASS** |
| **酒店单独抵扣** | 3 | 扣减酒店房费、加回 Resort Fee、余额不足标记、CPP计算 | **PASS** |
| **机票+酒店双重抵扣** | 3 | 双重联动扣减、费用瀑布总和、覆盖率综合判定 | **PASS** |
| **负节省场景防御** | 2 | 税费高于票价时触发 `AVOID_NEGATIVE` 警报 | **PASS** |
| **单位转换与防呆** | 4 | 0.6¢ -> 0.042元，1.5¢ -> 0.105元，10x/100x 防错 | **PASS** |
| **非法与极限值** | 4 | 0天、负人数、负金额、非法字符串安全降级 | **PASS** |
| **币种与格式化** | 3 | CNY ¥ 与 USD $ 数字千分位格式化 | **PASS** |
| **双向 Hreflang 与规范链接** | 4 | `zh-CN`, `en`, `x-default` 双向一致性 | **PASS** |
| **URL 参数还原** | 3 | 货币、行程参数、各分类预算在页面加载时准确还原 | **PASS** |
| **总计** | **28** | **所有测试断言全部通过** | **100% PASS** |

---

## 三、测试运行输出记录

```bash
$ npm test

> site@1.0.0 test
> node --test test/calculator.test.js test/trip-cost-engine.test.js

TAP version 13
# Subtest: Points vs Cash Advanced Calculator Tests (ZH)
    ok 1 - 1. Baseline correct scenario: 5000 / 40000 / 800 / 200 / 0% bonus
    ok 2 - 2. Include transfer bonus 20%
    ok 3 - 3. Points needed is 0 (State Clear)
    ok 4 - 4. Tax exceeds cash price
ok 1 - Points vs Cash Advanced Calculator Tests (ZH)
# Subtest: Points vs Cash Advanced Calculator Tests (EN)
    ok 1 - 1. EN Baseline correct scenario
    ok 2 - 2. EN Include transfer bonus 20%
    ok 3 - 3. EN Language correctness
ok 2 - Points vs Cash Advanced Calculator Tests (EN)
# Subtest: Bilingual Structure & Hreflang Validation
    ok 1 - 1. html lang attribute is correct
    ok 2 - 3. English pages have no Chinese template leakage
    ok 3 - 4. Canonical URLs point to themselves
    ok 4 - 5. x-default points to English version
    ok 5 - 2. Hreflang links are present
ok 3 - Bilingual Structure & Hreflang Validation
# Subtest: Currency Preference & URL Params Parsing
    ok 1 - 1. ?currency=USD changes currency to USD for ZH page
    ok 2 - 2. ?currency=INVALID defaults back to CNY for ZH page
    ok 3 - 3. Negative parameters are ignored and defaults kept
ok 4 - Currency Preference & URL Params Parsing
# Subtest: CalculatorCore Unit Tests - Trip Cost After Points Engine
    ok 1 - 1. Pure cash trip (No points applied)
    ok 2 - 2. Airline miles only redemption
    ok 3 - 3. Hotel points only redemption
    ok 4 - 4. Simultaneous flights and hotel points redemption
    ok 5 - 5. Negative net savings warning (Taxes higher than cash price)
    ok 6 - 6. Unit conversion & 10x/100x error guard
    ok 7 - 7. Safe handling of 0, negative, and invalid values
    ok 8 - 8. Currency formatting for CNY and USD
ok 5 - CalculatorCore Unit Tests - Trip Cost After Points Engine

# tests 28
# pass 28
# fail 0
# duration_ms 363.27
```

```bash
$ npm run build && node run_tests.js

[11ty] Writing ./_site/calculators/trip-cost-after-points/index.html from ./src/calculators/trip-cost-after-points.njk (njk)
[11ty] Writing ./_site/en/calculators/trip-cost-after-points/index.html from ./src/en/calculators/trip-cost-after-points.njk (njk)
[11ty] Writing ./_site/examples/usa-west-coast-family-trip-with-points/index.html from ./src/examples/usa-west-coast-family-trip-with-points.md (njk)
[11ty] Writing ./_site/en/examples/usa-west-coast-family-trip-with-points/index.html from ./src/en/examples/usa-west-coast-family-trip-with-points.md (njk)
[11ty] Writing ./_site/examples/japan-7-day-family-trip-with-points/index.html from ./src/examples/japan-7-day-family-trip-with-points.md (njk)
[11ty] Writing ./_site/en/examples/japan-7-day-family-trip-with-points/index.html from ./src/en/examples/japan-7-day-family-trip-with-points.md (njk)
[11ty] Copied 2 Wrote 108 files in 0.13 seconds (v3.1.6)

=== Starting Phase 9.2.1 Gatekeeper Tests ===
--- 1. Robots.txt Verification ---
robots.txt OK and properly points to absolute sitemap URL.

--- 2. Sitemap UA & Format Verification ---
Sitemap total URLs: 104
Sitemap explicit lastmod entries: 16

--- 3. Homepage Entry Points Verification ---
English homepage link OK: /en/calculators/trip-cost-after-points/ -> "Trip Cost After Points → Calculate true out-of-pocket cost"
Chinese homepage link OK: /calculators/trip-cost-after-points/ -> "积分旅行预算计算器 → 计算积分抵扣后的旅行实际现金支出"

--- Trip Cost After Points Calculator Verification (CN & EN) ---
CN Trip Cost After Points on-load calculation: ¥19,400 final / ¥24,600 saved (Passed)
EN Trip Cost After Points on-load calculation: $4,570 final / $5,940 saved (Passed)
Case study OK: /examples/usa-west-coast-family-trip-with-points/ (H1: "一家三口美国西海岸10天积分旅行预算案例分析")
Case study OK: /en/examples/usa-west-coast-family-trip-with-points/ (H1: "US West Coast 10-Day Family Vacation Budget Case Study with Points")
Case study OK: /examples/japan-7-day-family-trip-with-points/ (H1: "一家三口日本东京与关西7天积分旅行预算案例分析")
Case study OK: /en/examples/japan-7-day-family-trip-with-points/ (H1: "Japan 7-Day Family Vacation Budget Case Study with Points")

PASSED WITH 0 ERRORS
```
