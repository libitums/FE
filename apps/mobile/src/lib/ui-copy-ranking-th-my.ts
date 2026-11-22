// 주간 순위 · 채팅 단어 문구의 태국어 · 미얀마어 덩어리(ADR-0170) — `ui-copy-ranking.ts`가 300줄을 넘지 않게 나눴습니다.
// 태국어는 성별 없는 존댓말(ครับ · ค่ะ 없이), 미얀마어는 유니코드 문자만 씁니다(Zawgyi 아님). 엽전은 「Yeopjeon」(ADR-0116).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { RankingCopy } from "../screens/ranking/ranking.contract";

export const rankingCopyTh: RankingCopy = {
  title: "อันดับประจำสัปดาห์",
  group: (count) => `กลุ่มของคุณ · ผู้เรียน ${count} คน`,
  endsIn: (days) => `สิ้นสุดในอีก ${days} วัน`,
  boards: { lessons: "บทเรียน", "chat-words": "คำในแชท" },
  selected: (label) => `${label}, เลือกอยู่`,
  unit: (board) => (board === "lessons" ? "บทเรียน" : "คำ"),
  zoneTop: (reward) =>
    reward === null ? "3 อันดับแรกของสัปดาห์นี้" : `3 อันดับแรกได้โบนัส ${reward} Yeopjeon`,
  zoneClimb: (more) => (more === null ? "ไต่อันดับต่อไป" : `ไต่อันดับต่อไป · อีก ${more} จะติด 3 อันดับแรก`),
  you: "คุณ",
  morePass: (more, name) => `อีก ${more} จะแซง ${name}`,
  first: "คุณอยู่อันดับ 1!",
  rowLabel: (rank, name, episode, score) =>
    [`อันดับ ${rank}`, name, episode, score].filter((part) => part !== null).join(", "),
  loading: "กำลังโหลดอันดับ",
  notices: {
    guest: {
      title: "เข้าสู่ระบบเพื่อเข้าร่วม",
      body: "อันดับมีไว้สำหรับสมาชิก เข้าสู่ระบบเพื่อร่วมแข่งขัน",
    },
    notJoined: {
      title: "สัปดาห์ของคุณใกล้เริ่มแล้ว",
      body: "เรียนผ่านบทเรียนหรือใช้คำที่เรียนแล้วในแชทเพื่อเข้ากลุ่ม",
    },
    hidden: { title: "คุณซ่อนอยู่", body: "คนอื่นจะไม่เห็นคุณในอันดับ" },
    error: { title: "โหลดอันดับไม่ได้", body: "โปรดลองอีกครั้ง" },
    offline: { title: "คุณออฟไลน์อยู่", body: "เชื่อมต่ออินเทอร์เน็ตเพื่อดูอันดับ" },
  },
  actions: { signIn: "เข้าสู่ระบบ", showMe: "แสดงฉัน", retry: "ลองอีกครั้ง" },
  chat: {
    stripCount: (words) => `${words} คำในแชท`,
    stripRank: (rank) => (rank === null ? "สัปดาห์นี้" : `สัปดาห์นี้ · อันดับ ${rank} ในกลุ่ม`),
    stripLabel: (words, rank) =>
      `${words} คำในแชทสัปดาห์นี้${rank === null ? "" : `, อันดับ ${rank} ในกลุ่ม`} เปิดอันดับ`,
    earned: (count) => `+${count} คำในแชท`,
    pending: "จะนับเมื่อคุณส่งใหม่ให้ถูกต้อง",
  },
  settings: {
    hideTitle: "ซ่อนฉันจากอันดับ",
    hideBody: "คนอื่นจะไม่เห็นคุณในอันดับประจำสัปดาห์",
  },
};

export const rankingCopyMy: RankingCopy = {
  title: "အပတ်စဉ် အဆင့်",
  group: (count) => `သင့်အဖွဲ့ · သင်ယူသူ ${count} ဦး`,
  endsIn: (days) => `နောက် ${days} ရက်နေရင် ပြီးပါမယ်`,
  boards: { lessons: "သင်ခန်းစာ", "chat-words": "ချတ် စကားလုံး" },
  selected: (label) => `${label}၊ ရွေးထားသည်`,
  unit: (board) => (board === "lessons" ? "သင်ခန်းစာ" : "စကားလုံး"),
  zoneTop: (reward) =>
    reward === null ? "ဒီအပတ် ထိပ်ဆုံး 3 ဦး" : `ထိပ်ဆုံး 3 ဦး ${reward} Yeopjeon ဆုကြေး ရမယ်`,
  zoneClimb: (more) => (more === null ? "ဆက်တက်ပါ" : `ဆက်တက်ပါ · ထိပ်ဆုံး ၃ ဝင်ဖို့ ${more} ထပ်လိုသေးတယ်`),
  you: "သင်",
  morePass: (more, name) => `${name} ကို ကျော်ဖို့ ${more} ထပ်လိုသေးတယ်`,
  first: "သင် နံပါတ် 1 ပါ!",
  rowLabel: (rank, name, episode, score) =>
    [`နံပါတ် ${rank}`, name, episode, score].filter((part) => part !== null).join("၊ "),
  loading: "အဆင့်ကို ဖွင့်နေသည်",
  notices: {
    guest: {
      title: "ပါဝင်ရန် အကောင့်ဝင်ပါ",
      body: "အဆင့်က အဖွဲ့ဝင်တွေအတွက်ပါ။ ယှဉ်ပြိုင်ဖို့ အကောင့်ဝင်ပါ။",
    },
    notJoined: {
      title: "သင့်အပတ် မကြာခင် စပါမယ်",
      body: "အဖွဲ့ထဲ ဝင်ဖို့ သင်ခန်းစာ တစ်ခု အောင်ပါ၊ ဒါမှမဟုတ် သင်ထားတဲ့ စကားလုံးကို ချတ်မှာ သုံးပါ။",
    },
    hidden: { title: "သင့်ကို ဖျောက်ထားသည်", body: "တခြားသူတွေ အဆင့်ထဲမှာ သင့်ကို မမြင်ရပါ။" },
    error: { title: "အဆင့်ကို ဖွင့်လို့ မရပါ", body: "ထပ်စမ်းကြည့်ပါ။" },
    offline: { title: "အင်တာနက် မရှိပါ", body: "အဆင့်ကို ကြည့်ဖို့ အင်တာနက် ချိတ်ပါ။" },
  },
  actions: { signIn: "အကောင့်ဝင်ရန်", showMe: "ကျွန်ုပ်ကို ပြရန်", retry: "ထပ်စမ်းရန်" },
  chat: {
    stripCount: (words) => `ချတ် စကားလုံး ${words} လုံး`,
    stripRank: (rank) => (rank === null ? "ဒီအပတ်" : `ဒီအပတ် · အဖွဲ့ထဲ နံပါတ် ${rank}`),
    stripLabel: (words, rank) =>
      `ဒီအပတ် ချတ် စကားလုံး ${words} လုံး${rank === null ? "" : `၊ အဖွဲ့ထဲ နံပါတ် ${rank}`}။ အဆင့်ကို ဖွင့်ရန်`,
    earned: (count) => `+ချတ် စကားလုံး ${count} လုံး`,
    pending: "မှန်အောင် ပြန်ပို့ရင် ရေတွက်ပါမယ်",
  },
  settings: {
    hideTitle: "အဆင့်ထဲမှာ ကျွန်ုပ်ကို ဖျောက်ရန်",
    hideBody: "အပတ်စဉ် အဆင့်ထဲမှာ တခြားသူတွေ သင့်ကို မမြင်ရပါ",
  },
};
