// 내 스토리 문구(th, ADR-0194).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";
import { storyPhotoTh } from "./ui-copy-story-photo-2";

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
    next: "สตอรี่ถัดไป",
    nextLabel: (time) => `สตอรี่ถัดไปเปิดเวลา ${time}`,
  },
  guide: {
    title: "แชร์คำศัพท์ภาษาเกาหลี",
    body: "เพื่อนที่นี่จะตอบกลับ — ทุกสตอรี่คือการฝึกภาษาเกาหลีเล็ก ๆ",
    steps: [
      { title: "เลือกคำศัพท์", body: "จากคำที่คุณบันทึกไว้" },
      {
        title: "เพื่อนตอบภายในหนึ่งชั่วโมง",
        body: "คำตอบจะอยู่ในแชทของเพื่อนแต่ละคน",
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
    emptyWords: "ยังไม่มีคำที่บันทึกไว้ คำจากบทเรียนของคุณจะแสดงที่นี่",
    choiceLabel: (ko, meaning, selected) => `${ko} ${meaning}${selected ? " เลือกแล้ว" : ""}`,
    posting: "กำลังแชร์…",
    dailyLimit: "วันนี้คุณแชร์สตอรี่ครบแล้ว ลองใหม่พรุ่งนี้นะ",
    windowUsed: (time) =>
      time === null ? "คุณแชร์สตอรี่ของช่วงเวลานี้แล้ว" : `คุณแชร์สตอรี่ของช่วงเวลานี้แล้ว สตอรี่ถัดไปเปิดเวลา ${time}`,
    failed: "แชร์สตอรี่ไม่สำเร็จ ลองอีกครั้ง",
    checkLimit: "วันนี้ลองครบแล้ว ลองใหม่พรุ่งนี้นะ",
    invalid: "แชร์สตอรี่นี้ไม่ได้ ลองแก้ไขดูนะ",
  },
  viewer: {
    yourStory: "สตอรี่ของคุณ",
    close: "ปิด",
    options: "ตัวเลือกสตอรี่",
    delete: "ลบสตอรี่",
    replied: (count) => (count === 0 ? "ยังไม่มีคำตอบ" : `เพื่อน ${count} คนตอบแล้ว`),
    seenBy: (count) => `เห็นแล้ว ${count}`,
    seenByLabel: (count) => `เพื่อน ${count} คนเห็นแล้ว`,
    openChat: "เปิดแชท",
    openChatLabel: (name) => `เปิดแชทกับ ${name}`,
    saved: "คำตอบจะถูกเก็บไว้ในแชทของเพื่อนแต่ละคน",
    waiting: "เพื่อนมักตอบภายในหนึ่งชั่วโมง",
    waitingBody: "เราจะแจ้งให้คุณทราบ คำตอบจะแสดงที่นี่และในแชทของเพื่อนแต่ละคน",
    noFriendsTitle: "เพิ่มเพื่อนเพื่อรับคำตอบ",
    noFriendsBody: "เริ่มแชทกับใครสักคนก่อน แล้วเขาจะเห็นสตอรี่ของคุณ",
    findFriends: "หาเพื่อน",
    hidden: "เพื่อนเห็นสตอรี่นี้ได้ 24 ชั่วโมง ตอนนี้มีแค่คุณที่เห็น",
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? ` ${meaning}` : ""}`,
    swipeUp: "ปัดขึ้นเพื่อดูคำตอบ",
    noViews: "ยังไม่มีใครดู",
    showReplies: "ดูคำตอบ",
  },
  window: {
    title: (slot) =>
      `คุณแชร์สตอรี่ของ${slot === "morning" ? "เช้า" : slot === "day" ? "บ่าย" : "คืน"}นี้แล้ว`,
    body: (time) => `แชร์ได้ช่วงละหนึ่งสตอรี่ ทั้งเช้า บ่าย และเย็น สตอรี่ถัดไปเปิดเวลา ${time}`,
    slot: (slot) => (slot === "morning" ? "เช้า" : slot === "day" ? "บ่าย" : "เย็น"),
    range: (start, end) => `${start} – ${end}`,
    time: (hour, minute) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    shared: "แชร์แล้ว",
    missed: "พลาดไป",
    open: "เปิดอยู่ตอนนี้",
    opens: (time) => `เปิด ${time}`,
    slotLabel: (slot, range, state) => `${slot} ${range} ${state}`,
    ok: "ตกลง",
    close: "ปิด",
  },
  photo: storyPhotoTh,
  start: {
    title: "สตอรี่ใหม่",
    close: "ปิด",
    camera: "กล้อง",
    background: "พื้นหลัง",
    recent: "รูปล่าสุด",
  },
  editor: {
    label: "แก้ไขสตอรี่",
    back: "กลับ",
    colors: "สีพื้นหลัง",
    color: (background) =>
      background === "orange"
        ? "ส้ม"
        : background === "green"
          ? "เขียว"
          : background === "blue"
            ? "ฟ้า"
            : "ม่วง",
    colorLabel: (name, on) => `${name}${on ? " เลือกอยู่" : ""}`,
    text: "ข้อความ",
    words: "คำศัพท์",
    share: "แชร์ให้เพื่อน",
    posting: "กำลังแชร์…",
    hintOne: "เพิ่มคำหนึ่งคำเพื่อแชร์",
    hintOneText: "เพิ่มคำศัพท์หรือเขียนสักประโยคเพื่อแชร์",
    hintMove: "ลากเพื่อย้าย ใช้สองนิ้วเพื่อปรับขนาดหรือหมุน",
    stickerLabel: (ko, meaning) => `${ko} ${meaning}`,
    remove: (ko) => `ลบ ${ko}`,
    textBlocked: "แชร์ข้อความนี้ไม่ได้ ลองใช้คำอื่น",
  },
  textEntry: {
    label: "ข้อความสตอรี่ ภาษาเกาหลีหรืออังกฤษ",
    help: "ภาษาเกาหลีหรืออังกฤษก็ได้ เราช่วยได้",
    done: "เสร็จ",
    colors: "สีตัวอักษร",
    color: (textColor) =>
      textColor === "brown"
        ? "น้ำตาล"
        : textColor === "black"
          ? "ดำ"
          : textColor === "white"
            ? "ขาว"
            : "ส้ม",
    colorLabel: (name, on) => `${name}${on ? " เลือกอยู่" : ""}`,
    editLabel: (ko) => `แก้ข้อความ: ${ko}`,
  },
  add: {
    title: "เพิ่มคำ",
    hint: "แตะคำเพื่อวาง สูงสุด 8 อันต่อสตอรี่",
    hintOne: "แตะคำเพื่อวาง",
  },
  quiz: {
    free: "ตอบควิซฟรี",
    freeAnswer: "ฟรี · คำตอบควิซ",
    lastTry: "ฟรี · โอกาสสุดท้าย",
    correct: (name) => `ถูกต้อง! คุณกับ ${name} สนิทกันมากขึ้น`,
  },
  remove: {
    title: "ลบสตอรี่นี้ไหม",
    body: (count) =>
      `การ์ดของคุณและ ${replies(count)} บนการ์ดจะถูกลบ ข้อความในแชทยังอยู่ พร้อมหมายเหตุ “สตอรี่ที่ลบแล้ว” ย้อนกลับไม่ได้`,
    allTitle: "ลบสตอรี่ทั้งหมดไหม",
    allBody:
      "สตอรี่ทั้งหมดของคุณและคำตอบบนสตอรี่จะถูกลบ ข้อความในแชทยังอยู่ พร้อมหมายเหตุ “สตอรี่ที่ลบแล้ว” ย้อนกลับไม่ได้",
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
    deleteAllNote: "การ์ดของคุณและคำตอบบนการ์ดจะถูกลบออกจากเซิร์ฟเวอร์ของเรา",
    empty: "ยังไม่มีสตอรี่ แตะ + เหนือแชทเพื่อแชร์คำศัพท์",
    today: "วันนี้",
    date: (month, day) => `${day} ${MONTHS[month - 1] ?? month}`,
  },
  quote: {
    mine: "คุณตอบเกี่ยวกับสตอรี่ของคุณ",
    reacted: "ตอบสตอรี่ของคุณ",
    deleted: "สตอรี่ที่ลบแล้ว",
    deletedLabel: "คำตอบถึงสตอรี่ที่ลบแล้ว",
    openStory: "เปิดสตอรี่",
    ended: "จบแล้ว",
    endedTitle: "สตอรี่นี้จบแล้ว",
  },
};
