// 앨범 · 사진 속 내 모습 · 다시 만들기 문구(th, ADR-0150).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { ChatAlbumCopy } from "../screens/messenger-chat/chat-album.contract";

// 태국어 월 약칭입니다(Intl 없이, 서기 연도 그대로).
const thMonthsShort = [
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
] as const;

export const messengerChatAlbumTh: ChatAlbumCopy = {
  sidebarRow: "อัลบั้ม",
  sidebarDescription: "รูปภาพและข้อความเสียง",
  title: (name) => `อัลบั้มของ ${name}`,
  back: "กลับ",
  tabs: { all: "ทั้งหมด", photos: "รูปภาพ", voice: "เสียง" },
  day: (day) =>
    day.kind === "today"
      ? "วันนี้"
      : day.kind === "yesterday"
        ? "เมื่อวาน"
        : `${day.day} ${thMonthsShort[day.month - 1] ?? ""}`,
  drawing: "กำลังวาด…",
  recording: "กำลังอัดเสียง…",
  versions: (count) => `${count} เวอร์ชัน`,
  version: (index, count) => `เวอร์ชัน ${index}/${count}`,
  pastChat: "จากแชทก่อนหน้า",
  keepNote: "รูปภาพและข้อความเสียงจะยังอยู่ที่นี่ แม้คุณจะล้างแชทแล้ว",
  empty: (name) => `รูปภาพและข้อความเสียงจาก ${name} จะแสดงที่นี่`,
  loadFailed: "โหลดอัลบั้มไม่ได้",
  tryAgain: "ลองอีกครั้ง",
  more: "ดูเพิ่มเติม",
  photoLabel: (name, line) => (line === "" ? `รูปภาพจาก ${name}` : `รูปภาพจาก ${name}, ${line}`),
  voiceLabel: (name, line) =>
    line === "" ? `ข้อความเสียงจาก ${name}` : `ข้อความเสียงจาก ${name}, ${line}`,
  viewerTitle: (name, day) => `${name} · ${day}`,
  fromChat: "จากแชท",
  close: "ปิด",
  redraw: (price) => `วาดใหม่ · ${price}`,
  recordAgain: (price) => `อัดใหม่ · ${price}`,
  play: "เล่น",
  pause: "หยุดชั่วคราว",
  redrawTitle: "วาดรูปนี้ใหม่ไหม",
  redrawBody: (name) => `${name} จะวาดช่วงเวลานี้ใหม่ อัลบั้มจะเก็บไว้ทั้งสองรูป`,
  recordTitle: "อัดเสียงใหม่ไหม",
  recordBody: (name) => `${name} จะพูดประโยคนี้อีกครั้งในเสียงใหม่`,
  confirmRedraw: (price) => `วาดใหม่ด้วย ${price} Yeopjeon`,
  confirmRecord: (price) => `อัดใหม่ด้วย ${price} Yeopjeon`,
  balance: (coins) => `คุณมี ${coins} Yeopjeon`,
  getCoins: "รับ Yeopjeon",
  cancel: "ยกเลิก",
  refused: (notice, media, name) => {
    const photo = media === "photo";
    switch (notice) {
      case "no-coins":
        return "Yeopjeon ของคุณไม่พอ";
      case "busy":
        return photo ? `${name} ยังวาดรูปอื่นอยู่` : `${name} ยังอัดข้อความอื่นอยู่`;
      case "limit":
        return "คุณใช้ครบจำนวนของวันนี้แล้ว โปรดลองใหม่ภายหลัง";
      case "not-eligible":
        return photo ? "รูปนี้วาดใหม่ไม่ได้" : "ข้อความนี้อัดใหม่ไม่ได้";
      default:
        return "ส่งคำขอไม่สำเร็จ โปรดลองอีกครั้ง";
    }
  },
  selfSection: "เกี่ยวกับคุณ",
  selfRow: "คุณในรูปภาพ",
  selfTitle: "คุณในรูปภาพ",
  selfBody: "เมื่อตัวละครส่งรูปมา คุณอาจอยู่ในรูปด้วย เราจะไม่วาดใบหน้าของคุณเด็ดขาด",
  selfAsk: "อยากให้ตัวเองปรากฏแบบไหน",
  selfAskNote: "มองจากด้านหลังเสมอ ไม่มีใบหน้า เปลี่ยนได้ภายหลังที่ ตั้งค่า › แชท",
  selfOptions: {
    female: { title: "ผู้หญิง", body: "มองจากด้านหลัง" },
    male: { title: "ผู้ชาย", body: "มองจากด้านหลัง" },
    hidden: { title: "แค่มือ", body: "แค่มือหรือไหล่ของคุณ" },
  },
  save: "บันทึก",
};
