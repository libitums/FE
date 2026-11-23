// 태국어 문구표 구획 — 요금제(ADR-0144) · 구독 고지 · 하나의 상점 · 구독 입구(ADR-0160).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).
// 요금제 · 상품 이름(Unlimited Tickets · Chat Plus · Premium, 칩의 PREMIUM · CHAT+ · TICKETS)은 스토어 상품명과 같게 영어로 둡니다(ADR-0144 · ADR-0160).
// 엽전은 「Yeopjeon」(ADR-0116). 날짜는 `Intl` 없이 달 이름 표로 씁니다(Android PrimJS).

import type { PlansCopy } from "./ui-copy-plans";
import type { ShopCopy } from "./ui-copy-shop";

const planShort = { unlimited_tickets: "Tickets ∞", chat_plus: "Chat Plus", premium: "Premium" };
const chipPlans = { premium: "PREMIUM", chat_plus: "CHAT+", unlimited_tickets: "TICKETS" };
const thMonths = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const shopCopyTh: ShopCopy = {
  tabsLabel: "ร้านค้า",
  tabs: { coins: "Yeopjeon", plans: "แพ็กเกจ" },
  yourPlan: "แพ็กเกจของคุณ",
  planShort: { free: "ฟรี", ...planShort },
  yourPlanLabel: (plan) => `แพ็กเกจของคุณ: ${plan}`,
  promo: {
    premium: (coins) => `รับ ${coins} Yeopjeon ทุกเดือนกับ Premium`,
    chatPlus: (perDay) => `แชทต่อได้ — ฟรีวันละ ${perDay} ข้อความกับ Chat Plus`,
    action: "แพ็กเกจ ›",
  },
  outOfTickets: "ตั๋วหมด? เรียนได้ไม่ต้องรอ",
  headline: {
    everything: "ไม่จำกัดทุกอย่าง",
    chats: (perDay) => `วันละ ${perDay} ข้อความ`,
    unlimitedChat: "แชทไม่จำกัด",
    learn: "เรียนได้ไม่ต้องรอ",
  },
  detail: {
    everyUnit: "ทุกบท ไม่จำกัดตั๋ว",
    allFriends: "เพื่อนทุกคน",
    coinsShort: (coins) => `+${coins} Yeopjeon/เดือน`,
    coinsLong: (coins) => `+${coins} Yeopjeon ทุกเดือน`,
  },
  perMonthShort: "/ เดือน",
  perYearShort: "/ ปี",
  saving: (percent) => `-${percent}%`,
  date: (month, day) => `${day} ${thMonths[month] ?? ""}`,
  current: (date, renews) =>
    date === null ? "แพ็กเกจปัจจุบัน" : `แพ็กเกจปัจจุบัน · ${renews ? "ต่ออายุ" : "สิ้นสุด"} ${date}`,
  scheduled: (plan, date) =>
    date === null ? `แพ็กเกจปัจจุบัน · ${plan} เมื่อต่ออายุ` : `แพ็กเกจปัจจุบัน · ${plan} ตั้งแต่ ${date}`,
  tag: {
    upgrade: "อัปเกรด · เริ่มทันที",
    switchAt: (date) => (date === null ? "เปลี่ยน · เมื่อต่ออายุ" : `เปลี่ยน · เริ่ม ${date}`),
    switch: "เปลี่ยน",
  },
  cta: {
    continueWith: (name) => `ดำเนินการต่อด้วย ${name}`,
    upgradeTo: (name) => `อัปเกรดเป็น ${name}`,
    switchTo: (name) => `เปลี่ยนเป็น ${name}`,
    switchPeriod: { monthly: "เปลี่ยนเป็นรายเดือน", yearly: "เปลี่ยนเป็นรายปี" },
    from: (date) => (date === null ? "ตั้งแต่การต่ออายุครั้งถัดไป" : `ตั้งแต่ ${date}`),
    pick: "เลือกแพ็กเกจ",
  },
  change: {
    upgrade: (from, to, store) =>
      `การอัปเกรดจะเปลี่ยนคุณจาก ${from} เป็น ${to} ทันที และ ${store} จะคืนเครดิตส่วนที่ยังไม่ได้ใช้ของ ${from}`,
    later: (from, to, date) =>
      `คุณยังใช้ ${from} ได้จนถึง ${date ?? "การต่ออายุครั้งถัดไป"} จากนั้น ${to} จะเริ่มต้น`,
    crossgrade: (from, to, store) =>
      `${to} จะมาแทน ${from} โดย ${store} จะกำหนดว่าจะเปลี่ยนเมื่อใดและคืนเครดิตเวลาที่ยังไม่ได้ใช้`,
  },
  chip: { plans: "แพ็กเกจ", ...chipPlans },
  goUnlimited: (price) => (price === null ? "ใช้แบบไม่จำกัด" : `ใช้แบบไม่จำกัด · ${price}/เดือน`),
  activated: {
    startsAt: (name, date) => (date === null ? `${name} จะเริ่มเมื่อต่ออายุ` : `${name} เริ่ม ${date}`),
    keep: (from) => `คุณยังใช้ ${from} ได้จนถึงตอนนั้น`,
    title: (name) => `เปิดใช้ ${name} แล้ว`,
    body: {
      unlimited_tickets: "เริ่มบทเรียนใดก็ได้โดยไม่ต้องใช้ตั๋ว",
      chat_plus: "แชทได้มากขึ้นทุกวัน กับเพื่อนทุกคน",
      premium: "บทเรียนและแชทไม่จำกัด",
    },
  },
};

export const plansTh: PlansCopy = {
  title: "แพ็กเกจ",
  subtitle: "เรียนและแชทได้ไม่จำกัด",
  names: { unlimited_tickets: "Unlimited Tickets", chat_plus: "Chat Plus", premium: "Premium" },
  best: "คุ้มที่สุด",
  perMonth: (price) => `${price} / เดือน`,
  perYear: (price) => `${price} / ปี`,
  priceInStore: "ดูราคาได้ในสโตร์",
  monthly: "รายเดือน",
  yearly: "รายปี",
  periodLabel: "รอบการเรียกเก็บเงิน",
  yearlyNote: (percent) =>
    percent === null ? "รายปี: จ่ายต่อเดือนน้อยกว่า" : `รายปี: ประหยัด ${percent}%`,
  benefit: {
    unlimitedLessons: "บทเรียนไม่จำกัด ไม่ต้องรอ",
    freeMessages: (perDay) => `แชทฟรีวันละ ${perDay} ข้อความ`,
    unlimitedChat: (fairUse) =>
      fairUse === null ? "แชทไม่จำกัด" : `แชทไม่จำกัด (ใช้อย่างเหมาะสมวันละ ${fairUse} ข้อความ)`,
    monthlyCoins: (coins) => `+${coins} Yeopjeon ทุกเดือน`,
    allCharacters: "แชทกับตัวละครทุกตัว",
  },
  continueWith: (name) => `ดำเนินการต่อด้วย ${name}`,
  restore: "กู้คืนการซื้อ",
  unavailable: "การชำระเงินจะเปิดให้ใช้เร็ว ๆ นี้ เราจะแจ้งให้คุณทราบเมื่อพร้อม",
  loadFailed: "โหลดแพ็กเกจไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
  settingsRow: "แพ็กเกจ",
  settingsRowDescription: "Unlimited Tickets · Chat Plus · Premium",
  goUnlimited: "ใช้แบบไม่จำกัด",
  compare: "เปรียบเทียบแพ็กเกจ",
  selected: "เลือกแล้ว",
  terms: {
    disclosure: (name, price, store) =>
      `${name}: ${price} ระบบจะเรียกเก็บเงินจากบัญชี ${store} ของคุณ การสมัครสมาชิกจะต่ออายุโดยอัตโนมัติในราคาเดิม เว้นแต่คุณจะยกเลิกอย่างน้อย 24 ชั่วโมงก่อนสิ้นสุดรอบปัจจุบัน คุณจัดการหรือยกเลิกได้ทุกเมื่อในการตั้งค่าบัญชี ${store}`,
    short: "ต่ออายุอัตโนมัติ ยกเลิกได้ทุกเมื่อ",
    stores: { ios: "App Store", android: "Google Play", unknown: "สโตร์แอป" },
    termsOfUse: "ข้อกำหนดการใช้งาน",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    current: "แพ็กเกจปัจจุบัน",
    manage: "จัดการการสมัครสมาชิก",
  },
  shop: shopCopyTh,
};
