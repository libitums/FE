// 미얀마어 문구표 구획 — 요금제(Plans 화면 · 구독 고지 · 하나의 상점 · 구독 입구).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).
// 요금제 · 상품 이름(Unlimited Tickets · Chat Plus · Premium)과 칩 글(PREMIUM · CHAT+ · TICKETS)은 스토어 상품명과 같게 영어로 둡니다
// (ADR-0144 · ADR-0160). 엽전은 「Yeopjeon」(ADR-0116). 날짜는 `Intl` 없이 달 이름 표로 씁니다(Android PrimJS).

import type { PlansCopy } from "./ui-copy-plans";
import type { ShopCopy } from "./ui-copy-shop";

const planShort = { unlimited_tickets: "Tickets ∞", chat_plus: "Chat Plus", premium: "Premium" };
const chipPlans = { premium: "PREMIUM", chat_plus: "CHAT+", unlimited_tickets: "TICKETS" };
// 양력 달 이름(미얀마어 음역)입니다. 미얀마어에는 널리 쓰는 달 약칭이 없어 온 이름을 씁니다.
const myMonths = [
  "ဇန်နဝါရီ",
  "ဖေဖော်ဝါရီ",
  "မတ်",
  "ဧပြီ",
  "မေ",
  "ဇွန်",
  "ဇူလိုင်",
  "ဩဂုတ်",
  "စက်တင်ဘာ",
  "အောက်တိုဘာ",
  "နိုဝင်ဘာ",
  "ဒီဇင်ဘာ",
];

export const shopCopyMy: ShopCopy = {
  tabsLabel: "ဆိုင်",
  tabs: { coins: "Yeopjeon", plans: "အစီအစဉ်" },
  yourPlan: "သင့်အစီအစဉ်",
  planShort: { free: "အခမဲ့", ...planShort },
  yourPlanLabel: (plan) => `သင့်အစီအစဉ်: ${plan}`,
  promo: {
    premium: (coins) => `Premium ဖြင့် လစဉ် ${coins} Yeopjeon ရယူပါ`,
    chatPlus: (perDay) => `ဆက်ချတ်ပါ — Chat Plus ဖြင့် တစ်နေ့ ${perDay} စောင် အခမဲ့`,
    action: "အစီအစဉ် ›",
  },
  outOfTickets: "လက်မှတ် ကုန်ပြီလား။ မစောင့်ဘဲ လေ့လာပါ",
  headline: {
    everything: "အားလုံး အကန့်အသတ်မဲ့",
    chats: (perDay) => `တစ်နေ့ ချတ် ${perDay} စောင်`,
    unlimitedChat: "ချတ် အကန့်အသတ်မဲ့",
    learn: "မစောင့်ဘဲ လေ့လာပါ",
  },
  detail: {
    everyUnit: "ယူနစ်အားလုံး၊ လက်မှတ် ကန့်သတ်ချက်မရှိ",
    allFriends: "သူငယ်ချင်းအားလုံး",
    coinsShort: (coins) => `+${coins} Yeopjeon/လ`,
    coinsLong: (coins) => `လစဉ် +${coins} Yeopjeon`,
  },
  perMonthShort: "/ လ",
  perYearShort: "/ နှစ်",
  saving: (percent) => `-${percent}%`,
  date: (month, day) => `${myMonths[month] ?? ""} ${day}`,
  current: (date, renews) =>
    date === null ? "လက်ရှိ အစီအစဉ်" : `လက်ရှိ အစီအစဉ် · ${date} တွင် ${renews ? "သက်တမ်းတိုးမည်" : "ကုန်ဆုံးမည်"}`,
  scheduled: (plan, date) =>
    date === null ? `လက်ရှိ အစီအစဉ် · သက်တမ်းတိုးချိန်မှ ${plan}` : `လက်ရှိ အစီအစဉ် · ${date} မှ ${plan}`,
  tag: {
    upgrade: "အဆင့်မြှင့် · ချက်ချင်း စမည်",
    switchAt: (date) => (date === null ? "ပြောင်းမည် · သက်တမ်းတိုးချိန်မှ" : `ပြောင်းမည် · ${date} မှ`),
    switch: "ပြောင်းမည်",
  },
  cta: {
    continueWith: (name) => `${name} ဖြင့် ဆက်သွားရန်`,
    upgradeTo: (name) => `${name} သို့ အဆင့်မြှင့်ရန်`,
    switchTo: (name) => `${name} သို့ ပြောင်းရန်`,
    switchPeriod: { monthly: "လစဉ်သို့ ပြောင်းရန်", yearly: "နှစ်စဉ်သို့ ပြောင်းရန်" },
    from: (date) => (date === null ? "နောက်သက်တမ်းတိုးချိန်မှ" : `${date} မှ`),
    pick: "အစီအစဉ်တစ်ခု ရွေးပါ",
  },
  change: {
    upgrade: (from, to, store) =>
      `အဆင့်မြှင့်လိုက်ပါက ${from} မှ ${to} သို့ ချက်ချင်း ပြောင်းပါမည်။ ${from} ၏ မသုံးရသေးသော အပိုင်းကို ${store} က ပြန်အမ်းပါမည်။`,
    later: (from, to, date) =>
      `${date ?? "နောက်သက်တမ်းတိုးချိန်"} အထိ ${from} ကို ဆက်သုံးနိုင်ပြီး ထို့နောက် ${to} စတင်ပါမည်။`,
    crossgrade: (from, to, store) =>
      `${to} သည် ${from} ကို အစားထိုးပါမည်။ ပြောင်းမည့်အချိန်နှင့် မသုံးရသေးသော အချိန်ကို ${store} က ဆုံးဖြတ်ပြီး ပြန်အမ်းပါမည်။`,
  },
  chip: { plans: "အစီအစဉ်", ...chipPlans },
  goUnlimited: (price) => (price === null ? "အကန့်အသတ်မဲ့ သုံးရန်" : `အကန့်အသတ်မဲ့ သုံးရန် · ${price}/လ`),
  activated: {
    startsAt: (name, date) =>
      date === null ? `${name} ကို သက်တမ်းတိုးချိန်မှ စတင်မည်` : `${name} ကို ${date} မှ စတင်မည်`,
    keep: (from) => `ထိုအချိန်အထိ ${from} ကို ဆက်သုံးနိုင်ပါသည်`,
    title: (name) => `${name} ဖွင့်ပြီးပါပြီ`,
    body: {
      unlimited_tickets: "မည်သည့်သင်ခန်းစာကိုမဆို လက်မှတ်မပါဘဲ စတင်ပါ",
      chat_plus: "သူငယ်ချင်းအားလုံးနှင့် နေ့တိုင်း ပိုများများ ချတ်ပါ",
      premium: "သင်ခန်းစာနှင့် ချတ် အကန့်အသတ်မဲ့",
    },
  },
};

export const plansMy: PlansCopy = {
  title: "အစီအစဉ်များ",
  subtitle: "အကန့်အသတ်မရှိ လေ့လာပြီး ချတ်ပါ",
  names: { unlimited_tickets: "Unlimited Tickets", chat_plus: "Chat Plus", premium: "Premium" },
  best: "အကောင်းဆုံး",
  perMonth: (price) => `${price} / လ`,
  perYear: (price) => `${price} / နှစ်`,
  priceInStore: "စျေးနှုန်းကို စတိုးတွင် ပြသည်",
  monthly: "လစဉ်",
  yearly: "နှစ်စဉ်",
  periodLabel: "ငွေပေးချေမည့် ကာလ",
  yearlyNote: (percent) => (percent === null ? "နှစ်စဉ်: တစ်လလျှင် ပိုသက်သာ" : `နှစ်စဉ်: ${percent}% သက်သာ`),
  benefit: {
    unlimitedLessons: "သင်ခန်းစာ အကန့်အသတ်မဲ့၊ စောင့်စရာမလို",
    freeMessages: (perDay) => `တစ်နေ့ အခမဲ့ မက်ဆေ့ချ် ${perDay} စောင်`,
    unlimitedChat: (fairUse) =>
      fairUse === null ? "ချတ် အကန့်အသတ်မဲ့" : `ချတ် အကန့်အသတ်မဲ့ (သင့်တင့်စွာ သုံးရန် တစ်နေ့ ${fairUse} စောင်)`,
    monthlyCoins: (coins) => `လစဉ် +${coins} Yeopjeon`,
    allCharacters: "ဇာတ်ကောင်အားလုံးနှင့် ချတ်ပါ",
  },
  continueWith: (name) => `${name} ဖြင့် ဆက်သွားရန်`,
  restore: "ဝယ်ယူမှုများ ပြန်ယူရန်",
  unavailable: "ငွေပေးချေမှု မကြာမီ ရောက်လာပါမည်။ အသင့်ဖြစ်ရင် အသိပေးပါမယ်။",
  loadFailed: "အစီအစဉ်များကို ဖွင့်၍ မရပါ။ အင်တာနက်ကို စစ်ပြီး ထပ်စမ်းကြည့်ပါ။",
  settingsRow: "အစီအစဉ်များ",
  settingsRowDescription: "Unlimited Tickets · Chat Plus · Premium",
  goUnlimited: "အကန့်အသတ်မဲ့ သုံးရန်",
  compare: "အစီအစဉ်များ နှိုင်းယှဉ်ရန်",
  selected: "ရွေးထားသည်",
  terms: {
    disclosure: (name, price, store) =>
      `${name}: ${price}။ ငွေကို သင့် ${store} အကောင့်မှ ကောက်ခံပါမည်။ လက်ရှိကာလ မကုန်မီ အနည်းဆုံး 24 နာရီအလိုတွင် မပယ်ဖျက်ပါက စာရင်းသွင်းမှုသည် တူညီသော စျေးနှုန်းဖြင့် အလိုအလျောက် သက်တမ်းတိုးပါမည်။ ${store} အကောင့် ဆက်တင်များတွင် အချိန်မရွေး စီမံ သို့မဟုတ် ပယ်ဖျက်နိုင်ပါသည်။`,
    short: "အလိုအလျောက် သက်တမ်းတိုးသည်။ အချိန်မရွေး ပယ်ဖျက်နိုင်သည်။",
    stores: { ios: "App Store", android: "Google Play", unknown: "အက်ပ်စတိုး" },
    termsOfUse: "အသုံးပြုမှု စည်းမျဉ်းများ",
    privacyPolicy: "ကိုယ်ရေးအချက်အလက် မူဝါဒ",
    current: "လက်ရှိ အစီအစဉ်",
    manage: "စာရင်းသွင်းမှု စီမံရန်",
  },
  shop: shopCopyMy,
};
