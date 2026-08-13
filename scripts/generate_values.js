const fs = require('fs');
const path = require('path');

const date = '2026-08-11';

const data = {
  'aeroplan-points': {
    title: 'Air Canada Aeroplan 里程估值与使用攻略',
    desc: '深度解析加拿大航空 Aeroplan (加航) 里程的市场估值、星空联盟最佳兑换方式以及避坑指南。',
    name: 'Air Canada Aeroplan (加航里程)',
    intro: 'Aeroplan 是加拿大航空 (Air Canada) 的常旅客计划。作为星空联盟 (Star Alliance) 的重要成员，Aeroplan 里程以其极具竞争力的兑换图表、允许停留 (Stopover) 以及丰富的合作伙伴而闻名，是常旅客界最受欢迎的航司里程之一。',
    base: '0.10 - 0.12',
    examples: '兑换长荣航空 (EVA Air)、全日空 (ANA) 的跨洋商务舱，或在北美境内兑换美联航 (United) 的短途机票。',
    risk: 'Aeroplan 采用了混合动态定价（对自家航班动态，对伙伴航空固定）。同时，它经常面临“幽灵票”以及系统维护导致的无法出票问题。',
    link: 'https://www.aircanada.com/ca/en/aco/home/aeroplan.html'
  },
  'amex-membership-rewards': {
    title: 'Amex Membership Rewards (MR) 积分估值与使用攻略',
    desc: '深度解析美国运通 Amex Membership Rewards (MR) 积分的市场估值、最佳转点兑换方式以及避坑指南。',
    name: 'Amex Membership Rewards (MR)',
    intro: 'Amex MR 是美国运通 (American Express) 的灵活性信用卡积分系统。它是全球最主流、获取途径最广的信用卡积分之一。MR 的核心价值在于其极度丰富的转点伙伴网络。',
    base: '0.12 - 0.14',
    examples: '转点至全日空 (ANA) 兑换中美往返商务舱，或在转点加赠期间转入英国航空 (BA Avios) 兑换短途机票。',
    risk: 'MR 积分的最大风险在于转点比例调整以及高昂的持卡年费。此外，Amex 对部分美国国内航司转点会收取 Excise Tax 附加费。',
    link: 'https://www.americanexpress.com/en-us/rewards/membership-rewards/'
  },
  'avios': {
    title: 'Avios (英国航空/卡塔尔航空) 里程估值与使用攻略',
    desc: '深度解析 Avios (英航/卡航等共用里程) 的市场估值、寰宇一家最佳兑换方式以及高额税费避坑指南。',
    name: 'Avios (英航 / 卡航 / 伊比利亚)',
    intro: 'Avios 是一种由英国航空 (BA)、卡塔尔航空 (QR)、伊比利亚航空 (IB) 和芬兰航空 (AY) 共同使用的里程货币。它们可以在这几家航司的账户间以 1:1 的比例无损互转，常被称为“短途神器”。',
    base: '0.08 - 0.10',
    examples: '兑换美国航空 (AA) 或阿拉斯加航空 (AS) 的北美短途直飞，或兑换国泰航空 (Cathay Pacific) 的亚洲区域内短途。',
    risk: 'Avios 的致命伤是极其高昂的燃油附加费 (YQ)。如果你用它兑换英航自家的长途长程商务舱，往往需要支付数千元的税费。',
    link: 'https://www.britishairways.com/en-us/executive-club'
  },
  'capital-one-miles': {
    title: 'Capital One Miles (C1) 积分估值与使用攻略',
    desc: '深度解析 Capital One Miles 积分的市场估值、转点兑换技巧以及旅行报销避坑指南。',
    name: 'Capital One Miles (C1)',
    intro: 'Capital One Miles 是第一资本银行 (Capital One) 发行的灵活信用卡积分。近年来通过不断增加 1:1 的高价值转点伙伴（如 Aeroplan, Avianca LifeMiles），它已经跃升为顶级的旅行积分货币。',
    base: '0.11 - 0.13',
    examples: '按 1:1 比例转入哥伦比亚航空 (LifeMiles) 兑换星空联盟航班，或通过 Capital One Travel Portal 以 1 point = 1 cent 的保底比例直接报销旅行花费。',
    risk: 'C1 的审批极为严格。积分体系本身相对稳定，但某些小众合作伙伴的转点比例并非 1:1，转点前必须仔细核对。',
    link: 'https://www.capitalone.com/credit-cards/travel-and-miles/'
  },
  'chase-ultimate-rewards': {
    title: 'Chase Ultimate Rewards (UR) 积分估值与使用攻略',
    desc: '深度解析大通银行 Chase Ultimate Rewards (UR) 积分的市场估值、最佳转点兑换方式以及避坑指南。',
    name: 'Chase Ultimate Rewards (UR)',
    intro: 'Chase UR 是大通银行 (JPMorgan Chase) 的灵活信用卡积分。由于其极高的稳定性和凯悦酒店 (Hyatt) 这个独家 1:1 强势转点伙伴，UR 被许多常旅客玩家视为最有价值的银行积分。',
    base: '0.13 - 0.15',
    examples: '1:1 转入 World of Hyatt 兑换高端奢华酒店，或转入美联航 (United Airlines) 兑换星空联盟网络。',
    risk: 'Chase 有严格的 5/24 批卡规则。虽然 UR 极少贬值，但其合作伙伴（如 Hyatt 的旺季定价、United 的动态定价）的持续贬值会间接影响 UR 的购买力。',
    link: 'https://ultimaterewardspoints.chase.com/'
  },
  'citi-thankyou-points': {
    title: 'Citi ThankYou Points (TYP) 积分估值与使用攻略',
    desc: '深度解析花旗银行 Citi ThankYou Points (TYP) 积分的市场估值、最佳转点兑换方式以及长荣航空兑换指南。',
    name: 'Citi ThankYou Points (TYP)',
    intro: 'Citi TYP 是花旗银行 (Citibank) 的灵活信用卡积分。虽然其国内航班合作伙伴不如 Chase 和 Amex 强势，但 TYP 在兑换长荣航空 (EVA Air) 和土耳其航空 (Turkish Airlines) 时具有独特优势。',
    base: '0.11 - 0.13',
    examples: '1:1 转入长荣航空 (Infinity MileageLands) 兑换中美跨洋商务舱，或转入哥伦比亚航空 (LifeMiles)。',
    risk: '花旗的 IT 系统经常被用户诟病，且 TYP 取消了原有的机票直接按 1.25 cents 抵扣的保底福利，现在必须依赖转点才能用出高价值。',
    link: 'https://www.thankyou.com/'
  },
  'hilton-points': {
    title: 'Hilton Honors (希尔顿荣誉客会) 积分估值与使用攻略',
    desc: '深度解析希尔顿酒店 Hilton Honors 积分的市场估值、第五晚免费权益以及兑换避坑指南。',
    name: 'Hilton Honors (希尔顿荣誉客会)',
    intro: 'Hilton Honors 是希尔顿酒店集团的常客计划。希尔顿积分以获取极度容易（动辄十几万分的开卡奖励、极高的入住回血比例）而闻名，但也因此单点价值极低，常被戏称为“冥币”。',
    base: '0.03 - 0.04',
    examples: '兑换极高端奢华度假村（如马尔代夫康莱德），或在节假日极端高价期间兑换基础房型。利用“积分兑换连住 5 晚免收第 5 晚积分” (Fifth Night Free) 权益。',
    risk: '希尔顿早已全面实行动态定价，彻底取消了等级图表 (Award Chart)。普通日期的积分房价值通常被死死锁在极低的水平，极难用出超额价值。',
    link: 'https://www.hilton.com/en/hilton-honors/'
  },
  'hyatt-points': {
    title: 'World of Hyatt (凯悦天地) 积分估值与使用攻略',
    desc: '深度解析凯悦酒店 World of Hyatt 积分的市场估值、淡旺季图表以及最佳兑换方式。',
    name: 'World of Hyatt (凯悦天地)',
    intro: 'World of Hyatt 是凯悦酒店集团的常客计划。在各大酒店集团纷纷走向彻底动态定价的今天，凯悦是唯一一家仍然保留固定兑换图表（含淡旺季）的主流集团。这使得其积分价值傲视群雄。',
    base: '0.12 - 0.15',
    examples: '兑换 Category 1 的大车店极具性价比，或者用于兑换柏悦 (Park Hyatt)、阿丽拉 (Alila) 等顶级奢华酒店的旺季基础房。',
    risk: '凯悦每年会进行等级调整 (Category Adjustment)，将热门酒店升级（变相贬值）。此外，很多热门度假村经常在积分房上玩猫腻，人为锁房导致“有现金房但无法用积分兑换”。',
    link: 'https://world.hyatt.com/'
  },
  'marriott-points': {
    title: 'Marriott Bonvoy (万豪旅享家) 积分估值与使用攻略',
    desc: '深度解析万豪酒店 Marriott Bonvoy 积分的市场估值、动态定价后的影响以及住五免一权益。',
    name: 'Marriott Bonvoy (万豪旅享家)',
    intro: 'Marriott Bonvoy 是全球最大酒店集团万豪国际的常客计划。万豪拥有最广泛的全球分布，但其积分体系近年来经历了剧烈的贬值和全面动态化。',
    base: '0.05 - 0.06',
    examples: '在特别昂贵的跨年、节日期间兑换热门景区的酒店，或兑换马尔代夫、波拉波拉等海岛的顶级奢华酒店。同样支持“住五免一” (Stay for 5, Pay for 4)。',
    risk: '万豪已经彻底放弃了固定的兑换图表，实行全面动态定价。绝大多数时候，积分兑换价值被严格锚定在现金价的固定折扣范围内，很难再找到过去那种极具爆发力的兑换亮点。',
    link: 'https://www.marriott.com/loyalty.mi'
  }
};

const template = (id, meta) => `---
layout: base.njk
title: ${meta.title}
description: ${meta.desc}
schemaType: Article
eyebrow: 里程账 · 估值分析
breadcrumbs:
  - name: 积分估值
    url: /values/
  - name: ${meta.name.split(' ')[0]}
---
<h1>${meta.title}</h1>
<p class="lead">${meta.intro}</p>

<h2>什么是 ${meta.name}？</h2>
<p>${meta.intro} 本文将全面解析该常客计划的市场公允估值、常见兑换方式以及你需要警惕的潜在风险。</p>

<h2>当前市场参考估值 (CPP)</h2>
<div class="callout">
  <strong>核心声明：</strong> 常客计划的积分和里程不具备法定的固定价值。以下估值区间综合了主流英文媒体（如 TPG, OMAAT）的行业共识以及大量真实玩家的兑换经验，仅供你在做出决策时作为基准参考。
</div>
<p>在业界普遍共识中，${meta.name} 的基准估值约为 <strong>${meta.base} 元/点</strong>。</p>
<p>你在实际使用中，价值（CPP, Cents Per Point）会呈现明显的两极分化：</p>
<ul>
  <li><strong>较差兑换（明显低于基准线）</strong>：通常发生在直接抵扣信用卡账单、在积分商城兑换实物商品（如 Apple 电子产品）、或者在淡季兑换现金价格本身就很便宜的航班/酒店。</li>
  <li><strong>标准兑换（处于基准线区间内）</strong>：兑换绝大多数热门日期的经济舱，或中规中矩的商务型酒店。这是最常见的场景。</li>
  <li><strong>超值兑换（远超基准线）</strong>：通常只有在兑换跨洋头等舱/商务舱、极度紧俏的节假日机票，或者顶级奢华度假村时才能达到。这也是“玩卡”获得超额收益的主要来源。</li>
</ul>

<h2>常见高价值兑换方式与示例</h2>
<p>${meta.name} 玩家公认的最佳用法通常包括：</p>
<p><em>${meta.examples}</em></p>

<h3>如何自行验证是否划算？</h3>
<p>永远不要盲目相信网上的绝对估值。当你准备兑换时，请按照以下步骤自行验证：</p>
<ol>
  <li>查出你想订的那个航班/酒店如果在第三方预定平台直接花钱，<strong>真实需要支付多少现金</strong>。</li>
  <li>查出用积分预定，需要多少积分，<strong>并且还要另外支付多少税费</strong>。</li>
  <li>将这两个数字输入我们的免费工具进行计算：</li>
</ol>
<ul>
  <li>👉 <a href="/calculators/cents-per-point/">CPP 基础计算器</a>（快速算价值）</li>
  <li>👉 <a href="/calculators/points-vs-cash/">积分 vs 现金高级计算器</a>（综合考量隐藏成本，给出最终决策）</li>
</ul>
<p>只要你算出的 CPP 高于你在上方看到的基准线，并且你本身确实有这项消费需求，那就是一次成功的兑换。</p>

<h2>潜在风险与避坑指南</h2>
<ul>
  <li><strong>贬值风险 (Devaluation)</strong>：积分就像没有利息的货币，几乎每年都会因航司/酒店的规则修改而缩水。强烈建议“Earn and Burn”（随赚随花），绝对不要把积分当成理财产品囤积。</li>
  <li><strong>幽灵票与仓位限制</strong>：查到有票不等于能出票。${meta.risk}</li>
  <li><strong>转点单向性与延迟</strong>：如果这是信用卡积分，一旦转入航司或酒店，就<strong>永远无法退回银行</strong>。必须在确认真的有票且能定上的情况下再执行转点。转点前可以使用我们的 <a href="/calculators/transfer-bonus/">转点加赠计算器</a> 避免转错零头。</li>
</ul>

<h2>官方资源与最后更新</h2>
<ul>
  <li><strong>官方网站</strong>：<a href="${meta.link}" target="_blank" rel="nofollow noopener">${meta.name} 官方页面</a></li>
  <li><strong>最后审核日期</strong>：${date}</li>
</ul>
`;

Object.entries(data).forEach(([id, meta]) => {
  const filepath = path.join(__dirname, '../src/values/', id + '.md');
  fs.writeFileSync(filepath, template(id, meta));
});
