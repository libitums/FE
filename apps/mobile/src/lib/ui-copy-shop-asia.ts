// 하나의 상점 · 구독 입구 문구(ADR-0160)의 ja · vi 판 — 구조와 규칙은 `ui-copy-shop.ts`가 집니다.

import type { ShopCopy } from "./ui-copy-shop";

const planShort = { unlimited_tickets: "Tickets ∞", chat_plus: "Chat Plus", premium: "Premium" };
const chipPlans = { premium: "PREMIUM", chat_plus: "CHAT+", unlimited_tickets: "TICKETS" };

export const shopCopyJa: ShopCopy = {
  tabsLabel: "ショップ",
  tabs: { coins: "Yeopjeon", plans: "プラン" },
  yourPlan: "現在のプラン",
  planShort: { free: "無料", ...planShort },
  yourPlanLabel: (plan) => `現在のプラン：${plan}`,
  promo: {
    premium: (coins) => `Premiumなら毎月${coins} Yeopjeon`,
    chatPlus: (perDay) => `Chat Plusなら1日${perDay}通まで無料でチャット`,
    action: "プラン ›",
  },
  outOfTickets: "チケット切れ？待たずに学べます",
  headline: {
    everything: "すべて無制限",
    chats: (perDay) => `1日${perDay}チャット`,
    unlimitedChat: "チャット無制限",
    learn: "待たずに学べる",
  },
  detail: {
    everyUnit: "全ユニット、チケット制限なし",
    allFriends: "すべての友だち",
    coinsShort: (coins) => `毎月+${coins} Yeopjeon`,
    coinsLong: (coins) => `毎月+${coins} Yeopjeon`,
  },
  perMonthShort: "/ 月",
  perYearShort: "/ 年",
  saving: (percent) => `-${percent}%`,
  date: (month, day) => `${month + 1}月${day}日`,
  current: (date, renews) =>
    date === null ? "現在のプラン" : `現在のプラン · ${date}に${renews ? "更新" : "終了"}`,
  tag: {
    upgrade: "アップグレード · すぐ開始",
    switchAt: (date) => (date === null ? "変更 · 次の更新から" : `変更 · ${date}から`),
    switch: "変更",
  },
  cta: {
    continueWith: (name) => `${name}で続ける`,
    upgradeTo: (name) => `${name}にアップグレード`,
    switchTo: (name) => `${name}に変更`,
    switchPeriod: { monthly: "月払いに変更", yearly: "年払いに変更" },
    from: (date) => (date === null ? "次の更新から" : `${date}から`),
    pick: "プランを選んでください",
  },
  change: {
    upgrade: (from, to, store) =>
      `アップグレードすると${from}からすぐ${to}に切り替わり、${from}の未使用分は${store}が精算します。`,
    later: (from, to, date) =>
      `${date ?? "次の更新"}まで${from}を使え、その後${to}が始まります。`,
    crossgrade: (from, to, store) =>
      `${to}が${from}に代わります。開始時期と未使用分の精算は${store}が決めます。`,
  },
  chip: { plans: "プラン", ...chipPlans },
  goUnlimited: (price) => (price === null ? "無制限にする" : `無制限にする · ${price}/月`),
  activated: {
    title: (name) => `${name}が有効になりました`,
    body: {
      unlimited_tickets: "チケットなしでどのレッスンも始められます",
      chat_plus: "毎日もっとチャット、すべての友だちと",
      premium: "レッスンもチャットも無制限",
    },
  },
};

export const shopCopyVi: ShopCopy = {
  tabsLabel: "Cửa hàng",
  tabs: { coins: "Yeopjeon", plans: "Gói" },
  yourPlan: "Gói của bạn",
  planShort: { free: "Miễn phí", ...planShort },
  yourPlanLabel: (plan) => `Gói của bạn: ${plan}`,
  promo: {
    premium: (coins) => `Nhận ${coins} Yeopjeon mỗi tháng với Premium`,
    chatPlus: (perDay) => `Trò chuyện tiếp — ${perDay} tin miễn phí mỗi ngày với Chat Plus`,
    action: "Gói ›",
  },
  outOfTickets: "Hết vé? Học không cần chờ",
  headline: {
    everything: "Không giới hạn mọi thứ",
    chats: (perDay) => `${perDay} tin mỗi ngày`,
    unlimitedChat: "Trò chuyện không giới hạn",
    learn: "Học không cần chờ",
  },
  detail: {
    everyUnit: "Mọi bài, không giới hạn vé",
    allFriends: "Mọi bạn",
    coinsShort: (coins) => `+${coins} Yeopjeon/tháng`,
    coinsLong: (coins) => `+${coins} Yeopjeon mỗi tháng`,
  },
  perMonthShort: "/ tháng",
  perYearShort: "/ năm",
  saving: (percent) => `-${percent}%`,
  date: (month, day) => `${day} thg ${month + 1}`,
  current: (date, renews) =>
    date === null ? "Gói hiện tại" : `Gói hiện tại · ${renews ? "gia hạn" : "kết thúc"} ${date}`,
  tag: {
    upgrade: "Nâng cấp · bắt đầu ngay",
    switchAt: (date) => (date === null ? "Đổi · khi gia hạn" : `Đổi · từ ${date}`),
    switch: "Đổi",
  },
  cta: {
    continueWith: (name) => `Tiếp tục với ${name}`,
    upgradeTo: (name) => `Nâng cấp lên ${name}`,
    switchTo: (name) => `Đổi sang ${name}`,
    switchPeriod: { monthly: "Đổi sang hằng tháng", yearly: "Đổi sang hằng năm" },
    from: (date) => (date === null ? "từ lần gia hạn tới" : `từ ${date}`),
    pick: "Chọn một gói",
  },
  change: {
    upgrade: (from, to, store) =>
      `Nâng cấp sẽ chuyển bạn từ ${from} sang ${to} ngay; ${store} hoàn lại phần chưa dùng của ${from}.`,
    later: (from, to, date) =>
      `Bạn vẫn dùng ${from} đến ${date ?? "lần gia hạn tới"}, sau đó ${to} bắt đầu.`,
    crossgrade: (from, to, store) =>
      `${to} thay cho ${from}; ${store} quyết định khi nào đổi và hoàn lại thời gian chưa dùng.`,
  },
  chip: { plans: "GÓI", ...chipPlans },
  goUnlimited: (price) =>
    price === null ? "Dùng không giới hạn" : `Dùng không giới hạn · ${price}/tháng`,
  activated: {
    title: (name) => `${name} đã bật`,
    body: {
      unlimited_tickets: "Bắt đầu bài học bất kỳ mà không cần vé",
      chat_plus: "Trò chuyện nhiều hơn mỗi ngày, với mọi bạn",
      premium: "Bài học và trò chuyện không giới hạn",
    },
  },
};
