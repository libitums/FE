// 태국어 문구표 구획 — 카탈로그 맵 · 표지 컷.
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type {
  AudioUnavailableCopy,
  SentenceReplayCopy,
} from "../components/audio-unavailable.contract";
import type { CatalogCoverCopy } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogFinalCopy } from "../screens/catalog-final/catalog-final.contract";
import type { CatalogStoryFinalCopy } from "../screens/catalog-story-final/catalog-story-final.contract";
import type { CatalogMapCopy } from "../screens/journey-map/catalog-map.contract";
import type { CatalogUpdateNoticeCopy } from "../screens/catalog-update/catalog-update-notice.contract";
import type { CultureCardCopy } from "../screens/culture-card/culture-card.contract";
import type { PairMatchCopy } from "../screens/pair-match/pair-match.contract";
import type { ReadAloudCopy } from "../screens/read-aloud/read-aloud.contract";
import type { SpeakWordCopy } from "../screens/speak-word/speak-word.contract";
import type { SyllableBuildCopy } from "../screens/syllable-build/syllable-build.contract";
import type { TypingCopy } from "../screens/typing/typing.contract";
import type { VocabCardCopy } from "../screens/vocab-card/vocab-card.contract";
import type { WordChoicePictureCopy } from "../screens/word-choice/word-choice-picture";

const unavailableTail = {
  pending: "เร็ว ๆ นี้",
  update: "อัปเดตแอปเพื่อเปิด",
  unavailable: "ใช้งานไม่ได้",
} as const;

export const catalogUpdateNoticeTh: CatalogUpdateNoticeCopy = {
  title: "มีเนื้อหาใหม่มาแล้ว! 👀",
  body: "บางตอนที่คุณเรียนจบไปแล้วมีเนื้อหาใหม่เพิ่มเข้ามา ไม่ต้องห่วง ความคืบหน้าของคุณยังอยู่ครบ",
  confirm: "โอเค เข้าใจแล้ว",
  dontShowAgain: "ไม่ต้องแสดงอีก",
  checked: "เลือกแล้ว",
  unchecked: "ไม่ได้เลือก",
};

export const catalogMapTh: CatalogMapCopy = {
  episodeLabel: (ordinal) => `ตอนที่ ${ordinal}.`,
  coverTitle: "บทนำ",
  lessonTitle: (ordinal) => `บทที่ ${ordinal}`,
  sheetHeading: (unit, title) => `${unit}: “${title}”`,
  finalTitle: "แบบทดสอบท้ายตอน",
  cultureTitle: "วัฒนธรรม",
  storyTitle: "เรื่องราว",
  nodeLabel: (label, title) => `${label} ${title}`,
  caption: {
    pending: "เร็ว ๆ นี้",
    update: "ต้องอัปเดต",
    unavailable: "ใช้งานไม่ได้",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}, ${unavailableTail[kind]}`,
  comingSoon: {
    title: "เร็ว ๆ นี้",
    body: "เรากำลังเตรียมเรื่องราวต่อไปอยู่",
    label: (episodeLabel) => `${episodeLabel} เร็ว ๆ นี้ เรากำลังเตรียมเรื่องราวต่อไปอยู่`,
    checkedToday: "ตรวจสอบแล้ววันนี้",
    checkedDaysAgo: (d) => (d === 1 ? "ตรวจสอบแล้วเมื่อวาน" : `ตรวจสอบแล้ว ${d} วันที่แล้ว`),
    staleTitle: "อาจมีเรื่องราวใหม่แล้ว",
    staleBody: "เชื่อมต่ออินเทอร์เน็ตเพื่อตรวจหาตอนใหม่",
    checkNew: "ตรวจหาเรื่องราวใหม่",
  },
  coverDownload: {
    gettingReady: (percent) => `กำลังเตรียม · ${percent}%`,
    tapToDownload: (size) => (size === null ? "แตะเพื่อดาวน์โหลด" : `แตะเพื่อดาวน์โหลด · ${size}`),
  },
};

export const catalogCoverTh: CatalogCoverCopy = {
  toggleScript: {
    en: "แสดงคำอ่าน",
    roman: "แสดงความหมาย",
  },
  nextCut: (ordinal, total) => `ฉากถัดไป, ${ordinal} จาก ${total}`,
  finishCover: "จบบทนำ",
  finishEpilogue: "จบตอน",
  finishStory: "จบเรื่องราว",
  thinking: "กำลังคิด",
  episodeStart: "เริ่มตอนใหม่!",
  episodeClear: "จบตอนแล้ว!",
  episodeContinue: "ยังมีต่อ…",
  skipDescription: "กลับมาดูอีกครั้งได้ทุกเมื่อจากบทนำของตอน",
};

export const typingTh: TypingCopy = {
  instruction: "พิมพ์ประโยคเป็นภาษาเกาหลี",
  answerField: (typed) => `คำตอบของคุณ: ${typed}`,
  answerFieldEmpty: "คำตอบของคุณ, ว่าง",
  answerReveal: (answer) => `คำตอบ: ${answer}`,
};

export const vocabCardTh: VocabCardCopy = {
  instruction: "เรียนคำนี้",
  badge: "คำใหม่",
  gotIt: "เข้าใจแล้ว",
  runLabel: (ordinal, total) => `คำที่ ${ordinal} จาก ${total}`,
  pronunciation: (romanization) => `คำอ่าน: ${romanization}`,
  meaning: (meaning) => `ความหมาย: ${meaning}`,
};

export const cultureCardTh: CultureCardCopy = {
  instruction: "เรียนรู้ชีวิตในเกาหลี",
  eyebrow: "วัฒนธรรม",
  tapToFlip: "แตะเพื่อพลิก",
  flipCard: "พลิกการ์ด",
  nextCard: "การ์ดถัดไป",
  koreanBodyTitle: "ภาษาเกาหลี",
  counter: (position, total) => `${position} / ${total}`,
  pronunciation: (romanization) => `คำอ่าน: ${romanization}`,
  frontPlace: (position, total) => `การ์ดวัฒนธรรม ${position} จาก ${total}, ด้านหน้า`,
  backPlace: (position, total) => `การ์ดวัฒนธรรม ${position} จาก ${total}, ด้านหลัง`,
  flipBackHint: "แตะเพื่อพลิกกลับ",
};

// 태국어는 복수형이 없어 음절 수를 그대로 붙입니다.
export const syllableBuildTh: SyllableBuildCopy = {
  instruction: "แตะพยางค์เพื่อประกอบเป็นคำ",
  meaning: (meaning) => `ความหมาย: ${meaning}`,
  placedTile: (text, position, slotCount) => `${text}, ตำแหน่งที่ ${position} จาก ${slotCount}`,
  wordEmpty: (slotCount) => `คำของคุณ, ว่าง, ${slotCount} พยางค์`,
  word: (word) => `คำของคุณ: ${word}`,
  usedTile: (text) => `${text}, ใช้แล้ว`,
};

export const readAloudTh: ReadAloudCopy = {
  matched: (matched, total) => {
    if (matched === total) {
      return total === 1 ? "คุณพูดคำนั้นถูกต้อง" : `คุณพูดถูกครบทั้ง ${total} คำ`;
    }
    // 앞에서부터 이어 맞은 수입니다 — 0이면 "แรก"을 붙이지 않습니다.
    return matched === 0
      ? `คุณพูดถูก 0 จาก ${total} คำ`
      : `คุณพูด ${matched} คำแรกถูก จากทั้งหมด ${total} คำ`;
  },
  pronunciation: (romanization) => `คำอ่าน: ${romanization}`,
};

export const speakWordTh: SpeakWordCopy = {
  instruction: "พูดคำที่ตรงกับรูปภาพ",
  recognitionUnavailable: "ตอนนี้ยังรู้จำเสียงพูดไม่ได้ แตะ ข้าม เพื่อไปต่อ",
};

export const pairMatchTh: PairMatchCopy = {
  instruction: "แตะคำ แล้วแตะความหมายของคำนั้น",
  progress: (matched, total) => `จับคู่แล้ว ${matched} / ${total}`,
  progressLabel: (matched, total) => `จับคู่แล้ว ${matched} จาก ${total} คู่`,
  selected: (text) => `${text}, เลือกแล้ว`,
  matched: (text, ordinal, partner) => `${text}, คู่ที่ ${ordinal}, จับคู่กับ ${partner} แล้ว`,
  judged: (text, partner) => `${text}, จับคู่กับ ${partner} แล้ว`,
  answerPair: (word, meaning) => `${word} = ${meaning}`,
  linked: (word, meaning, matched, total) => `จับคู่แล้ว: ${word}, ${meaning} ${matched} จาก ${total}`,
  unlinked: (text) => `ยกเลิกการจับคู่: ${text}`,
  missedPairs: (pairs) => `คู่ที่ถูกต้อง: ${pairs}`,
  spokenPair: (word, meaning) => `${word}, ${meaning}`,
};

export const wordChoicePictureTh: WordChoicePictureCopy = {
  picture: (meaning) => `รูปภาพ: ${meaning}`,
  loading: "รูปภาพ, กำลังโหลด",
  unavailable: (meaning) => `ไม่มีรูปภาพ ความหมาย: ${meaning}`,
  unavailableCaption: "ไม่มีรูปภาพ",
  answer: (word, romanization, meaning) =>
    romanization === null
      ? `คำตอบ: ${word}, ${meaning}`
      : `คำตอบ: ${word}, ${romanization}, ${meaning}`,
  answerSubline: (romanization, meaning) =>
    romanization === null ? meaning : `${romanization} · ${meaning}`,
};

export const catalogFinalTh: CatalogFinalCopy = {
  turnProgress: (n, total) => `รอบที่ ${n} จาก ${total}`,
  replyLabel: (reply) => `คำตอบของคุณ: ${reply}`,
  replyEmpty: "คำตอบของคุณ, ว่าง",
  replyHint: (translation) => `ลองพูดว่า: ${translation}`,
  correctAnswer: (answer) => `คำตอบ: ${answer}`,
  answerLabel: "คำตอบ",
};

export const catalogStoryFinalTh: CatalogStoryFinalCopy = {
  redo: "ทำใหม่",
  listen: "ฟัง",
  nextLetter: "ตัวถัดไป",
  letterLabel: (ordinal, total, state) =>
    `ตัวที่ ${ordinal} จาก ${total}, ${state.kind === "written" ? state.syllable : state.kind === "writing" ? "กำลังเขียน" : "ว่าง"}`,
  padLabel: (syllable) => `พื้นที่เขียน ลองเขียนตาม ${syllable}`,
};

export const audioUnavailableTh: AudioUnavailableCopy = {
  label: "ยังไม่มีเสียง",
};

/** 지나간 문장 다시 듣기 단추의 이름입니다(ADR-0188). 소리가 없으면 `audioUnavailable.label`이 이름입니다. */
export const sentenceReplayTh: SentenceReplayCopy = {
  label: "เล่นอีกครั้ง",
};
