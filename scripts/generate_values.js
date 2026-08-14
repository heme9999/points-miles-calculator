const fs = require('fs');
const path = require('path');

const date = '2026-08-11';
const exchangeRate = '约 7.00';

const programs = [
  {
    slug: 'aeroplan-points',
    name: 'Air Canada Aeroplan',
    shortName: 'Aeroplan',
    base: '1.5', // Cents
    link: 'https://www.aircanada.com/ca/en/aco/home/aeroplan.html',
    sources: [
      { sourceName: 'TPG Monthly Valuations', sourceUrl: 'https://thepointsguy.com/guide/monthly-valuations/', sourceType: 'Editorial', program: 'Aeroplan', factSupported: 'Baseline Value (1.5¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'OMAAT Value Guide', sourceUrl: 'https://onemileatatime.com/guides/value-frequent-flyer-miles/', sourceType: 'Editorial', program: 'Aeroplan', factSupported: 'Baseline Value (1.5¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'Aeroplan Official Terms', sourceUrl: 'https://www.aircanada.com/ca/en/aco/home/aeroplan.html', sourceType: 'Official', program: 'Aeroplan', factSupported: 'Program Rules', sourcePublishedDate: 'N/A', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' }
    ],
    zh: {
      title: 'Air Canada Aeroplan 里程估值与使用攻略',
      desc: '深度解析加拿大航空 Aeroplan (加航) 里程的市场估值、星空联盟最佳兑换方式以及避坑指南。',
      intro: 'Aeroplan 是加拿大航空 (Air Canada) 的常旅客计划。作为星空联盟 (Star Alliance) 的重要成员，Aeroplan 里程以其极具竞争力的兑换图表、允许停留 (Stopover) 以及丰富的合作伙伴而闻名，是常旅客界最受欢迎的航司里程之一。',
      baseRMB: '0.10 - 0.12',
      examples: '兑换长荣航空 (EVA Air)、全日空 (ANA) 的跨洋商务舱，或在北美境内兑换美联航 (United) 的短途机票。',
      risk: 'Aeroplan 采用了混合动态定价（对自家航班动态，对伙伴航空固定）。同时，它经常面临“幽灵票”以及系统维护导致的无法出票问题。'
    },
    en: {
      title: 'Air Canada Aeroplan Points Value & Strategy Guide',
      desc: 'Discover the true value of Air Canada Aeroplan points. Learn the best Star Alliance redemptions, stopover tricks, and common pitfalls to avoid.',
      intro: 'Aeroplan is the frequent flyer program of Air Canada. As a key member of the Star Alliance, Aeroplan is renowned for its competitive award charts, generous stopover policies, and vast network of partner airlines, making it one of the most highly sought-after mileage currencies.',
      examples: 'Booking transpacific Business Class on EVA Air or ANA, or flying short-haul domestic flights in North America on United Airlines.',
      risk: 'Aeroplan uses a hybrid pricing model (dynamic for their own flights, fixed for partners). Additionally, users often encounter "phantom availability" and IT issues preventing ticketing.'
    }
  },
  {
    slug: 'amex-membership-rewards',
    name: 'Amex Membership Rewards (MR)',
    shortName: 'Amex MR',
    base: '2.0',
    link: 'https://www.americanexpress.com/en-us/rewards/membership-rewards/',
    sources: [
      { sourceName: 'TPG Monthly Valuations', sourceUrl: 'https://thepointsguy.com/guide/monthly-valuations/', sourceType: 'Editorial', program: 'Amex MR', factSupported: 'Baseline Value (2.0¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'OMAAT Value Guide', sourceUrl: 'https://onemileatatime.com/guides/value-frequent-flyer-miles/', sourceType: 'Editorial', program: 'Amex MR', factSupported: 'Baseline Value (1.7¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'Amex Official Rules', sourceUrl: 'https://www.americanexpress.com/en-us/rewards/membership-rewards/', sourceType: 'Official', program: 'Amex MR', factSupported: 'Transfer Ratios', sourcePublishedDate: 'N/A', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' }
    ],
    zh: {
      title: 'Amex Membership Rewards (MR) 积分估值与使用攻略',
      desc: '深度解析美国运通 Amex Membership Rewards (MR) 积分的市场估值、最佳转点兑换方式以及避坑指南。',
      intro: 'Amex MR 是美国运通 (American Express) 的灵活性信用卡积分系统。它是全球最主流、获取途径最广的信用卡积分之一。MR 的核心价值在于其极度丰富的转点伙伴网络。',
      baseRMB: '0.12 - 0.14',
      examples: '转点至全日空 (ANA) 兑换中美往返商务舱，或在转点加赠期间转入英国航空 (BA Avios) 兑换短途机票。',
      risk: 'MR 积分的最大风险在于转点比例调整以及高昂的持卡年费。此外，Amex 对部分美国国内航司转点会收取 Excise Tax 附加费。'
    },
    en: {
      title: 'Amex Membership Rewards (MR) Points Value Guide',
      desc: 'Maximize your Amex Membership Rewards points. Learn the best transfer partners, highest value redemptions, and how to avoid the excise tax.',
      intro: 'Amex Membership Rewards (MR) is American Express\'s flexible credit card rewards program. It is one of the most popular and easiest-to-earn points currencies globally. Its immense value lies in a massive network of airline and hotel transfer partners.',
      examples: 'Transferring to ANA Mileage Club for roundtrip Business Class to Asia, or transferring to British Airways Executive Club during a transfer bonus for short-haul flights.',
      risk: 'The main risks include potential changes to transfer ratios and high annual fees on premium cards. Furthermore, Amex charges an Excise Tax offset fee when transferring points to US domestic airlines.'
    }
  },
  {
    slug: 'avios',
    name: 'British Airways / Qatar Airways Avios',
    shortName: 'Avios',
    base: '1.5',
    link: 'https://www.britishairways.com/en-us/executive-club',
    sources: [
      { sourceName: 'TPG Monthly Valuations', sourceUrl: 'https://thepointsguy.com/guide/monthly-valuations/', sourceType: 'Editorial', program: 'Avios', factSupported: 'Baseline Value (1.5¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'OMAAT Value Guide', sourceUrl: 'https://onemileatatime.com/guides/value-frequent-flyer-miles/', sourceType: 'Editorial', program: 'Avios', factSupported: 'Baseline Value (1.3¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'British Airways Executive Club', sourceUrl: 'https://www.britishairways.com/en-us/executive-club', sourceType: 'Official', program: 'Avios', factSupported: 'Program Rules', sourcePublishedDate: 'N/A', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' }
    ],
    zh: {
      title: 'Avios (英国航空/卡塔尔航空) 里程估值与使用攻略',
      desc: '深度解析 Avios (英航/卡航等共用里程) 的市场估值、寰宇一家最佳兑换方式以及高额税费避坑指南。',
      intro: 'Avios 是一种由英国航空 (BA)、卡塔尔航空 (QR)、伊比利亚航空 (IB) 和芬兰航空 (AY) 共同使用的里程货币。它们可以在这几家航司的账户间以 1:1 的比例无损互转，常被称为“短途神器”。',
      baseRMB: '0.08 - 0.10',
      examples: '兑换美国航空 (AA) 或阿拉斯加航空 (AS) 的北美短途直飞，或兑换国泰航空 (Cathay Pacific) 的亚洲区域内短途。',
      risk: 'Avios 的致命伤是极其高昂的燃油附加费 (YQ)。如果你用它兑换长途商务舱，往往需要支付数百美元的税费。'
    },
    en: {
      title: 'Avios (British Airways / Qatar) Value & Strategy Guide',
      desc: 'Master the Avios ecosystem. Discover the best Oneworld short-haul redemptions and learn how to avoid British Airways\' massive fuel surcharges.',
      intro: 'Avios is the shared currency of British Airways, Qatar Airways, Iberia, and Finnair. Because you can freely transfer Avios between these programs at a 1:1 ratio, it offers incredible flexibility and is widely known as the king of short-haul redemptions.',
      examples: 'Booking short-haul nonstop flights on American Airlines or Alaska Airlines in North America, or intra-Asia hops on Cathay Pacific.',
      risk: 'The Achilles heel of Avios is exorbitant fuel surcharges (YQ). If you redeem Avios for long-haul Business or First Class, particularly on British Airways, you can expect to pay many hundreds of dollars in taxes and fees.'
    }
  },
  {
    slug: 'capital-one-miles',
    name: 'Capital One Miles',
    shortName: 'Capital One Miles',
    base: '1.85',
    link: 'https://www.capitalone.com/credit-cards/travel-and-miles/',
    sources: [
      { sourceName: 'TPG Monthly Valuations', sourceUrl: 'https://thepointsguy.com/guide/monthly-valuations/', sourceType: 'Editorial', program: 'Capital One Miles', factSupported: 'Baseline Value (1.85¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'Capital One Official Terms', sourceUrl: 'https://www.capitalone.com/credit-cards/travel-and-miles/', sourceType: 'Official', program: 'Capital One Miles', factSupported: 'Transfer Partners', sourcePublishedDate: 'N/A', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' }
    ],
    zh: {
      title: 'Capital One Miles (C1) 积分估值与使用攻略',
      desc: '深度解析 Capital One Miles 积分的市场估值、转点兑换技巧以及旅行报销避坑指南。',
      intro: 'Capital One Miles 是第一资本银行 (Capital One) 发行的灵活信用卡积分。近年来通过不断增加 1:1 的高价值转点伙伴（如 Aeroplan, Avianca LifeMiles），它已经跃升为顶级的旅行积分货币。',
      baseRMB: '0.11 - 0.13',
      examples: '按 1:1 比例转入哥伦比亚航空 (LifeMiles) 兑换星空联盟航班，或通过 Capital One Travel Portal 以 1 point = 1 cent 的保底比例直接报销旅行花费。',
      risk: 'C1 的审批极为严格。积分体系本身相对稳定，但某些小众合作伙伴的转点比例并非 1:1，转点前必须仔细核对。'
    },
    en: {
      title: 'Capital One Miles Value & Transfer Partner Guide',
      desc: 'Learn how much your Capital One Miles are worth. Explore the best transfer partners, purchase eraser tricks, and how to maximize your Venture miles.',
      intro: 'Capital One Miles is the flexible rewards currency earned on Venture cards. By expanding its roster of 1:1 transfer partners (like Aeroplan and Avianca LifeMiles) over recent years, it has become a top-tier travel currency.',
      examples: 'Transferring 1:1 to Avianca LifeMiles for Star Alliance awards without fuel surcharges, or simply "erasing" travel purchases at a fixed baseline value of 1 cent per point.',
      risk: 'Capital One is known for very strict credit card approval rules. While the miles are stable, not all transfer partners are at a 1:1 ratio—always double-check before transferring.'
    }
  },
  {
    slug: 'chase-ultimate-rewards',
    name: 'Chase Ultimate Rewards (UR)',
    shortName: 'Chase UR',
    base: '2.05',
    link: 'https://ultimaterewardspoints.chase.com/',
    sources: [
      { sourceName: 'TPG Monthly Valuations', sourceUrl: 'https://thepointsguy.com/guide/monthly-valuations/', sourceType: 'Editorial', program: 'Chase UR', factSupported: 'Baseline Value (2.05¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'OMAAT Value Guide', sourceUrl: 'https://onemileatatime.com/guides/value-frequent-flyer-miles/', sourceType: 'Editorial', program: 'Chase UR', factSupported: 'Baseline Value (1.7¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'Chase Ultimate Rewards Portal', sourceUrl: 'https://ultimaterewardspoints.chase.com/', sourceType: 'Official', program: 'Chase UR', factSupported: 'Program Rules', sourcePublishedDate: 'N/A', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' }
    ],
    zh: {
      title: 'Chase Ultimate Rewards (UR) 积分估值与使用攻略',
      desc: '深度解析大通银行 Chase Ultimate Rewards (UR) 积分的市场估值、最佳转点兑换方式以及避坑指南。',
      intro: 'Chase UR 是大通银行 (JPMorgan Chase) 的灵活信用卡积分。由于其极高的稳定性和凯悦酒店 (Hyatt) 这个强势转点伙伴，UR 被许多常旅客玩家视为最有价值的银行积分。',
      baseRMB: '0.13 - 0.15',
      examples: '1:1 转入 World of Hyatt 兑换高端奢华酒店，或转入美联航 (United Airlines) 兑换星空联盟网络。',
      risk: 'Chase 有严格的 5/24 批卡规则。虽然 UR 极少贬值，但其合作伙伴（如 Hyatt 的旺季定价、United 的动态定价）的持续贬值会间接影响 UR 的购买力。'
    },
    en: {
      title: 'Chase Ultimate Rewards (UR) Points Value Guide',
      desc: 'Discover why Chase UR points are often considered the most valuable currency. Learn how to maximize Hyatt transfers and navigate the 5/24 rule.',
      intro: 'Chase Ultimate Rewards (UR) is JPMorgan Chase\'s highly flexible credit card points program. Thanks to its remarkable stability and a uniquely powerful 1:1 transfer partnership with World of Hyatt, UR points are widely considered the gold standard of bank rewards.',
      examples: 'Transferring 1:1 to World of Hyatt to book luxury resorts, or moving points to United MileagePlus for Star Alliance awards.',
      risk: 'Chase enforce a strict 5/24 approval rule. While UR itself rarely devalues, the purchasing power of your points can decrease when partners (like United moving to dynamic pricing or Hyatt introducing peak pricing) devalue their own award charts.'
    }
  },
  {
    slug: 'citi-thankyou-points',
    name: 'Citi ThankYou Points (TYP)',
    shortName: 'Citi TYP',
    base: '1.8',
    link: 'https://www.thankyou.com/',
    sources: [
      { sourceName: 'TPG Monthly Valuations', sourceUrl: 'https://thepointsguy.com/guide/monthly-valuations/', sourceType: 'Editorial', program: 'Citi TYP', factSupported: 'Baseline Value (1.8¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'OMAAT Value Guide', sourceUrl: 'https://onemileatatime.com/guides/value-frequent-flyer-miles/', sourceType: 'Editorial', program: 'Citi TYP', factSupported: 'Baseline Value (1.7¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'Citi ThankYou Official', sourceUrl: 'https://www.thankyou.com/', sourceType: 'Official', program: 'Citi TYP', factSupported: 'Transfer Partners', sourcePublishedDate: 'N/A', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' }
    ],
    zh: {
      title: 'Citi ThankYou Points (TYP) 积分估值与使用攻略',
      desc: '深度解析花旗银行 Citi ThankYou Points (TYP) 积分的市场估值、最佳转点兑换方式以及长荣航空兑换指南。',
      intro: 'Citi TYP 是花旗银行 (Citibank) 的灵活信用卡积分。虽然其国内航班合作伙伴不如 Chase 和 Amex 强势，但 TYP 在兑换长荣航空 (EVA Air) 和土耳其航空 (Turkish Airlines) 时具有独特优势。',
      baseRMB: '0.11 - 0.13',
      examples: '1:1 转入长荣航空 (Infinity MileageLands) 兑换中美跨洋商务舱，或转入哥伦比亚航空 (LifeMiles)。',
      risk: '花旗的 IT 系统经常被用户诟病，且 TYP 取消了原有的机票直接抵扣保底福利，现在必须依赖转点才能用出高价值。'
    },
    en: {
      title: 'Citi ThankYou Points (TYP) Value & Strategy Guide',
      desc: 'Maximize your Citi ThankYou Points. Explore the best international transfer partners like EVA Air and Turkish Airlines to get outsized value.',
      intro: 'Citi ThankYou Points (TYP) is Citibank\'s flexible rewards currency. While it lacks a strong US domestic airline partner compared to Chase or Amex, TYP shines in international premium cabin redemptions through partners like EVA Air and Turkish Airlines.',
      examples: 'Transferring 1:1 to EVA Air Infinity MileageLands for transpacific Business Class, or transferring to Turkish Miles&Smiles for incredible domestic sweet spots.',
      risk: 'Citi is notorious for IT issues and poor customer service. Furthermore, TYP removed its fixed-value travel portal redemption bonus, meaning you must utilize transfer partners to get good value.'
    }
  },
  {
    slug: 'hilton-points',
    name: 'Hilton Honors',
    shortName: 'Hilton Honors',
    base: '0.6',
    link: 'https://www.hilton.com/en/hilton-honors/',
    sources: [
      { sourceName: 'TPG Monthly Valuations', sourceUrl: 'https://thepointsguy.com/guide/monthly-valuations/', sourceType: 'Editorial', program: 'Hilton Honors', factSupported: 'Baseline Value (0.6¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'OMAAT Value Guide', sourceUrl: 'https://onemileatatime.com/guides/value-frequent-flyer-miles/', sourceType: 'Editorial', program: 'Hilton Honors', factSupported: 'Baseline Value (0.4¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'Hilton Honors Official Terms', sourceUrl: 'https://www.hilton.com/en/hilton-honors/', sourceType: 'Official', program: 'Hilton Honors', factSupported: '5th Night Free', sourcePublishedDate: 'N/A', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' }
    ],
    zh: {
      title: 'Hilton Honors (希尔顿荣誉客会) 积分估值与使用攻略',
      desc: '深度解析希尔顿酒店 Hilton Honors 积分的市场估值、第五晚免费权益以及兑换避坑指南。',
      intro: 'Hilton Honors 是希尔顿酒店集团的常客计划。希尔顿积分以获取极度容易（动辄十几万分的开卡奖励、极高的入住回血比例）而闻名，但也因此单点价值极低，常被戏称为“冥币”。',
      baseRMB: '0.03 - 0.04',
      examples: '兑换极高端奢华度假村（如马尔代夫康莱德），或在节假日极端高价期间兑换基础房型。利用“积分兑换连住 5 晚免收第 5 晚积分” (Fifth Night Free) 权益。',
      risk: '希尔顿早已全面实行动态定价，取消了等级图表 (Award Chart)。普通日期的积分房价值通常被限制在极低的水平，较难用出超额价值。'
    },
    en: {
      title: 'Hilton Honors Points Value & Redemption Guide',
      desc: 'Learn the true value of Hilton Honors points. Discover how to use the 5th Night Free perk to maximize your redemptions at luxury resorts.',
      intro: 'Hilton Honors is the loyalty program for Hilton Hotels. It is incredibly easy to earn large quantities of Hilton points through credit card sign-up bonuses and hotel stays, but this inflation results in a very low per-point valuation.',
      examples: 'Booking ultra-luxury resorts (like the Conrad Maldives) or securing standard rooms during extreme peak pricing events. Leveraging the "Fifth Night Free" benefit on award stays to boost your CPP.',
      risk: 'Hilton operates on a fully dynamic pricing model and has completely abolished its award chart. On average dates, the value of a point is heavily capped, making it difficult to find outsized value outside of extreme edge cases.'
    }
  },
  {
    slug: 'hyatt-points',
    name: 'World of Hyatt',
    shortName: 'World of Hyatt',
    base: '1.7',
    link: 'https://world.hyatt.com/',
    sources: [
      { sourceName: 'TPG Monthly Valuations', sourceUrl: 'https://thepointsguy.com/guide/monthly-valuations/', sourceType: 'Editorial', program: 'World of Hyatt', factSupported: 'Baseline Value (1.7¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'OMAAT Value Guide', sourceUrl: 'https://onemileatatime.com/guides/value-frequent-flyer-miles/', sourceType: 'Editorial', program: 'World of Hyatt', factSupported: 'Baseline Value (1.5¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'World of Hyatt Official', sourceUrl: 'https://world.hyatt.com/', sourceType: 'Official', program: 'World of Hyatt', factSupported: 'Peak/Off-Peak Charts', sourcePublishedDate: 'N/A', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' }
    ],
    zh: {
      title: 'World of Hyatt (凯悦天地) 积分估值与使用攻略',
      desc: '深度解析凯悦酒店 World of Hyatt 积分的市场估值、淡旺季图表以及最佳兑换方式。',
      intro: 'World of Hyatt 是凯悦酒店集团的常客计划。在各大酒店集团纷纷走向动态定价的今天，凯悦是目前仍保留固定兑换图表（含淡旺季）的主流集团之一。这使得其积分价值傲视群雄。',
      baseRMB: '0.12 - 0.15',
      examples: '兑换 Category 1 的大车店极具性价比，或者用于兑换柏悦 (Park Hyatt)、阿丽拉 (Alila) 等顶级奢华酒店的旺季基础房。',
      risk: '凯悦每年会进行等级调整 (Category Adjustment)，将热门酒店升级（变相贬值）。此外，部分热门度假村常设置苛刻的最短连住要求来限制积分兑换。'
    },
    en: {
      title: 'World of Hyatt Points Value & Sweet Spots',
      desc: 'World of Hyatt points are the most valuable hotel currency. Learn how to maximize their award chart, find sweet spots, and book luxury stays.',
      intro: 'World of Hyatt is the loyalty program for Hyatt Hotels. As other major hotel chains have moved to fully dynamic pricing, Hyatt is one of the few that still maintains a fixed award chart (with Off-Peak, Standard, and Peak pricing). This makes Hyatt points the most valuable hotel currency on the market.',
      examples: 'Getting incredible value at Category 1 road-trip hotels, or booking peak-season standard rooms at ultra-luxury brands like Park Hyatt or Alila.',
      risk: 'Hyatt conducts annual Category Adjustments, shifting popular properties to higher tiers (a stealth devaluation). Additionally, some highly desirable resorts game the system by enforcing minimum-stay requirements to block award redemptions.'
    }
  },
  {
    slug: 'marriott-points',
    name: 'Marriott Bonvoy',
    shortName: 'Marriott Bonvoy',
    base: '0.84',
    link: 'https://www.marriott.com/loyalty.mi',
    sources: [
      { sourceName: 'TPG Monthly Valuations', sourceUrl: 'https://thepointsguy.com/guide/monthly-valuations/', sourceType: 'Editorial', program: 'Marriott Bonvoy', factSupported: 'Baseline Value (0.84¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'OMAAT Value Guide', sourceUrl: 'https://onemileatatime.com/guides/value-frequent-flyer-miles/', sourceType: 'Editorial', program: 'Marriott Bonvoy', factSupported: 'Baseline Value (0.7¢)', sourcePublishedDate: '2026-08-01', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' },
      { sourceName: 'Marriott Bonvoy Official', sourceUrl: 'https://www.marriott.com/loyalty.mi', sourceType: 'Official', program: 'Marriott Bonvoy', factSupported: 'Dynamic Pricing', sourcePublishedDate: 'N/A', lastCheckedDate: '2026-08-11', language: 'en', status: 'Active' }
    ],
    zh: {
      title: 'Marriott Bonvoy (万豪旅享家) 积分估值与使用攻略',
      desc: '深度解析万豪酒店 Marriott Bonvoy 积分的市场估值、动态定价后的影响以及住五免一权益。',
      intro: 'Marriott Bonvoy 是全球最大酒店集团万豪国际的常客计划。万豪拥有最广泛的全球分布，但其积分体系近年来经历了贬值和全面动态化。',
      baseRMB: '0.05 - 0.06',
      examples: '在特别昂贵的跨年、节日期间兑换热门景区的酒店，或兑换马尔代夫等海岛的顶级奢华酒店。同样支持“住五免一” (Stay for 5, Pay for 4)。',
      risk: '万豪已经取消了固定的兑换图表，实行全面动态定价。绝大多数时候，积分兑换价值被锚定在现金价的一定折扣范围内，较难重现过去的极高价值兑换。'
    },
    en: {
      title: 'Marriott Bonvoy Points Value & Redemption Guide',
      desc: 'Evaluate your Marriott Bonvoy points under dynamic pricing. Learn how to use the Stay for 5, Pay for 4 benefit to increase your redemption value.',
      intro: 'Marriott Bonvoy is the loyalty program for Marriott International, the largest hotel chain in the world. While it boasts an unmatched global footprint, the points program has suffered from significant devaluations and a transition to dynamic pricing.',
      examples: 'Booking aspirational properties in places like the Maldives or Bora Bora, or using points during peak events (like New Year\'s Eve). Utilizing the "Stay for 5, Pay for 4" benefit on award bookings.',
      risk: 'Marriott has retired its award charts in favor of dynamic pricing. Most of the time, the point price is strictly tethered to the cash rate, making it very difficult to find outsized value.'
    }
  }
];

const zhTemplate = (meta) => {
  const sourcesHtml = meta.sources.map(s => `<li><strong>[${s.sourceType}] ${s.sourceName}</strong>: <a href="${s.sourceUrl}" target="_blank" rel="noopener">${s.factSupported}</a> (Last checked: ${s.lastCheckedDate})</li>`).join('\n  ');
  return `---
layout: base.njk
title: ${meta.zh.title}
description: ${meta.zh.desc}
schemaType: Article
eyebrow: 里程账 · 估值分析
breadcrumbs:
  - name: 积分估值
    url: /values/
  - name: ${meta.shortName}
---
<h1>${meta.zh.title}</h1>
<p class="lead">${meta.zh.intro}</p>

<h2>什么是 ${meta.name}？</h2>
<p>${meta.zh.intro} 本文将全面解析该常客计划的市场参考估值、常见兑换方式以及你需要警惕的潜在风险。</p>

<h2>当前市场参考估值 (CPP)</h2>
<div class="callout">
  <strong>核心声明：</strong> 常客计划的积分和里程不具备法定的固定价值。以下估值区间综合了英文媒体与常旅客圈的行业参考（美元原值按汇率 ${exchangeRate} 概算为人民币），仅供参考。
</div>
<p>在业界普遍参考中，${meta.name} 的基准估值约为 <strong>${meta.zh.baseRMB} 元/点</strong>。</p>
<p>你在实际使用中，价值（CPP, Cents Per Point）会呈现明显的差异：</p>
<ul>
  <li><strong>较差兑换（明显低于基准线）</strong>：通常发生在直接抵扣信用卡账单、在积分商城兑换实物商品（如 Apple 电子产品）、或者在淡季兑换现金价格本身就很便宜的航班/酒店。</li>
  <li><strong>标准兑换（处于基准线区间内）</strong>：兑换绝大多数热门日期的经济舱，或中规中矩的商务型酒店。这是最常见的场景。</li>
  <li><strong>超值兑换（远超基准线）</strong>：通常只有在兑换跨洋头等舱/商务舱、极度紧俏的节假日机票，或者顶级奢华度假村时才能达到。这也是“玩卡”获得超额收益的主要来源。</li>
</ul>

<h2>常见高价值兑换方式与示例</h2>
<p>${meta.name} 玩家公认的常见用法通常包括：</p>
<p><em>${meta.zh.examples}</em></p>

<h3>如何自行验证是否划算？</h3>
<p>当你准备兑换时，请按照以下步骤自行验证：</p>
<ol>
  <li>查出你想订的那个航班/酒店如果在第三方预定平台直接花钱，<strong>真实需要支付多少现金</strong>。</li>
  <li>查出用积分预定，需要多少积分，<strong>并且还要另外支付多少税费</strong>。</li>
  <li>将这两个数字输入我们的免费工具进行计算：</li>
</ol>
<ul>
  <li>👉 <a href="/calculators/cents-per-point/">CPP 基础计算器</a>（快速算价值）</li>
  <li>👉 <a href="/calculators/points-vs-cash/">积分 vs 现金高级计算器</a>（综合考量隐藏成本，给出最终决策）</li>
</ul>
<p>只要你算出的 CPP 高于你在上方看到的基准线，并且你本身确实有这项消费需求，那就是一次不错的兑换。</p>

<h2>潜在风险与避坑指南</h2>
<ul>
  <li><strong>贬值风险 (Devaluation)</strong>：积分就像没有利息的货币，可能会因航司/酒店的规则修改而缩水。建议“Earn and Burn”（随赚随花），不建议把积分当成理财产品囤积。</li>
  <li><strong>幽灵票与仓位限制</strong>：查到有票不等于能出票。${meta.zh.risk}</li>
  <li><strong>转点单向性与延迟</strong>：如果这是信用卡积分，一旦转入航司或酒店，就<strong>无法退回银行</strong>。必须在确认真的有票且能定上的情况下再执行转点。转点前可以使用我们的 <a href="/calculators/transfer-bonus/">转点加赠计算器</a> 避免转错零头。</li>
</ul>

<h2>数据来源与最后事实核查</h2>
<ul>
  ${sourcesHtml}
  <li><strong>数据汇率折算</strong>：按美元基准参考价估算，当前参考汇率 ${exchangeRate}</li>
</ul>
<p class="disclaimer"><em>最后事实核查时间：${date}。免责声明：本站提供的估值与计算结果仅供参考，不构成任何财务建议。</em></p>
`;
};

const enTemplate = (meta) => {
  const sourcesHtml = meta.sources.map(s => `<li><strong>[${s.sourceType}] ${s.sourceName}</strong>: <a href="${s.sourceUrl}" target="_blank" rel="noopener">${s.factSupported}</a> (Last checked: ${s.lastCheckedDate})</li>`).join('\n  ');
  return `---
layout: base.njk
title: ${meta.en.title}
description: ${meta.en.desc}
schemaType: Article
eyebrow: Valuations
breadcrumbs:
  - name: Points Valuations
    url: /en/values/
  - name: ${meta.shortName}
---
<h1>${meta.en.title}</h1>
<p class="lead">${meta.en.intro}</p>

<h2>What is ${meta.name}?</h2>
<p>${meta.en.intro} In this guide, we break down its estimated market value, popular redemption sweet spots, and the pitfalls you need to avoid.</p>

<h2>Current Market Valuation (CPP)</h2>
<div class="callout">
  <strong>Editorial Disclaimer:</strong> Loyalty points and miles do not have a fixed, legal cash value. The valuations below are editorial estimates based on industry consensus and real-world redemption data.
</div>
<p>The generally accepted baseline value for ${meta.name} is around <strong>${meta.base}¢ per point</strong>.</p>
<p>When you actually redeem your points, the value you get (Cents Per Point, or CPP) will fall into one of three categories:</p>
<ul>
  <li><strong>Poor Redemptions (Below Baseline)</strong>: This usually happens when redeeming points for statement credits, merchandise (like Apple products), or off-peak economy flights that are already very cheap in cash.</li>
  <li><strong>Standard Redemptions (At Baseline)</strong>: Redeeming for standard economy flights on popular dates or mid-tier business hotels. This is the most common use case.</li>
  <li><strong>Outsized Value (Above Baseline)</strong>: Typically achieved when redeeming for international First or Business Class, extremely expensive last-minute flights, or ultra-luxury resorts. This is where the true power of points lies.</li>
</ul>

<h2>Sweet Spots and Redemption Examples</h2>
<p>Some of the most popular and lucrative ways to use ${meta.name} include:</p>
<p><em>${meta.en.examples}</em></p>

<h3>How to verify your own redemption?</h3>
<p>Never blindly trust online valuations. Before you book, verify the math yourself:</p>
<ol>
  <li>Find the <strong>real cash price</strong> you would actually be willing to pay for the flight or hotel.</li>
  <li>Note the <strong>points required</strong> AND any <strong>cash taxes/fees</strong> you must pay.</li>
  <li>Plug those numbers into our free tools:</li>
</ol>
<ul>
  <li>👉 <a href="/en/calculators/cents-per-point/">CPP Calculator</a> (Quick value check)</li>
  <li>👉 <a href="/en/calculators/points-vs-cash/">Advanced Points vs Cash Calculator</a> (Factors in hidden costs for a final verdict)</li>
</ul>
<p>If your calculated CPP is higher than the baseline value above, and you actually need the travel, you are getting a great deal.</p>

<h2>Risks and Pitfalls</h2>
<ul>
  <li><strong>Devaluation Risk</strong>: Points are like currency that pays no interest and is subject to inflation. Airlines and hotels frequently devalue their programs. Our advice is to "Earn and Burn"—do not hoard points as a long-term investment.</li>
  <li><strong>Phantom Availability</strong>: Seeing an award seat doesn't guarantee you can book it. ${meta.en.risk}</li>
  <li><strong>One-Way Transfers</strong>: If these are credit card points, transferring them to an airline or hotel is <strong>irreversible</strong>. Never transfer points until you have confirmed award availability. Use our <a href="/en/calculators/transfer-bonus/">Transfer Bonus Calculator</a> to transfer the exact right amount.</li>
</ul>

<h2>Data Sources and Last Fact-Checked</h2>
<ul>
  ${sourcesHtml}
</ul>
<p class="disclaimer"><em>Last Fact-Checked: ${date}. Editorial Disclaimer: Valuations are estimates for educational purposes and do not constitute financial advice.</em></p>
`;
};

programs.forEach(meta => {
  const zhPath = path.join(__dirname, '../src/values/', meta.slug + '.md');
  const enPath = path.join(__dirname, '../src/en/values/', meta.slug + '.md');
  fs.writeFileSync(zhPath, zhTemplate(meta));
  fs.writeFileSync(enPath, enTemplate(meta));
});
