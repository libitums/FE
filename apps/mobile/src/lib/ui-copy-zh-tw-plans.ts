// 대만 중국어(번체, zh-TW) 문구표 구획 — 요금제(ADR-0144) · 구독 고지 · 하나의 상점 · 구독 입구(ADR-0160) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).
// 요금제 · 상품 이름(Unlimited Tickets · Chat Plus · Premium, 칩의 PREMIUM · CHAT+ · TICKETS)은 스토어 상품명과 같게 영어로 둡니다(ADR-0144 · ADR-0160).
// 엽전은 「Yeopjeon」(ADR-0116). 날짜는 달 이름 표 없이 숫자 「月日」로 씁니다(Android PrimJS).

import type { PlansCopy } from "./ui-copy-plans";
import type { ShopCopy } from "./ui-copy-shop";

const planShort = { unlimited_tickets: "Tickets ∞", chat_plus: "Chat Plus", premium: "Premium" };
const chipPlans = { premium: "PREMIUM", chat_plus: "CHAT+", unlimited_tickets: "TICKETS" };

export const shopCopyZhTw: ShopCopy = {
  tabsLabel: "商店",
  tabs: { coins: "Yeopjeon", plans: "方案" },
  yourPlan: "你的方案",
  planShort: { free: "免費", ...planShort },
  yourPlanLabel: (plan) => `你的方案：${plan}`,
  promo: {
    premium: (coins) => `訂閱 Premium，每月獲得 ${coins} Yeopjeon`,
    chatPlus: (perDay) => `繼續聊天 — Chat Plus 每天免費${perDay}則`,
    action: "方案 ›",
  },
  outOfTickets: "票券用完了？不用等也能學習",
  headline: {
    everything: "全部無限制",
    chats: (perDay) => `每天${perDay}則聊天`,
    unlimitedChat: "無限聊天",
    learn: "不用等就能學習",
  },
  detail: {
    everyUnit: "所有單元，票券無限制",
    allFriends: "所有朋友",
    coinsShort: (coins) => `+${coins} Yeopjeon/月`,
    coinsLong: (coins) => `每月 +${coins} Yeopjeon`,
  },
  perMonthShort: "/ 月",
  perYearShort: "/ 年",
  saving: (percent) => `-${percent}%`,
  date: (month, day) => `${month + 1}月${day}日`,
  current: (date, renews) =>
    date === null ? "目前方案" : `目前方案 · ${date}${renews ? "續訂" : "到期"}`,
  scheduled: (plan, date) =>
    date === null ? `目前方案 · 續訂時改為 ${plan}` : `目前方案 · ${date}起改為 ${plan}`,
  tag: {
    upgrade: "升級 · 立即生效",
    switchAt: (date) => (date === null ? "變更 · 續訂時生效" : `變更 · ${date}生效`),
    switch: "變更",
  },
  cta: {
    continueWith: (name) => `繼續使用 ${name}`,
    upgradeTo: (name) => `升級到 ${name}`,
    switchTo: (name) => `變更為 ${name}`,
    switchPeriod: { monthly: "改為月繳", yearly: "改為年繳" },
    from: (date) => (date === null ? "從下次續訂開始" : `從${date}開始`),
    pick: "選擇方案",
  },
  change: {
    upgrade: (from, to, store) =>
      `升級後會立即從 ${from} 改為 ${to}；${store} 會退還 ${from} 未使用部分的費用。`,
    later: (from, to, date) =>
      `你可以繼續使用 ${from} 直到${date ?? "下次續訂"}，之後開始使用 ${to}。`,
    crossgrade: (from, to, store) =>
      `${to} 會取代 ${from}；由 ${store} 決定變更生效的時間，並退還未使用期間的費用。`,
  },
  chip: { plans: "方案", ...chipPlans },
  goUnlimited: (price) => (price === null ? "無限暢用" : `無限暢用 · ${price}/月`),
  activated: {
    startsAt: (name, date) =>
      date === null ? `${name} 將在續訂時開始` : `${name} 將於${date}開始`,
    keep: (from) => `在那之前你可以繼續使用 ${from}`,
    title: (name) => `${name} 已啟用`,
    body: {
      unlimited_tickets: "不需票券就能開始任何課程",
      chat_plus: "每天和所有朋友聊更多",
      premium: "課程和聊天都無限制",
    },
  },
};

export const plansZhTw: PlansCopy = {
  title: "方案",
  subtitle: "無限制地學習和聊天",
  names: { unlimited_tickets: "Unlimited Tickets", chat_plus: "Chat Plus", premium: "Premium" },
  best: "最划算",
  perMonth: (price) => `${price} / 月`,
  perYear: (price) => `${price} / 年`,
  priceInStore: "價格以商店顯示為準",
  monthly: "月繳",
  yearly: "年繳",
  periodLabel: "計費週期",
  yearlyNote: (percent) => (percent === null ? "年繳：每月更省" : `年繳：省${percent}%`),
  benefit: {
    unlimitedLessons: "無限課程，不用等待",
    freeMessages: (perDay) => `每天${perDay}則免費訊息`,
    unlimitedChat: (fairUse) =>
      fairUse === null ? "無限聊天" : `無限聊天（合理使用每天${fairUse}則）`,
    monthlyCoins: (coins) => `每月 +${coins} Yeopjeon`,
    allCharacters: "和所有角色聊天",
  },
  continueWith: (name) => `繼續使用 ${name}`,
  restore: "恢復購買",
  unavailable: "付款功能即將推出 — 準備好時我們會通知你。",
  loadFailed: "無法載入方案。請檢查網路連線後再試一次。",
  settingsRow: "方案",
  settingsRowDescription: "Unlimited Tickets · Chat Plus · Premium",
  goUnlimited: "無限暢用",
  compare: "比較方案",
  selected: "已選取",
  terms: {
    disclosure: (name, price, store) =>
      `${name}：${price}。費用將從你的 ${store} 帳號扣款。除非你在目前週期結束前至少24小時取消，否則訂閱將以相同價格自動續訂。你隨時可以在 ${store} 帳號設定中管理或取消訂閱。`,
    short: "自動續訂，可隨時取消。",
    stores: { ios: "App Store", android: "Google Play", unknown: "應用程式商店" },
    termsOfUse: "使用條款",
    privacyPolicy: "隱私權政策",
    current: "目前方案",
    manage: "管理訂閱",
  },
  shop: shopCopyZhTw,
};
