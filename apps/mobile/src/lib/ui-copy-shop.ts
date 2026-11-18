// 하나의 상점 · 구독 입구 문구(ADR-0160) — 상점 탭 · 엽전 탭 아래 요금제 줄 · Plans 카드 줄 · 구독 중 바꿈 · 머리 요금제 칩 · 티켓 모달 줄 ·
// 구독 성공 알림. 요금제 이름(Unlimited Tickets · Chat Plus · Premium)과 칩의 요금제 글(PREMIUM · CHAT+ · TICKETS)은 스토어 상품명과
// 같게 모든 언어에서 영어입니다. 날짜는 `Intl` 없이 달 이름 표로 씁니다(Android PrimJS). ja · vi는 `ui-copy-shop-asia.ts`.

import { shopCopyJa, shopCopyVi } from "./ui-copy-shop-asia";

type PlanKey = "unlimited_tickets" | "chat_plus" | "premium";

export type ShopCopy = {
  readonly tabsLabel: string;
  readonly tabs: { readonly coins: string; readonly plans: string };
  readonly yourPlan: string;
  readonly planShort: Readonly<Record<PlanKey | "free", string>>;
  /** 칩 · 오른쪽 위 카드의 낭독 — 「Your plan: Premium」. */
  readonly yourPlanLabel: (plan: string) => string;
  readonly promo: {
    /** `coins`는 쉼표를 찍은 글입니다. */
    readonly premium: (coins: string) => string;
    readonly chatPlus: (perDay: number) => string;
    readonly action: string;
  };
  readonly outOfTickets: string;
  readonly headline: {
    readonly everything: string;
    readonly chats: (perDay: number) => string;
    readonly unlimitedChat: string;
    readonly learn: string;
  };
  readonly detail: {
    readonly everyUnit: string;
    readonly allFriends: string;
    readonly coinsShort: (coins: string) => string;
    readonly coinsLong: (coins: string) => string;
  };
  /** 가격 아랫줄의 기간. */
  readonly perMonthShort: string;
  readonly perYearShort: string;
  /** 연간 토글 배지 — 「-17%」. */
  readonly saving: (percent: number) => string;
  /** 달(0~11) · 날 — 「Dec 18」. */
  readonly date: (month: number, day: number) => string;
  /** 지금 카드 — 날짜를 모르면 「Current plan」만. 갱신하지 않으면 끝나는 날. */
  readonly current: (date: string | null, renews: boolean) => string;
  readonly tag: {
    readonly upgrade: string;
    readonly switchAt: (date: string | null) => string;
    readonly switch: string;
  };
  readonly cta: {
    readonly continueWith: (name: string) => string;
    readonly upgradeTo: (name: string) => string;
    readonly switchTo: (name: string) => string;
    readonly switchPeriod: { readonly monthly: string; readonly yearly: string };
    readonly from: (date: string | null) => string;
    /** 아무것도 고르지 않았을 때(Premium 구독자) 막힌 단추. */
    readonly pick: string;
  };
  /** 구독 중 바꿈의 고지 문장 — 기존 고지 앞에 섭니다. */
  readonly change: {
    readonly upgrade: (from: string, to: string, store: string) => string;
    readonly later: (from: string, to: string, date: string | null) => string;
    readonly crossgrade: (from: string, to: string, store: string) => string;
  };
  readonly chip: Readonly<Record<PlanKey | "plans", string>>;
  readonly goUnlimited: (price: string | null) => string;
  readonly activated: {
    readonly title: (name: string) => string;
    readonly body: Readonly<Record<PlanKey, string>>;
  };
};

const planShort = { unlimited_tickets: "Tickets ∞", chat_plus: "Chat Plus", premium: "Premium" };
const chipPlans = { premium: "PREMIUM", chat_plus: "CHAT+", unlimited_tickets: "TICKETS" };
const enMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const esMonths = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];
const idMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export const shopCopy: Readonly<Record<"en" | "es" | "id" | "ja" | "vi", ShopCopy>> = {
  en: {
    tabsLabel: "Shop",
    tabs: { coins: "Yeopjeon", plans: "Plans" },
    yourPlan: "Your plan",
    planShort: { free: "Free", ...planShort },
    yourPlanLabel: (plan) => `Your plan: ${plan}`,
    promo: {
      premium: (coins) => `Get ${coins} Yeopjeon every month with Premium`,
      chatPlus: (perDay) => `Keep chatting — ${perDay} free a day with Chat Plus`,
      action: "Plans ›",
    },
    outOfTickets: "Out of tickets? Learn without waiting",
    headline: {
      everything: "Everything unlimited",
      chats: (perDay) => `${perDay} chats a day`,
      unlimitedChat: "Unlimited chat",
      learn: "Learn without waiting",
    },
    detail: {
      everyUnit: "Every unit, no ticket limit",
      allFriends: "All friends",
      coinsShort: (coins) => `+${coins} Yeopjeon/mo`,
      coinsLong: (coins) => `+${coins} Yeopjeon every month`,
    },
    perMonthShort: "/ mo",
    perYearShort: "/ yr",
    saving: (percent) => `-${percent}%`,
    date: (month, day) => `${enMonths[month] ?? ""} ${day}`,
    current: (date, renews) =>
      date === null ? "Current plan" : `Current plan · ${renews ? "renews" : "ends"} ${date}`,
    tag: {
      upgrade: "Upgrade · starts now",
      switchAt: (date) => (date === null ? "Switch · at renewal" : `Switch · starts ${date}`),
      switch: "Switch",
    },
    cta: {
      continueWith: (name) => `Continue with ${name}`,
      upgradeTo: (name) => `Upgrade to ${name}`,
      switchTo: (name) => `Switch to ${name}`,
      switchPeriod: { monthly: "Switch to monthly", yearly: "Switch to yearly" },
      from: (date) => (date === null ? "from your next renewal" : `from ${date}`),
      pick: "Choose a plan",
    },
    change: {
      upgrade: (from, to, store) =>
        `Upgrading switches you from ${from} to ${to} right away; ${store} credits the unused part of ${from}.`,
      later: (from, to, date) =>
        `You keep ${from} until ${date ?? "your next renewal"}, then ${to} starts.`,
      crossgrade: (from, to, store) =>
        `${to} replaces ${from}; ${store} decides when the change starts and credits any unused time.`,
    },
    chip: { plans: "PLANS", ...chipPlans },
    goUnlimited: (price) => (price === null ? "Go unlimited" : `Go unlimited · ${price}/mo`),
    activated: {
      title: (name) => `${name} is on`,
      body: {
        unlimited_tickets: "Start any lesson without a ticket",
        chat_plus: "More chats every day, with every friend",
        premium: "Lessons and chats without limits",
      },
    },
  },
  es: {
    tabsLabel: "Tienda",
    tabs: { coins: "Yeopjeon", plans: "Planes" },
    yourPlan: "Tu plan",
    planShort: { free: "Gratis", ...planShort },
    yourPlanLabel: (plan) => `Tu plan: ${plan}`,
    promo: {
      premium: (coins) => `Recibe ${coins} Yeopjeon cada mes con Premium`,
      chatPlus: (perDay) => `Sigue chateando: ${perDay} gratis al día con Chat Plus`,
      action: "Planes ›",
    },
    outOfTickets: "¿Sin tickets? Aprende sin esperar",
    headline: {
      everything: "Todo ilimitado",
      chats: (perDay) => `${perDay} chats al día`,
      unlimitedChat: "Chat ilimitado",
      learn: "Aprende sin esperar",
    },
    detail: {
      everyUnit: "Todas las unidades, sin límite de tickets",
      allFriends: "Todos los amigos",
      coinsShort: (coins) => `+${coins} Yeopjeon/mes`,
      coinsLong: (coins) => `+${coins} Yeopjeon cada mes`,
    },
    perMonthShort: "/ mes",
    perYearShort: "/ año",
    saving: (percent) => `-${percent}%`,
    date: (month, day) => `${day} ${esMonths[month] ?? ""}`,
    current: (date, renews) =>
      date === null
        ? "Plan actual"
        : `Plan actual · ${renews ? "se renueva el" : "termina el"} ${date}`,
    tag: {
      upgrade: "Mejora · empieza ya",
      switchAt: (date) => (date === null ? "Cambio · al renovar" : `Cambio · desde el ${date}`),
      switch: "Cambio",
    },
    cta: {
      continueWith: (name) => `Continuar con ${name}`,
      upgradeTo: (name) => `Mejorar a ${name}`,
      switchTo: (name) => `Cambiar a ${name}`,
      switchPeriod: { monthly: "Cambiar a mensual", yearly: "Cambiar a anual" },
      from: (date) => (date === null ? "desde tu próxima renovación" : `desde el ${date}`),
      pick: "Elige un plan",
    },
    change: {
      upgrade: (from, to, store) =>
        `Al mejorar pasas de ${from} a ${to} al instante; ${store} abona la parte no usada de ${from}.`,
      later: (from, to, date) =>
        `Mantienes ${from} hasta ${date === null ? "tu próxima renovación" : `el ${date}`} y después empieza ${to}.`,
      crossgrade: (from, to, store) =>
        `${to} sustituye a ${from}; ${store} decide cuándo empieza el cambio y abona el tiempo no usado.`,
    },
    chip: { plans: "PLANES", ...chipPlans },
    goUnlimited: (price) =>
      price === null ? "Pasar a ilimitado" : `Pasar a ilimitado · ${price}/mes`,
    activated: {
      title: (name) => `${name} está activo`,
      body: {
        unlimited_tickets: "Empieza cualquier lección sin ticket",
        chat_plus: "Más chats cada día, con todos tus amigos",
        premium: "Lecciones y chats sin límites",
      },
    },
  },
  id: {
    tabsLabel: "Toko",
    tabs: { coins: "Yeopjeon", plans: "Paket" },
    yourPlan: "Paketmu",
    planShort: { free: "Gratis", ...planShort },
    yourPlanLabel: (plan) => `Paketmu: ${plan}`,
    promo: {
      premium: (coins) => `Dapat ${coins} Yeopjeon tiap bulan dengan Premium`,
      chatPlus: (perDay) => `Terus ngobrol — ${perDay} gratis per hari dengan Chat Plus`,
      action: "Paket ›",
    },
    outOfTickets: "Tiket habis? Belajar tanpa menunggu",
    headline: {
      everything: "Semua tanpa batas",
      chats: (perDay) => `${perDay} chat per hari`,
      unlimitedChat: "Chat tanpa batas",
      learn: "Belajar tanpa menunggu",
    },
    detail: {
      everyUnit: "Semua unit, tanpa batas tiket",
      allFriends: "Semua teman",
      coinsShort: (coins) => `+${coins} Yeopjeon/bln`,
      coinsLong: (coins) => `+${coins} Yeopjeon setiap bulan`,
    },
    perMonthShort: "/ bln",
    perYearShort: "/ thn",
    saving: (percent) => `-${percent}%`,
    date: (month, day) => `${day} ${idMonths[month] ?? ""}`,
    current: (date, renews) =>
      date === null
        ? "Paket saat ini"
        : `Paket saat ini · ${renews ? "diperpanjang" : "berakhir"} ${date}`,
    tag: {
      upgrade: "Upgrade · mulai sekarang",
      switchAt: (date) => (date === null ? "Ganti · saat perpanjangan" : `Ganti · mulai ${date}`),
      switch: "Ganti",
    },
    cta: {
      continueWith: (name) => `Lanjut dengan ${name}`,
      upgradeTo: (name) => `Upgrade ke ${name}`,
      switchTo: (name) => `Ganti ke ${name}`,
      switchPeriod: { monthly: "Ganti ke bulanan", yearly: "Ganti ke tahunan" },
      from: (date) => (date === null ? "mulai perpanjangan berikutnya" : `mulai ${date}`),
      pick: "Pilih paket",
    },
    change: {
      upgrade: (from, to, store) =>
        `Upgrade langsung memindahkanmu dari ${from} ke ${to}; ${store} mengembalikan sisa ${from} yang belum terpakai.`,
      later: (from, to, date) =>
        `Kamu tetap memakai ${from} sampai ${date ?? "perpanjangan berikutnya"}, lalu ${to} dimulai.`,
      crossgrade: (from, to, store) =>
        `${to} menggantikan ${from}; ${store} menentukan kapan perubahan dimulai dan mengembalikan sisa waktu.`,
    },
    chip: { plans: "PAKET", ...chipPlans },
    goUnlimited: (price) =>
      price === null ? "Jadi tanpa batas" : `Jadi tanpa batas · ${price}/bln`,
    activated: {
      title: (name) => `${name} sudah aktif`,
      body: {
        unlimited_tickets: "Mulai pelajaran apa pun tanpa tiket",
        chat_plus: "Lebih banyak chat tiap hari, dengan semua teman",
        premium: "Pelajaran dan chat tanpa batas",
      },
    },
  },
  ja: shopCopyJa,
  vi: shopCopyVi,
};
