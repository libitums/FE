// 태국어 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type {
  EpisodeIntroCopy,
  MessengerCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";
import type { StoryCallCopy } from "../screens/story-call/story-call.contract";
import type { StoryIntroCopy } from "../screens/story-intro/story-intro.contract";
import type { StoryMessengerCopy } from "../screens/story-messenger/story-messenger.contract";

export const episodeIntroTh: EpisodeIntroCopy = {
  guide: {
    map: "แตะเพื่อเริ่มบทเรียน!",
    continue: "แตะที่ใดก็ได้เพื่อไปต่อ",
  },
  skipDialog: {
    title: "ข้ามเรื่องราวไหม",
    description: "ถ้าข้าม เรื่องราวของตอนนี้จะไม่แสดงอีก",
    skip: "ข้าม",
    keepWatching: "ดูต่อ",
  },
};

export const messengerTh: MessengerCopy = {
  keyboard: {
    shift: "Shift",
    shiftOn: "Shift, เปิดอยู่",
    backspace: "ลบ",
    period: "จุด",
    space: "เว้นวรรค",
    questionMark: "เครื่องหมายคำถาม",
  },
};

export const visualNovelTh: VisualNovelCopy = {
  sceneProgress: (ordinal, total) => `ฉากที่ ${ordinal} จาก ${total}`,
};

export const roleplayTh: RoleplayCopy = {
  title: "บทบาทสมมติ",
  form: { story: "บทบาทสมมติ" },
  viewAll: "ดูทั้งหมด",
  viewAllLabel: (sectionLabel) => `ดูทั้งหมด, ${sectionLabel}`,
  plus: "Plus",
  plusTagline: "ฝึกสถานการณ์ที่คล้ายกัน",
  plusSectionLabel: (sectionLabel) => `${sectionLabel} บทบาทสมมติ Plus ฝึกสถานการณ์แบบเดียวกับตอนนี้`,
  plusDialogTitle: "บทบาทสมมติ Plus",
  lockedSection: (name) => `${name}, ล็อกอยู่, เรียนตอนนี้ในการเดินทางให้จบเพื่อปลดล็อก`,
  premiumLock: { episode: "ล็อกอยู่", payment: "เฉพาะ Plus" },
  premiumNotice: (itemTitle) => `“${itemTitle}” เป็นบทบาทสมมติ Plus ขณะนี้ Plus ยังไม่เปิดให้บริการ`,
};

export const storyMessengerTh: StoryMessengerCopy = {
  back: "กลับไปที่แผนที่",
  typing: (speaker) => `${speaker} กำลังพิมพ์`,
  replyTitle: "คุณจะตอบว่าอะไร",
  closeReply: "ปิด",
  send: "ส่ง",
  composerPlaceholder: "ข้อความ",
  finish: "จบเรื่องราว",
};

export const storyIntroTh: StoryIntroCopy = {
  overline: (ordinal) => `เรื่องราว · ตอนที่ ${ordinal}`,
  back: "กลับไปที่แผนที่",
  skip: "ข้าม",
  start: "เริ่ม",
  skipDialog: {
    title: "ข้ามเรื่องราวไหม",
    description: "คุณกลับมาดูได้ทุกเมื่อจากแผนที่",
    skip: "ข้าม",
    keepWatching: "ดูต่อ",
  },
};

export const storyCallTh: StoryCallCopy = {
  incoming: "สายเรียกเข้า",
  answer: "รับสาย",
  connecting: "กำลังเชื่อมต่อ…",
  callEnded: (clock) => `วางสายแล้ว · ${clock}`,
  me: "ฉัน",
  mute: "ปิดเสียง",
  speaker: "ลำโพง",
  end: "วางสาย",
  back: "กลับไปที่แผนที่",
  finish: "จบเรื่องราว",
};
