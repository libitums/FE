// 친구 스토리 줄 · 보기 · 대화 인용 문구(th, ADR-0177).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesTh: FriendStoriesCopy = {
  language: "th",
  rowTitle: "สตอรี่",
  watchAll: "ดูทั้งหมด",
  watchAllLabel: "ดูสตอรี่ทั้งหมด",
  age: (age) =>
    age.unit === "now" ? "เมื่อกี้" : age.unit === "m" ? `${age.value} นาที` : `${age.value} ชม.`,
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
    saveWordLabel: (ko, meaning) => `บันทึก ${ko}, ${meaning}, ลงในคำของฉัน`,
    saved: (ko) => `บันทึก ${ko} ลงในคำของฉันแล้ว`,
    freeReply: "ตอบกลับครั้งแรกฟรี",
    replyPlaceholder: (name) => `ตอบกลับ ${name}…`,
    replyChipLabel: (text) => `ตอบกลับ: ${text}`,
    newFriend: "เพื่อนใหม่",
    addAndReply: "เพิ่มเพื่อนแล้วตอบกลับ",
    seeHowToMeet: "ดูวิธีพบกัน",
  },
  reply: {
    caption: (name) => `คุณตอบกลับสตอรี่ของ ${name}`,
    storyMeta: (age) => (age === null ? "สตอรี่" : `สตอรี่ · ${age}`),
    replying: (name) => `กำลังตอบกลับสตอรี่ของ ${name}`,
    removeQuote: "เอาสตอรี่ออก",
    quoteLabel: (name, line) => `สตอรี่ของ ${name}: ${line}`,
  },
};
