// 태국어 문구표 구획 — 학습 활동(listening ~ lessonComplete).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { AssembledHintCopy } from "./ui-copy-assembled-hint";
import type {
  AssessmentCopy,
  LessonCompleteCopy,
  ListeningCopy,
  SentenceOrderCopy,
  SpeakingCopy,
  WordChoiceCopy,
} from "./ui-copy-sections.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";

export const listeningTh: ListeningCopy = {
  instruction: "เลือกความหมายของประโยค",
  playback: { pause: "หยุดชั่วคราว", resume: "เล่นต่อ", play: "เล่น" },
  playFromStart: "เล่นตั้งแต่ต้น",
  slow: "ช้า",
  playAgain: "เล่นอีกครั้ง",
  stop: "หยุด",
};

export const wordChoiceTh: WordChoiceCopy = {
  instruction: "เลือกคำที่เหมาะสม",
  culture: {
    sceneInstruction: "คุณจะพูดว่าอะไร",
    feedbackTitle: {
      scene: { correct: "ตอบได้ดีมาก!", incorrect: "ยังไม่ถูกนัก" },
      question: { correct: "ถูกต้อง!", incorrect: "ยังไม่ถูกนัก" },
    },
  },
};

export const sentenceOrderTh: SentenceOrderCopy = {
  instruction: "เติมบทสนทนาให้สมบูรณ์",
  placedChip: (text, position) => `${text}, ตำแหน่งที่ ${position}`,
  dialogueSpeaker: { counterpart: "คู่สนทนา", me: "คุณ" },
  dialogueTurn: (speaker, position, text) => `${speaker}, ลำดับที่ ${position}: ${text}`,
  dialogueEmptyTurn: (speaker, position) => `${speaker}, ลำดับที่ ${position}, ว่าง`,
  dialogueLine: {
    me: (text) => `คุณพูดว่า: ${text}`,
    counterpart: (text) => `คู่สนทนาพูดว่า: ${text}`,
  },
};

export const speakingTh: SpeakingCopy = {
  instruction: "อ่านประโยคนี้ออกเสียง",
  speak: "พูด",
  stopSpeaking: "หยุดพูด",
  listening: "กำลังฟัง…",
  checking: "กำลังตรวจ…",
  tapToStop: "พูดจบแล้วแตะเพื่อหยุด",
  tryAgain: "ลองอีกครั้ง",
  dictationDisabled:
    "Siri หรือการป้อนตามคำบอกปิดอยู่ เปิดได้ที่ การตั้งค่า > ทั่วไป > แป้นพิมพ์ > เปิดใช้งานการป้อนตามคำบอก แล้วลองอีกครั้ง",
  tapToContinue: "แตะหน้าจอเพื่อไปต่อ",
  recognitionUnavailable: "ยังจดจำเสียงพูดไม่ได้ในขณะนี้ แตะ “ข้าม” เพื่อไปต่อ",
  notCaught: "ฟังไม่ค่อยชัด แตะไมโครโฟนแล้วลองอีกครั้ง",
  networkRetry: "เชื่อมต่อระบบรู้จำเสียงพูดไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
};

export const assessmentTh: AssessmentCopy = {
  activity: "การประเมิน",
  verdict: { passed: "ผ่าน", failed: "ไม่ผ่าน" },
  itemTitle: (ordinal) => `ข้อ ${ordinal}`,
  announcement: (verdict) => `ผลการประเมิน, ${verdict === "passed" ? "ผ่าน" : "ไม่ผ่าน"}`,
};

// 태국어는 복수형이 없어 수를 그대로 붙입니다.
export const lessonCompleteTh: LessonCompleteCopy = {
  rewardCoins: (count) => `รางวัล, ${count} เหรียญ`,
  grade: (grade) => `ระดับ ${grade}`,
  gradeName: (grade) => (grade === "AMAZING" ? "ยอดเยี่ยม" : grade),
  outcome: { passed: "เรียนจบบทเรียนแล้ว", failed: "ยังไม่ผ่านบทเรียน" },
  mistakes: (count) => (count === 0 ? "ไม่มีข้อผิดพลาด" : `ผิด ${count} ข้อ`),
  skippedSuffix: (count) => (count === 0 ? "" : `, ข้าม ${count} ข้อ`),
  nextLesson: "บทเรียนถัดไป",
  nextFinal: "แบบทดสอบท้ายบท",
  continueStory: "ดูเรื่องราวต่อ",
  title: {
    perfect: "บทเรียนไร้ที่ติ!",
    complete: "จบบทเรียนแล้ว!",
    failed: "ยังไม่ผ่านบทเรียน",
  },
  subtitle: (mistakeCount) =>
    mistakeCount === 0 ? "คุณไม่ผิดเลยสักข้อในบทนี้" : `คุณผิด ${mistakeCount} ข้อในบทนี้`,
  streakLabel: (days) => `ต่อเนื่อง ${days} วัน`,
  rewardLabel: (count) => `+ ${count} รางวัล`,
  tryAgain: "ลองอีกครั้ง",
  review: {
    soClose: "เกือบแล้ว!",
    fixedOf: (fixed, total) => `คุณแก้ได้ ${fixed} จาก ${total} ข้อ`,
    dotsLabel: (fixed, total) => `แก้แล้ว ${fixed} จาก ${total} ข้อ`,
    neededMore: (count) => `ต้องตอบถูกอีก ${count} ข้อ ลองเรียนบทนี้อีกครั้ง — รอบนี้จะง่ายขึ้น`,
  },
};

// 학습 문항 안내 문구입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다.
export const learningItemGuideTh: LearningItemGuideCopy = {
  "sentence-order": {
    title: "ครั้งนี้มีแค่ชิ้นเดียว",
    description: "ปกติคุณจะเรียงหลายชิ้นตามลำดับ แต่ครั้งนี้มีแค่ชิ้นเดียว แตะชิ้นนั้นแล้วแตะ “ตรวจคำตอบ”",
  },
  "activity-vocab-card": {
    title: "คำศัพท์ใหม่",
    description: "ฟังคำศัพท์และดูความหมาย พร้อมแล้วแตะ “ถัดไป”",
  },
  "activity-word-choice": {
    title: "เลือกหนึ่งข้อ",
    description: "เลือกคำตอบที่เหมาะสม แล้วแตะ “ตรวจคำตอบ”",
  },
  "activity-listening": {
    title: "ฟังก่อน",
    description: "แตะลำโพงเพื่อฟังอีกครั้ง แล้วเลือกสิ่งที่คุณได้ยิน",
  },
  "activity-syllable-build": {
    title: "ประกอบเป็นคำ",
    description: "แตะบล็อกพยางค์ตามลำดับเพื่อสร้างคำ แล้วแตะ “ตรวจคำตอบ”",
  },
  "activity-sentence-order": {
    title: "เรียงตามลำดับ",
    description: "แตะชิ้นส่วนตามลำดับเพื่อสร้างประโยค แตะชิ้นนั้นอีกครั้งเพื่อนำออก",
  },
  "activity-culture-card": {
    title: "เกร็ดวัฒนธรรม",
    description: "เคล็ดลับสั้น ๆ เกี่ยวกับชีวิตในเกาหลี อ่านจบแล้วแตะ “ถัดไป”",
  },
};

// 조립 문항 힌트 문구(ADR-0153) — 다섯 언어 표(`ui-copy-assembled-hint.ts`)와 같은 열쇠입니다.
export const assembledHintTh: AssembledHintCopy = {
  button: "คำใบ้",
  title: "คำใบ้",
  close: "ปิด",
  listen: "ฟังคำตอบ",
  show: "ดูคำตอบ",
  shown: (answer) => `แสดงคำตอบแล้ว: ${answer}`,
};
