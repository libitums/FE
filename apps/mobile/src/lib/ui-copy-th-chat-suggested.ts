// 추천 친구 줄 · 프로필 시트 · 친구 찾기 문구(th, ADR-0162).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { SuggestedFriendsCopy } from "../screens/messenger-chat/suggested-friends.contract";

export const messengerChatSuggestedTh: SuggestedFriendsCopy = {
  language: "th",
  rowTitle: "ทำความรู้จักเพื่อนใหม่",
  seeAll: "ดูทั้งหมด",
  seeAllLabel: "ดูเพื่อนทั้งหมด",
  newLabel: (name) => `${name}, เพื่อนใหม่`,
  lockedLabel: (name, episode) => `${name}, จะได้พบในตอนที่ ${episode}`,
  earlyLabel: (name, episode, price) =>
    `${name}, จะได้พบในตอนที่ ${episode} หรือแชทได้เลยด้วย ${price} เหรียญ`,
  sheetLabel: (name) => `${name}, โปรไฟล์`,
  newBadge: "ใหม่",
  startChatting: "เริ่มแชท",
  notNow: "ไว้ทีหลัง",
  meetIn: (episode) => `คุณจะได้พบในตอนที่ ${episode}`,
  lockedInfo: (name) => `เรียนเรื่องราวให้จบเพื่อแลกเบอร์กัน — ${name} จะทักมาก่อน`,
  chatNow: (price) => `แชทเลย · ${price}`,
  earlyButtonLabel: (price, left) =>
    `แชทเลยด้วย ${price} เหรียญ, ข้อเสนอจำกัดเวลา${left === null ? "" : `, เหลือ ${left.days} วัน ${left.hours} ชั่วโมง`}`,
  launchSpecial: (name) => `ข้อเสนอเปิดตัว · พบ ${name} ก่อนใคร`,
  limited: "จำกัดเวลา",
  limitedUntil: (days, hours) => `จำกัดเวลา · ${days} วัน ${hours} ชม.`,
  added: (name) => `เพิ่ม ${name} เข้าแชทแล้ว`,
  addFailed: (name) => `เพิ่ม ${name} ไม่สำเร็จ โปรดลองอีกครั้ง`,
  voice: {
    hear: "ฟังเสียง",
    pause: "หยุดชั่วคราว",
    resume: "เล่นต่อ",
    label: (name, phase) =>
      phase === "idle"
        ? `ฟังเสียงของ ${name}`
        : phase === "playing"
          ? `หยุดเสียงของ ${name} ชั่วคราว`
          : `เล่นเสียงของ ${name} ต่อ`,
    unavailable: "เล่นตัวอย่างเสียงไม่ได้",
  },
  adultAck: {
    title: (name) => `สนิทกับ ${name} มากขึ้นไหม`,
    body: (gender) =>
      gender === null
        ? "บทสนทนาอาจอบอุ่นและใกล้ชิดขึ้น เหมือนกับคนที่กำลังค่อย ๆ ทำความรู้จักกัน"
        : `${gender === "female" ? "เธอ" : "เขา"}อาจอบอุ่นและใกล้ชิดกับคุณมากขึ้น เหมือนคนที่กำลังค่อย ๆ ทำความรู้จักกัน`,
    safe: "สุภาพและให้เกียรติเสมอ ไม่มีเนื้อหาโจ่งแจ้งเด็ดขาด",
    casual: (gender) =>
      `อยากให้เป็นแบบสบาย ๆ ทีหลังเหรอ ${gender === null ? "แค่บอกมาก็พอ" : `แค่บอก${gender === "female" ? "เธอ" : "เขา"}ก็พอ`}`,
    confirm: "ฟังดูดี",
    decline: "เป็นเพื่อนกันก่อน",
  },
  directory: {
    title: "หาเพื่อน",
    back: "กลับ",
    all: "ทั้งหมด",
    fromStory: "จากเรื่องราว",
    sectionStory: "จากเรื่องราวของคุณ",
    sectionNew: "เพื่อนใหม่",
    chat: "แชท",
    chatLabel: (name) => `แชทกับ ${name}`,
    added: "เพิ่มแล้ว",
    addedLabel: (name) => `${name}, อยู่ในแชทแล้ว`,
    earlyLabel: (name, price) => `พบ ${name} ก่อนใครด้วย ${price} เหรียญ`,
    locked: (episode) => `ตอนที่ ${episode}`,
    lockedLabel: (name, episode) => `${name}, จะได้พบในตอนที่ ${episode}`,
    meetIn: (episode) => `พบในตอนที่ ${episode}`,
    moreComing: "เพื่อนใหม่กำลังจะมาอีก",
    chipLabel: (label, selected) => (selected ? `${label}, เลือกแล้ว` : label),
  },
};
