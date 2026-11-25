// 친구 스토리 줄 · 보기 · 대화 인용 문구(th, ADR-0178).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesTh: FriendStoriesCopy = {
  language: "th",
  // 낭독 조각 잇기 — 언어마다 구분자(감사 다국어 minor 9).
  listSeparator: " ",
  labelSeparator: ": ",
  rowTitle: "สตอรี่",
  watchAll: "ดูทั้งหมด",
  watchAllLabel: "ดูสตอรี่ทั้งหมด",
  age: (age) =>
    age.unit === "now" ? "เมื่อสักครู่" : age.unit === "m" ? `${age.value} นาที` : `${age.value} ชม.`,
  seen: "ดูแล้ว",
  newBadge: "ใหม่",
  friendLabel: (name, age, seen) => `สตอรี่ของ ${name}, ${age}${seen ? ", ดูแล้ว" : ", ใหม่"}`,
  unmetLabel: (name) => `สตอรี่ของ ${name}, เพื่อนใหม่`,
  findFriends: "หาเพื่อน",
  findFriendsLabel: "หาเพื่อน",
  listPreview: (line) => `สตอรี่ใหม่ · ${line}`,
  listRowLabel: (name, line) => `${name}, สตอรี่ใหม่: ${line} เปิดสตอรี่`,
  viewer: {
    label: (name) => `สตอรี่ของ ${name}`,
    progress: (index, count) => `สตอรี่ที่ ${index} จาก ${count}`,
    pause: "หยุดชั่วคราว",
    play: "เล่น",
    close: "ปิด",
    previous: "สตอรี่ก่อนหน้า",
    next: "สตอรี่ถัดไป",
    photoLabel: (name) => `รูปจาก ${name}`,
    saveWord: (ko, meaning) => `${ko} · ${meaning} — บันทึกคำ`,
    saveWordLabel: (ko, meaning) => `บันทึก ${ko}, ${meaning}, ลงในคำศัพท์ของฉัน`,
    saved: (ko) => `บันทึก ${ko} ลงในคำศัพท์ของฉันแล้ว`,
    freeReply: "ตอบกลับครั้งแรกฟรี",
    replyPlaceholder: (name) => `ตอบกลับ ${name}…`,
    replyChipLabel: (text) => `ตอบกลับ: ${text}`,
    send: "ส่ง",
    sent: "ส่งแล้ว",
    sentLabel: (name) => `ส่งถึง ${name} แล้ว`,
    openChat: "เปิดแชท",
    sendFailed: "ส่งไม่สำเร็จ ลองอีกครั้ง",
    coinsShort: "เหรียญไม่พอ",
    newFriend: "เพื่อนใหม่",
    addAndReply: "เพิ่มเพื่อนแล้วตอบกลับ",
    profile: (name) => `โปรไฟล์ของ ${name}`,
  },
  reply: {
    caption: (name) => `คุณตอบกลับสตอรี่ของ ${name}`,
    storyMeta: (age) => (age === null ? "สตอรี่" : `สตอรี่ · ${age}`),
    replying: (name) => `กำลังตอบกลับสตอรี่ของ ${name}`,
    removeQuote: "เอาข้อความอ้างอิงออก",
  },
};
