# 积分旅行预算功能合并实施报告 (MERGE IMPLEMENTATION REPORT)

## 一、项目概述与目标达成
本次升级将“里程账 (Points & Miles Calculator)”从单一的“积分/里程兑现与对比工具”拓展为覆盖全行程维度的决策计算工具链，回答了常旅客家庭的核心问题：
> “这次旅行全现金需要多少钱？使用航空里程和酒店积分抵扣后，最终还需要支付多少现金？积分应该用于机票还是酒店？”

升级严格遵守了现有技术栈（Eleventy 3.1.6 + 纯原生无框架客户端 JavaScript + 语义化 HTML/CSS），保留了现有品牌“里程账”，没有引入任何重型 UI 框架或外部追踪脚本，保证了 100% 浏览器本地计算与隐私安全性。

---

## 二、复用与重构架构分析

### 1. 复用的现有模块
- **货币与偏好管理**：复用全站现有的 `currency`（CNY / USD）状态流转机制与 `preferredCurrency` 本地存储逻辑。
- **SEO & 模板系统**：复用 `src/_includes/base.njk` 的自动化双向 hreflang (`zh-CN`, `en`, `x-default`)、self-referencing canonical、JSON-LD 结构化数据生成机制及面包屑系统。
- **设计系统与组件**：复用 `.panel`, `.ticket`, `.field`, `.popular-calculators`, `.responsive-table-wrapper`, `:focus-visible` 等无障碍高对比度样式。
- **决策建议算法**：复用了 CPP 阈值分级逻辑（1.2¢ 保守线、1.5¢ 中性线、2.0¢ 高价值线）来驱动最终方案推荐。

### 2. 新增与重构的共享模块
- **`src/_data/valuations.js`**：建立了全站标准估值数据源，将所有积分/里程基础数据统一定义为 `valueUsdCentsPerPoint`（美分/点），消除了首页和部分页面历史遗留的 10x/14x 单位混淆风险。
- **`src/assets/calculator-core.js`**：抽离出同构核心计算引擎（Isomorphic Engine），同时支持 Node.js 自动化单元测试与浏览器客户端实时计算，确保 CPP、净节省、汇率换算逻辑单点维护、全局一致。
- **费用瀑布逻辑 (Waterfall Breakdown)**：新增结构化瀑布算法，精确实现：
  `全现金基准成本 - 覆盖机票原现金价 + 奖励机票自付税费 - 覆盖酒店原现金价 + 积分房自付杂费 = 最终实际自付现金`。

---

## 三、关键机制设计

### 1. 如何避免重复抵扣？
- **联动扣减模型**：只有当用户勾选并启用了机票/酒店积分抵扣，且输入了大于 0 的所需积分和现金原价时，计算引擎才会从全现金总额中扣除对应的现金预算项。
- **税费显式加回**：奖励票税费与酒店 Resort Fee 作为独立加项计入自付现金，完全与原现金房价/机票价解耦，避免了将税费误当成折扣的数学逻辑错误。

### 2. 如何统一美元、美分和人民币单位？
- **基础存储**：一律以 `usdCentsPerPoint`（美分/点）为基准常数。
- **动态换算**：
  - 美元模式：`CPP = (Net Savings USD / Points) * 100`（直接以美分显示）。
  - 人民币模式：`元/点 = (CPP / 100) * FX Rate`（默认 7.00）。
- **防呆测试**：在单元测试中加入了 10x/100x 阈值断言，防止 `0.042 元/点`（0.6¢）被错误显示或计算为 `0.6 元/点`。

---

## 四、新增与修改文件清单

| 文件路径 | 变更类型 | 说明 |
| :--- | :---: | :--- |
| `src/_data/valuations.js` | 新增 | 规范化忠诚度计划基准估值数据 |
| `src/assets/calculator-core.js` | 新增 | 共享同构计算与单位换算引擎 |
| `src/assets/style.css` | 修改 | 新增旅行预算网格、费用瀑布、方案对比卡片与打印样式 |
| `src/calculators/trip-cost-after-points.njk` | 新增 | 中文“积分抵扣后的旅行实际成本计算器” |
| `src/en/calculators/trip-cost-after-points.njk` | 新增 | 英文 “Trip Cost After Points Calculator” |
| `src/examples/usa-west-coast-family-trip-with-points.md` | 新增 | 中文美国西海岸10天家庭积分旅行案例 |
| `src/en/examples/usa-west-coast-family-trip-with-points.md` | 新增 | 英文美国西海岸10天家庭积分旅行案例 |
| `src/examples/japan-7-day-family-trip-with-points.md` | 新增 | 中文日本7天家庭积分旅行案例 |
| `src/en/examples/japan-7-day-family-trip-with-points.md` | 新增 | 英文日本7天家庭积分旅行案例 |
| `src/index.njk` | 修改 | 修正首页估值下拉情景单位（美分折合人民币）并增加新计算器入口 |
| `src/en/index.njk` | 修改 | 修正英文首页估值情景并增加新计算器入口 |
| `src/calculators/index.njk` | 修改 | 工具目录增加新计算器卡片 |
| `src/en/calculators/index.njk` | 修改 | 英文工具目录增加新计算器卡片 |
| `src/examples/index.njk` | 修改 | 案例目录增加两个新案例卡片 |
| `src/en/examples/index.njk` | 修改 | 英文案例目录增加两个新案例卡片 |
| `test/trip-cost-engine.test.js` | 新增 | 覆盖 24+ 种边界与计算用例的独立单元测试 |
| `test/calculator.test.js` | 修改 | 适配最新测试断言与双语回归 |
| `test_production.js` | 修改 | 全站 104 个 URL 网关回归与自动化交互测试 |
| `scripts/audit_production_seo.js` | 修改 | 生产环境 SEO 审计适配 104 个 URL |
