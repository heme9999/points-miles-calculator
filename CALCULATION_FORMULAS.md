# 旅行预算与积分抵扣核心数学公式 (CALCULATION FORMULAS)

## 一、全现金旅行总成本 (All-Cash Baseline)

$$ \text{cashTripCost} = \sum_{i=1}^{10} \text{Expense}_i $$

包含 10 项细分预算：
1. 机票现金价 $\text{expFlights}$
2. 酒店现金价 $\text{expHotel}$
3. 餐饮美食 $\text{expDining}$
4. 城市交通 $\text{expTransit}$
5. 租车费用 $\text{expCarRental}$
6. 停车油费过路费 $\text{expParkingTolls}$
7. 景点与活动 $\text{expActivities}$
8. 签证与保险 $\text{expVisaInsurance}$
9. 电话卡/eSIM $\text{expConnectivity}$
10. 其他杂费 $\text{expOther}$

---

## 二、单项积分抵扣净节省 (Net Savings)

### 1. 航空里程兑换机票
$$ \text{flightOutOfPocket} = \text{awardTaxes} + \text{awardCashCopay} $$
$$ \text{flightNetSavings} = \text{expFlights} - \text{flightOutOfPocket} $$

### 2. 酒店积分兑换住宿
$$ \text{hotelOutOfPocket} = \text{hotelAwardTaxes} + \text{resortFees} + \text{hotelCashCopay} $$
$$ \text{hotelNetSavings} = \text{expHotel} - \text{hotelOutOfPocket} $$

---

## 三、最终实际自付现金瀑布 (Waterfall Out-of-Pocket)

$$ \text{finalOutOfPocket} = \text{cashTripCost} - \mathbb{I}_{\text{flight}} \cdot \text{expFlights} + \mathbb{I}_{\text{flight}} \cdot \text{flightOutOfPocket} - \mathbb{I}_{\text{hotel}} \cdot \text{expHotel} + \mathbb{I}_{\text{hotel}} \cdot \text{hotelOutOfPocket} $$

其中 $\mathbb{I}_{\text{flight}}, \mathbb{I}_{\text{hotel}} \in \{0, 1\}$ 代表是否启用对应项目的积分抵扣。

### 累计节省金额与覆盖比例
$$ \text{totalSavings} = \max(0, \text{cashTripCost} - \text{finalOutOfPocket}) $$
$$ \text{pointsCoverageRate} = \begin{cases} \frac{\text{totalSavings}}{\text{cashTripCost}} \times 100\%, & \text{cashTripCost} > 0 \\ 0\%, & \text{cashTripCost} = 0 \end{cases} $$

---

## 四、真实单点兑出价值 (Realized CPP)

无论选择 CNY 还是 USD 货币显示，CPP（Cents Per Point）均按美元美分严格定义：

$$ \text{NetSavings}_{\text{USD}} = \begin{cases} \text{NetSavings}_{\text{Local}}, & \text{Currency} = \text{USD} \\ \frac{\text{NetSavings}_{\text{CNY}}}{\text{FX Rate}}, & \text{Currency} = \text{CNY} \end{cases} $$

$$ \text{CPP} = \left( \frac{\text{NetSavings}_{\text{USD}}}{\text{Points Used}} \right) \times 100 \quad (\text{美分/点}) $$

本地货币每点价值：
$$ \text{Local Value Per Point} = \frac{\text{NetSavings}_{\text{Local}}}{\text{Points Used}} \quad (\text{元/点 或 美元/点}) $$

---

## 五、均摊指标与异常边界处理

1. **人均与日均自付现金**：
   $$ \text{PerPersonCash} = \frac{\text{finalOutOfPocket}}{\text{Adults} + \text{Children}} $$
   $$ \text{DailyCash} = \frac{\text{finalOutOfPocket}}{\text{TripDays}} $$
   *注：计算输入时已采用全体总额，不得再次乘以人数。*

2. **负节省预警 (Negative Savings)**：
   当 $\text{flightOutOfPocket} > \text{expFlights}$ 或 $\text{hotelOutOfPocket} > \text{expHotel}$ 时：
   - $\text{NetSavings} < 0$
   - 触发决策警报：“使用积分反而增加成本，建议直接支付现金”。
