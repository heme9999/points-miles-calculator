const fs = require('fs');
const path = require('path');

const calculatorsToUpdate = [
  {
    file: 'src/en/index.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>How to Choose Between Points and Cash</h2>
  <p>The ultimate question in award travel is whether you should use your points or pay cash. This basic <strong>Points vs Cash Calculator</strong> helps you find out if transferring credit card points (like Chase Ultimate Rewards or Amex Membership Rewards) to an airline is actually worth it compared to just cashing them out at their base value.</p>
  
  <h3>The Calculation Formula</h3>
  <p>To determine the better option, we calculate the estimated value of both choices:</p>
  <ul>
    <li><strong>Cashout Value</strong> = <code>Total Points / Cashout Ratio</code></li>
    <li><strong>Miles Value</strong> = <code>(Total Points / Transfer Ratio) * Estimated Value Per Mile</code></li>
  </ul>
  
  <h3>Real-World Examples</h3>
  <div class="example-box">
    <h4>Example 1: The Outsized Value Redemption</h4>
    <p>You have 100,000 Chase UR points. You can cash them out for $1,000 (100:1). Alternatively, you can transfer them 1:1 to United MileagePlus. You find a business class ticket that gives you an estimated value of 4.0¢ per mile. The miles value is $4,000. <strong>Verdict: Transfer to Miles.</strong></p>
  </div>
  <div class="example-box">
    <h4>Example 2: The Poor Redemption</h4>
    <p>You have 50,000 points. Cashout value is $500. You want to transfer 1:1 to an airline for a cheap economy ticket where the points are only worth 0.8¢ each. The miles value is $400. <strong>Verdict: Cash Out.</strong></p>
  </div>

  <h3>Frequently Asked Questions</h3>
  <details>
    <summary>Does this include taxes and fees?</summary>
    <p>No, this basic calculator does not factor in taxes and fees. If your award flight has high fuel surcharges, you should use our <a href="/en/calculators/points-vs-cash/">Advanced Points vs Cash Calculator</a> instead.</p>
  </details>
  <details>
    <summary>Are these airline valuations guaranteed?</summary>
    <p>No. Airline miles do not have a fixed cash value. The valuation (Cents / Mile) you enter is simply an estimate based on industry averages (like TPG) or your own calculations.</p>
  </details>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>Last Fact-Checked: August 2026. Editorial Disclaimer: Valuations and calculations are estimates for educational purposes and do not constitute financial advice.</em></p>
</article>
`
  },
  {
    file: 'src/index.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>到底该用积分换里程，还是直接拿现金返现？</h2>
  <p>信用卡积分最常见的用法有两种：按照固定比例折现抵扣账单（如 100 积分 = 1 元），或者按比例转入航空公司常客计划兑换免费机票。这个<strong>基础版积分 vs 现金计算器</strong>能帮你一键算出，转成里程到底划不划算。</p>
  
  <h3>计算公式</h3>
  <ul>
    <li><strong>直接折现价值</strong> = <code>总积分 ÷ 折现比例</code></li>
    <li><strong>里程预估价值</strong> = <code>(总积分 ÷ 转点比例) × 单个里程估值</code></li>
  </ul>
  
  <h3>真实计算案例</h3>
  <div class="example-box">
    <h4>案例 1：超值兑换（跨洋商务舱）</h4>
    <p>你手头有 100,000 招行积分。如果直接在掌上生活抵扣，可能只值 1,000 元（假设比例 100:1）。但如果你按 10:1 转入国泰航空亚洲万里通，得到 10,000 里程。如果你预估国泰里程价值 1.5 元/里，那这笔里程价值 15,000 元。<strong>结论：强烈建议转成里程。</strong></p>
  </div>

  <h3>常见问题 (FAQ)</h3>
  <details>
    <summary>这个计算器包含航司收取的燃油附加费和税费吗？</summary>
    <p>不包含。基础版只对比“积分本身的账面价值”。如果你的机票需要缴纳很高的税费（如英航、国泰），建议使用我们的 <a href="/calculators/points-vs-cash/">高级版 Points vs Cash 计算器</a> 进行精准核算。</p>
  </details>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>最后事实核查时间：2026年8月。免责声明：本站提供的估值与计算结果仅供参考，不构成任何财务建议。</em></p>
</article>
`
  },
  {
    file: 'src/en/calculators/points-vs-cash.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>Advanced Points vs Cash Calculator Guide</h2>
  <p>Unlike basic calculators, this tool factors in the hidden costs of award travel: cash taxes and fees, point transfer bonuses, and the miles you <em>forgo</em> by not paying cash. It provides the most accurate picture of your redemption's true value.</p>
  
  <h3>Understanding the Hidden Costs</h3>
  <ul>
    <li><strong>Taxes and Fees:</strong> Some airlines (like British Airways) charge massive fuel surcharges on award tickets. This drastically lowers your redemption value.</li>
    <li><strong>Forgone Value:</strong> When you buy a ticket with cash, you usually earn miles. When you fly on an award ticket, you earn nothing. You must account for this lost opportunity.</li>
  </ul>

  <h3>Calculation Formulas</h3>
  <p>The Advanced Calculator uses a comprehensive CPP (Cents Per Point) formula to determine the precise value you are extracting:</p>
  <p><code>Effective Value = (Cash Price - Taxes & Fees + Forgone Value) / Points Required</code></p>
  <p>It then applies any <strong>Transfer Bonuses</strong> to calculate the actual number of bank points you need to transfer.</p>

  <h3>Example: The Fuel Surcharge Trap</h3>
  <div class="example-box">
    <p>You find a flight to London that costs $1,000 in cash. The award ticket costs 50,000 Avios... but it also requires $600 in taxes! 
    Effective Value = ($1,000 - $600) / 50,000 = 0.8¢ per Avios. 
    Since you can cash out Chase points at 1.0¢ each, this is a terrible deal. <strong>Verdict: Do Not Transfer. Pay Cash.</strong></p>
  </div>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>Last Fact-Checked: August 2026. Editorial Disclaimer: Calculations are estimates for educational purposes and do not constitute financial advice.</em></p>
</article>
`
  },
  {
    file: 'src/calculators/points-vs-cash.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>高级版积分与现金对比工具</h2>
  <p>这不仅仅是一个简单的除法器。高级计算器将<strong>航司高昂的燃油附加费 (YQ/YR)</strong>、<strong>转点加赠活动 (Transfer Bonus)</strong> 以及<strong>买现金票原本可以累积的里程回血</strong>全部纳入考量，还原里程兑换的真实成本。</p>
  
  <h3>隐藏成本解析</h3>
  <ul>
    <li><strong>税费与附加费：</strong> 免费机票并不总是免费的。比如英国航空 (BA) 跨洋航线的税费往往高达数百美金，甚至超过经济舱的现金票价。</li>
    <li><strong>错失的回血 (Forgone Value)：</strong> 买现金票是可以积攒里程的，而用里程换票则没有里程累积。这部分错失的收益必须从“节省的现金”中扣除。</li>
  </ul>

  <h3>高级 CPP 计算公式</h3>
  <p>高级计算器使用的精准价值 (Effective Value) 公式为：</p>
  <p><code>兑换真实价值 = (现金票价 - 需支付税费 + 错失的回血) ÷ 兑换所需积分</code></p>
  <p>在此基础上，系统会自动根据转点加赠比例，倒推出你真实需要划扣的信用卡积分，并最终判断是否“不建议兑换”。</p>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>最后事实核查时间：2026年8月。免责声明：本站计算结果仅供参考，不构成任何财务建议。</em></p>
</article>
`
  },
  {
    file: 'src/en/calculators/cents-per-point.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>What is Cents Per Point (CPP)?</h2>
  <p>Cents Per Point (CPP) is the industry-standard metric used to determine how much value you are getting out of your points and miles. The higher the CPP, the better the redemption.</p>
  
  <h3>Basic CPP Formula</h3>
  <p><code>CPP = (Cash Price - Taxes & Fees) / Points Required * 100</code></p>

  <h3>How to Use the CPP Calculator</h3>
  <ol>
    <li>Find the exact same flight or hotel room you want to book on Google Flights or the hotel's website. Note the <strong>total cash price</strong> including all taxes.</li>
    <li>Find the award price for that exact same flight/hotel. Note the <strong>points required</strong> and the <strong>cash taxes</strong> you must pay out of pocket.</li>
    <li>Enter these numbers into the calculator to get your CPP.</li>
  </ol>

  <h3>What is a "Good" CPP?</h3>
  <ul>
    <li><strong>< 1.0¢</strong> : Usually a poor redemption. You are often better off cashing out your points or using a travel portal.</li>
    <li><strong>1.2¢ - 1.5¢</strong> : Standard redemption for domestic flights or mid-tier hotels.</li>
    <li><strong>> 2.0¢</strong> : Excellent redemption! Often seen with international Business Class flights or high-end Hyatt redemptions.</li>
  </ul>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>Last Fact-Checked: August 2026. Editorial Disclaimer: Calculations are estimates for educational purposes and do not constitute financial advice.</em></p>
</article>
`
  },
  {
    file: 'src/calculators/cents-per-point.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>什么是 Cents Per Point (CPP)?</h2>
  <p>CPP (每万分价值 / 每点价值) 是常旅客圈衡量“用出多少价值”的黄金标准。算出 CPP 后，你就可以把它和媒体公布的“参考估值”进行对比。如果算出的 CPP 高于参考估值，说明换得很值！</p>
  
  <h3>CPP 计算公式</h3>
  <p><code>CPP = (现金价格 - 需要额外支付的税费) ÷ 需要扣除的积分量</code></p>

  <h3>避坑指南：不要自欺欺人</h3>
  <p>很多新手会用一张“全价商务舱” (Full Fare Business) 的离谱现金价来计算 CPP，得出 10¢ 甚至 20¢ 的超高价值。这是错误的！<strong>现金价应该填写你“如果买不到积分票，实际上真的愿意支付”的价格。</strong> 这样算出的 CPP 才具有真实的参考意义。</p>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>最后事实核查时间：2026年8月。免责声明：本站计算结果仅供参考，不构成任何财务建议。</em></p>
</article>
`
  },
  {
    file: 'src/en/calculators/transfer-bonus.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>Transfer Bonus Calculator Guide</h2>
  <p>Banks like Chase, Amex, and Capital One frequently run "Transfer Bonuses" where you get 15% to 30% extra miles when you transfer points to a specific airline partner.</p>
  
  <h3>The Trap of Transfer Increments</h3>
  <p>Most banks require you to transfer points in increments of 1,000. If you need exactly 55,000 miles and there is a 20% bonus, how many points do you transfer? You cannot transfer 45,833 points. Our calculator automatically handles the math and <strong>rounds up to the nearest valid increment</strong> (e.g., 46,000 points) so you don't end up short.</p>

  <h3>Should You Transfer Speculatively?</h3>
  <p><strong>No.</strong> The number one rule of award travel is: <em>Do not transfer points unless you see available award space and are ready to book immediately.</em> Transfers are one-way and irreversible. If you transfer points to take advantage of a 30% bonus, but the award ticket disappears, your points are now trapped in an airline program where they will slowly devalue.</p>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>Last Fact-Checked: August 2026. Editorial Disclaimer: Calculations are estimates for educational purposes and do not constitute financial advice.</em></p>
</article>
`
  },
  {
    file: 'src/calculators/transfer-bonus.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>转点加赠活动 (Transfer Bonus) 计算器指南</h2>
  <p>Amex, Chase 和 Citi 等银行经常会推出限时转点加赠活动（比如转入英国航空额外赠送 30% 里程）。这是让你的信用卡积分瞬间升值的最佳时机。</p>
  
  <h3>为什么要用这个计算器？</h3>
  <p>转点通常有<strong>最小单位限制</strong>（例如必须是 1,000 分的整数倍）。在有加赠比例的情况下，人工计算很容易算错，导致最后转出来的里程差了几十点，无法出票。本计算器会自动帮你<strong>向上取整到符合要求的最小整数倍</strong>，确保你转出的里程绝对够用，且不浪费一分钱。</p>

  <h3>可以为了加赠提前囤积里程吗？</h3>
  <p><strong>强烈不建议。</strong> 转点是<strong>不可逆单向操作</strong>。一旦你把灵活的信用卡积分转入特定航司，就再也退不回去了。如果在没有真实出行需求时盲目转点，你将面临航司无预警贬值、日后查不到票等巨大风险。</p>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>最后事实核查时间：2026年8月。免责声明：本站计算结果仅供参考，不构成任何财务建议。</em></p>
</article>
`
  },
  {
    file: 'src/en/calculators/points-to-dollars.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>Points to Dollars Valuation Tool</h2>
  <p>Have 200,000 Marriott points and wondering what they are actually worth? This tool lets you quickly convert any points balance into an estimated dollar value based on industry-standard valuations.</p>
  
  <h3>How is this calculated?</h3>
  <p><code>Estimated Value = Total Points * (Valuation / 100)</code></p>
  <p>We provide dropdown presets for major loyalty programs based on editorial consensus. For example, World of Hyatt points are generally valued at 1.7¢ each, while Hilton points are valued closer to 0.6¢ each due to program inflation.</p>

  <h3>Cash Value vs Reward Value</h3>
  <p>Remember that the number you see here is the <em>Reward Value</em> (what you can expect to get when redeeming for travel). It is <strong>not</strong> the cashout value. If you try to cash out airline miles to your bank account, you will usually get pennies on the dollar, or nothing at all.</p>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>Last Fact-Checked: August 2026. Editorial Disclaimer: Valuations are estimates for educational purposes and do not constitute financial advice.</em></p>
</article>
`
  },
  {
    file: 'src/calculators/points-to-dollars.njk',
    content: `
<article class="seo-content" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;">
  <h2>积分折算现金价值计算器</h2>
  <p>这是一款快速估值工具。当你的账户里躺着十几万酒店积分或航空里程时，你可以通过这个工具一键查看它们的“账面价值”相当于多少钱。</p>
  
  <h3>如何计算积分总值？</h3>
  <p><code>预估总价值 = 积分余额 × 单点估值</code></p>
  <p>我们在下拉菜单中预设了业界公认的参考估值（例如凯悦 1.7 美分，希尔顿 0.6 美分）。由于不同常客计划存在不同的“通货膨胀”情况，10万凯悦积分的价值将远大于10万希尔顿积分。</p>

  <h3>变现提醒</h3>
  <p>请注意，计算出的金额是你<strong>在正常兑换机票或酒店时，所能发挥出的平均购买力</strong>，并不代表航司或酒店会真的用这么多现金把你手里的积分买回去。</p>

  <p class="disclaimer" style="margin-top: 20px; font-size: 0.9em; color: #64748b;"><em>最后事实核查时间：2026年8月。免责声明：本站计算结果仅供参考，不构成任何财务建议。</em></p>
</article>
`
  }
];

calculatorsToUpdate.forEach(item => {
  const filePath = path.join(__dirname, '..', item.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('class="seo-content"')) {
      content = content.replace('<div class="reads">', item.content + '\n<div class="reads">');
      fs.writeFileSync(filePath, content);
      console.log('Updated ' + item.file);
    } else {
      console.log('Skipping ' + item.file + ', already updated.');
    }
  } else {
    console.log('Warning: ' + filePath + ' not found.');
  }
});
