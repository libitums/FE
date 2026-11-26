// 태국어 문구표 구획 — 계정 · 기타(notifications ~ coinShop).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { FeedbackCopy } from "./feedback.contract";
import type {
  AppUpdateCopy,
  CoinShopCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";
import type { DownloadSheetCopy } from "./ui-copy-settings.contract";

export const notificationsTh: NotificationsCopy = {
  title: "การแจ้งเตือน",
  emptyTitle: "ยังไม่มีการแจ้งเตือน",
  emptyBody: "เมื่อมีอะไรใหม่ เราจะแจ้งให้ทราบที่นี่",
  deleteLabel: (message) => `${message}, ลบ`,
  destination: {
    "roleplay-list": "ดูรายการบทบาทสมมติ",
  },
};

export const settingsTh: SettingsCopy = {
  title: "ตั้งค่า",
  group: { account: "บัญชี", learning: "การเรียน", accountActions: "จัดการบัญชี" },
  nav: {
    profile: "โปรไฟล์ผู้ใช้",
    "learner-profile": "ชื่อและประเทศในบทเรียน",
    language: "ภาษา",
    download: "ดาวน์โหลด",
    notifications: "การแจ้งเตือน",
    feedback: "ส่งความคิดเห็น",
    "privacy-policy": "นโยบายความเป็นส่วนตัว",
    "terms-of-use": "ข้อกำหนดการใช้งาน",
  },
  downloads: {
    title: "ดาวน์โหลด",
    caption: "เลือกว่าจะดาวน์โหลดรูปภาพและเสียงเมื่อใด",
    mobileDataHeading: "ดาวน์โหลดผ่านเน็ตมือถือ",
    policy: { ask: "ถามทุกครั้ง", always: "ดาวน์โหลดเสมอ", "wifi-only": "Wi-Fi เท่านั้น" },
    offlineHeading: "ออฟไลน์",
    downloadAll: "ดาวน์โหลดทั้งหมดเพื่อเรียนแบบออฟไลน์",
    downloadAllCaption: "รูปภาพและเสียงของทุกตอน เพื่อให้เรียนได้โดยไม่ต้องใช้เน็ต",
    downloadAllStarted: "กำลังดาวน์โหลดในเบื้องหลัง เรียนต่อได้เลย",
    downloaded: (size) => `ดาวน์โหลดแล้ว: ${size}`,
    episodeRow: (n, d, t) => `ตอนที่ ${n}: ${d} จาก ${t} บทเรียน`,
    episodeRowComplete: (n) => `ตอนที่ ${n}: ครบแล้ว`,
    downloadRest: (n) => `ดาวน์โหลดส่วนที่เหลือของตอนที่ ${n}`,
    confirm: {
      title: "ดาวน์โหลดผ่านเน็ตมือถือไหม",
      description: "การดาวน์โหลดทุกตอนอาจใช้เน็ตมือถือมาก หรือจะรอ Wi-Fi ก็ได้",
      download: "ดาวน์โหลดเลย",
      cancel: "ยกเลิก",
      restDescription: (n) => `ส่วนที่เหลือของตอนที่ ${n} จะดาวน์โหลดผ่านเน็ตมือถือ หรือจะรอ Wi-Fi ก็ได้`,
    },
  },
  sessionOption: {
    "auto-play-audio": "เล่นเสียงอัตโนมัติ",
    "show-transcript": "แสดงคำบรรยาย",
    "show-choice-romanization": "คำอ่าน",
    vibration: "การสั่น",
  },
  sessionOptionDescription: {
    "show-choice-romanization": "แสดงคำอ่านภาษาเกาหลีเป็นตัวเล็กในคำตอบ บทเรียน และเรื่องราว",
    vibration: "สั่นเมื่อตอบถูกหรือผิด และเมื่อพิมพ์บนแป้นพิมพ์",
  },
  optionState: { on: "เปิด", off: "ปิด" },
  action: {
    "sign-in": "เข้าสู่ระบบ",
    "sign-out": "ออกจากระบบ",
    "delete-account": "ลบบัญชี",
  },
  signOutDialog: { title: "ออกจากระบบไหม", confirm: "ออกจากระบบ", cancel: "อยู่ในระบบต่อ" },
  deleteDialog: {
    title: "ลบบัญชีของคุณไหม",
    description: "บัญชีและความคืบหน้าในการเรียนของคุณจะถูกลบถาวร และย้อนกลับไม่ได้",
    confirm: "ลบบัญชี",
    cancel: "เก็บบัญชีไว้",
  },
  deleteFailure: {
    network: "ลบบัญชีไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
    other: "ลบบัญชีไม่สำเร็จ โปรดลองอีกครั้ง",
  },
  exitAnnouncement: { "signed-out": "คุณออกจากระบบแล้ว", deleted: "ลบบัญชีของคุณแล้ว" },
  version: (name, build) => `เวอร์ชัน ${name} (${build})`,
};

export const appUpdateTh: AppUpdateCopy = {
  title: "อัปเดต Duru เพื่อใช้งานต่อ",
  description: "Duru เวอร์ชันนี้ไม่รองรับแล้ว โปรดดาวน์โหลดเวอร์ชันล่าสุดจากสโตร์เพื่อเรียนต่อ",
  update: "อัปเดต",
  failure: "เปิดสโตร์ไม่ได้ โปรดอัปเดต Duru จาก App Store หรือ Google Play",
};

export const feedbackTh: FeedbackCopy = {
  title: "ส่งความคิดเห็น",
  ratingQuestion: "คุณชอบ Duru แค่ไหน",
  ratingOption: { 1: "ไม่ดี", 2: "ควรปรับปรุง", 3: "พอใช้", 4: "ดี", 5: "ชอบมาก" },
  messageLabel: "มีอะไรอยากบอกเราอีกไหม (ไม่บังคับ)",
  send: "ส่ง",
  sent: "ขอบคุณ เราได้รับความคิดเห็นของคุณแล้ว",
  failed: "ส่งความคิดเห็นไม่สำเร็จ โปรดลองอีกครั้ง",
  survey: {
    title: "ตอนนี้เป็นอย่างไรบ้าง",
    messageLabel: "เราควรปรับปรุงอะไร (ไม่บังคับ)",
    reasonsLabel: "มีอะไรที่ไม่ดี เลือกได้ทุกข้อที่ตรง",
    reasonOption: {
      "too-hard": "ยากเกินไป",
      "too-easy": "ง่ายเกินไป",
      audio: "เสียงมีปัญหา",
      unclear: "ไม่เข้าใจ",
      translation: "คำแปลผิด",
      stuck: "ค้างหรือแอปขัดข้อง",
      "too-long": "ยาวเกินไป",
      other: "อื่น ๆ",
    },
    otherAccessibilityLabel: "อื่น ๆ, เปิดช่องพิมพ์ข้อความ",
    description: (episodeTitle) => `คุณเรียน ${episodeTitle} จบแล้ว บอกเราหน่อยว่ารู้สึกอย่างไร`,
    skip: "ไว้ทีหลัง",
  },
};

export const profileTh: ProfileCopy = {
  notProvided: "ไม่ได้ระบุ",
  learningLanguage: "ภาษาเกาหลี",
  title: "โปรไฟล์ผู้ใช้",
  itemLabel: {
    name: "ชื่อ",
    "learning-language": "ภาษาที่กำลังเรียน",
    email: "อีเมล",
    phone: "หมายเลขโทรศัพท์",
  },
};

export const coinShopTh: CoinShopCopy = {
  digitSeparator: ",",
  title: "Yeopjeon",
  subtitle: "เหรียญทองเหลืองโบราณของเกาหลี",
  balanceLabel: "คุณมี",
  balance: (_count, display) => `คุณมี ${display} เหรียญ`,
  pickTitle: "เลือกถุงเหรียญ",
  pickCaption: "รับเหรียญเมื่อเรียนบทเรียน หรือซื้อเพิ่มได้ที่นี่",
  packName: { bundle: "พวงเหรียญ", pouch: "ถุงเหรียญ", big: "ถุงใหญ่" },
  coinsUnit: "เหรียญ",
  packAmount: (_count, display) => `${display} เหรียญ`,
  bonus: (display) => `+${display} โบนัส`,
  bestValue: "คุ้มที่สุด",
  buy: (price) => `ซื้อในราคา ${price}`,
  storeNote: "ชำระเงินผ่านบัญชีสโตร์แอปของคุณ",
  openShop: (count) => `${count} เหรียญ, ซื้อเพิ่ม`,
  notice: {
    title: "การชำระเงินจะมาเร็ว ๆ นี้",
    description: "ตอนนี้ยังซื้อเหรียญไม่ได้ โปรดกลับมาใหม่ภายหลัง",
  },
  purchaseFailed: "การซื้อไม่สำเร็จ โปรดลองอีกครั้ง",
  purchaseWait: {
    confirming: "กำลังยืนยันการซื้อ…",
    late: "การซื้อของคุณปลอดภัย จะแสดงในอีกสักครู่",
    added: (_count, display) => `เพิ่ม ${display} เหรียญแล้ว`,
    adding: "กำลังเพิ่มเข้ากระเป๋า",
    updating: "กำลังอัปเดต",
  },
};

export const downloadSheetTh: DownloadSheetCopy = {
  askTitle: (n) => `ดาวน์โหลดตอนที่ ${n} ไหม`,
  askDescription: "รูปภาพและเสียงของตอนนี้ยังไม่อยู่ในโทรศัพท์ การดาวน์โหลดจะใช้เน็ตมือถือ",
  size: (size) => `ประมาณ ${size}`,
  downloadNow: "ดาวน์โหลดเลย",
  onWifi: "ดาวน์โหลดเมื่อมี Wi-Fi",
  wifiOnlyTitle: (n) => `ตอนที่ ${n} จะดาวน์โหลดเมื่อมี Wi-Fi`,
  wifiOnlyDescription:
    "คุณเลือก Wi-Fi เท่านั้นในตั้งค่า จะใช้เน็ตมือถือครั้งนี้ เปิดโดยไม่มีรูปภาพและเสียง หรือเปลี่ยนการตั้งค่าก็ได้",
  ok: "ตกลง",
  offlineTitle: "คุณออฟไลน์อยู่",
  offlineDescription: (n) => `ตอนที่ ${n} ยังไม่ได้ดาวน์โหลด จะดาวน์โหลดเมื่อกลับมาออนไลน์`,
  openAnyway: "เปิดเลย",
  close: "ปิด",
  askUnitTitle: (l) => `ดาวน์โหลด ${l} ไหม`,
  askUnitDescription: "รูปภาพและเสียงของบทเรียนนี้ยังไม่อยู่ในโทรศัพท์ การดาวน์โหลดจะใช้เน็ตมือถือ",
  rows: {
    common: "รูปภาพและเสียงที่ใช้ร่วมกัน",
    allLessons: "ทุกบทเรียนในตอนนี้",
    otherLessons: "บทเรียนอื่น ๆ",
    status: { done: "อยู่ในโทรศัพท์แล้ว", pending: "กำลังดาวน์โหลด", wifi: "เมื่อมี Wi-Fi" },
  },
  askHint: "เราจะถามทุกครั้ง เปลี่ยนได้ที่ ตั้งค่า › ดาวน์โหลด",
  wifiOnlyUnitTitle: (l) => `${l} จะดาวน์โหลดเมื่อมี Wi-Fi`,
  mobileDataOnce: "ใช้เน็ตมือถือครั้งนี้",
  openWithout: "เปิดโดยไม่มีรูปภาพและเสียง",
  changeSetting: "เปลี่ยนการตั้งค่า",
  offlineUnitDescription: (l) => `${l} ยังไม่ได้ดาวน์โหลด จะดาวน์โหลดเมื่อกลับมาออนไลน์`,
  offlineHint: "รูปภาพจะแสดงเป็นสีพื้น และจะข้ามข้อฟังเสียง",
  allCleared: {
    title: "คุณเรียนเรื่องราวที่นี่ครบหมดแล้ว",
    description: "อาจมีตอนใหม่แล้ว เชื่อมต่ออินเทอร์เน็ตแล้วเราจะตรวจสอบให้",
    offline: "คุณออฟไลน์อยู่",
    lastChecked: (d) =>
      d === null
        ? "ยังไม่ได้ตรวจสอบ"
        : d === 0
          ? "ตรวจสอบล่าสุดวันนี้"
          : d === 1
            ? "ตรวจสอบล่าสุดเมื่อวาน"
            : `ตรวจสอบล่าสุด ${d} วันที่แล้ว`,
    checkNow: "ตรวจสอบเลย",
    later: "ไว้ทีหลัง",
    autoNote: "เราจะตรวจสอบให้อัตโนมัติเมื่อคุณกลับมาออนไลน์",
    offlineHint: "เราจะตรวจสอบทันทีที่คุณเชื่อมต่อได้",
  },
};
