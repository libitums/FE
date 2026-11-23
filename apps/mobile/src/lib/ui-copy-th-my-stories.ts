// 내 스토리 문구(th, ADR-0179).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";

const replies = (count: number) => `${count} คำตอบ`;
const MONTHS = [
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

const LIVE = "กำลังแสดง";

export const myStoriesTh: MyStoriesCopy = {
  language: "th",
  row: {
    create: "สร้าง",
    createLabel: "สร้างสตอรี่ใหม่",
    mine: "ของคุณ",
    mineLabel: (count, unseen) => `สตอรี่ของคุณ ${replies(count)}${unseen ? " มีคำตอบใหม่" : ""}`,
  },
  guide: {
    title: "แชร์คำศัพท์ภาษาเกาหลี",
    body: "เพื่อนที่นี่จะตอบกลับ — ทุกสตอรี่คือการฝึกภาษาเกาหลีเล็ก ๆ",
    steps: [
      {
        title: "เลือกคำศัพท์หรือการ์ดบทเรียน",
        body: "จากคำที่คุณบันทึกไว้หรือจากบทเรียนของคุณ",
      },
      {
        title: "เพื่อนตอบกลับตลอดทั้งวัน",
        body: "เพื่อนจะใช้คำของคุณ แตะ ตอบกลับ เพื่อคุยต่อ",
      },
      {
        title: "เห็นได้เฉพาะเพื่อนใน duru",
        body: "คนอื่นไม่มีทางเห็น ลบได้ทุกเมื่อที่ ตั้งค่า › สตอรี่ของฉัน",
      },
    ],
    start: "สร้างสตอรี่แรกของฉัน",
    later: "ไว้ทีหลัง",
    stepLabel: (n, title, body) => `${n}. ${title} ${body}`,
  },
  composer: {
    title: "สตอรี่ใหม่",
    close: "ปิด",
    tabsLabel: "สิ่งที่จะแชร์",
    tab: (kind) => (kind === "word" ? "คำศัพท์ของฉัน" : "การ์ดบทเรียน"),
    wordsTitle: "เลือกคำที่คุณบันทึกไว้",
    wordCount: (count) => `${count} คำ`,
    all: "ทั้งหมด",
    emptyWords: "ยังไม่มีคำที่บันทึกไว้ คำจากบทเรียนของคุณจะแสดงที่นี่",
    emptyCards: "เรียนบทเรียนให้จบเพื่อแชร์การ์ดของบทนั้น",
    chipLabel: (label, on) => `${label}${on ? " เลือกแล้ว" : ""}`,
    choiceLabel: (ko, meaning, selected) => `${ko} ${meaning}${selected ? " เลือกแล้ว" : ""}`,
    share: (ko) => `สร้างการ์ดด้วยคำว่า ${ko}`,
    shareCard: "แชร์การ์ด",
    posting: "กำลังแชร์…",
    dailyLimit: "วันนี้คุณแชร์สตอรี่ครบแล้ว ลองใหม่พรุ่งนี้นะ",
    failed: "แชร์สตอรี่ไม่สำเร็จ ลองอีกครั้ง",
  },
  viewer: {
    yourStory: "สตอรี่ของคุณ",
    kindLabel: (kind) => (kind === "word" ? "การ์ดคำศัพท์" : "การ์ดบทเรียน"),
    cardTag: (kind) => (kind === "word" ? "คำศัพท์ของฉันวันนี้" : "การ์ดบทเรียน"),
    close: "ปิด",
    options: "ตัวเลือกสตอรี่",
    delete: "ลบสตอรี่",
    repliesTitle: "เพื่อนใช้คำของคุณแล้ว",
    waiting: "เพื่อนจะตอบกลับภายในวันนี้",
    hidden: "เพื่อนเห็นสตอรี่นี้ได้ 24 ชั่วโมง ตอนนี้มีแค่คุณที่เห็น",
    answer: (name) => `ตอบกลับ ${name}`,
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? ` ${meaning}` : ""}`,
  },
  remove: {
    title: "ลบสตอรี่นี้ไหม",
    body: (count) =>
      `การ์ดของคุณและ ${replies(count)} จากเพื่อนจะถูกลบ แชทจะยังมีข้อความ “สตอรี่ที่ลบแล้ว” ย้อนกลับไม่ได้`,
    allTitle: "ลบสตอรี่ทั้งหมดไหม",
    allBody: "สตอรี่ทั้งหมดของคุณและคำตอบของเพื่อนจะถูกลบ แชทจะยังมีข้อความ “สตอรี่ที่ลบแล้ว” ย้อนกลับไม่ได้",
    confirm: "ลบ",
    cancel: "ยกเลิก",
    failed: "ลบไม่สำเร็จ ลองอีกครั้ง",
  },
  archive: {
    entryTitle: "สตอรี่ของฉัน",
    entryDescription: "คำและการ์ดที่คุณแชร์",
    title: "สตอรี่ของฉัน",
    back: "กลับไปที่การตั้งค่า",
    keep: "เก็บสตอรี่ไว้หลัง 24 ชั่วโมง",
    keepBody: "เพื่อนเห็นสตอรี่ได้ 24 ชั่วโมง คลังนี้มีแค่คุณที่เห็น",
    count: (count) => `${count} สตอรี่`,
    newest: "ใหม่สุดก่อน",
    live: LIVE,
    tileMeta: (date, count) => `${date} · ${replies(count)}`,
    tileLabel: (ko, meaning, date, count, live) =>
      `${ko} ${meaning} ${date} ${replies(count)}${live ? ` ${LIVE}` : ""}`,
    deleteOne: (date) => `ลบสตอรี่วันที่ ${date}`,
    deleteToday: "ลบสตอรี่วันนี้",
    deleteAll: "ลบสตอรี่ทั้งหมด",
    deleteAllNote: "การ์ดของคุณและคำตอบของเพื่อนจะถูกลบออกจากเซิร์ฟเวอร์ของเรา",
    empty: "ยังไม่มีสตอรี่ แตะ + เหนือแชทเพื่อแชร์คำศัพท์",
    today: "วันนี้",
    date: (month, day) => `${day} ${MONTHS[month - 1] ?? month}`,
  },
  quote: {
    mine: "คุณตอบเกี่ยวกับสตอรี่ของคุณ",
    replyingMine: "กำลังตอบเกี่ยวกับสตอรี่ของคุณ",
    deleted: "สตอรี่ที่ลบแล้ว",
    deletedLabel: "คำตอบถึงสตอรี่ที่ลบแล้ว",
  },
};
