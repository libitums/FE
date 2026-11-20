// 미얀마어 문구표 구획 — 카탈로그 맵 · 표지 컷.
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { AudioUnavailableCopy } from "../components/audio-unavailable.contract";
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
  pending: "မကြာမီ လာမည်",
  update: "ဖွင့်ရန် app ကို အပ်ဒိတ်လုပ်ပါ",
  unavailable: "မရနိုင်ပါ",
} as const;

export const catalogUpdateNoticeMy: CatalogUpdateNoticeCopy = {
  title: "ဟေး၊ အကြောင်းအရာသစ် ရောက်ပြီ 👀",
  body: "သင်ပြီးခဲ့တဲ့ အပိုင်းတချို့မှာ အကြောင်းအရာသစ် ထပ်ထည့်ထားပါတယ်။ စိတ်မပူပါနဲ့၊ သင့်တိုးတက်မှု မပျောက်ပါဘူး။",
  confirm: "ကောင်းပြီ၊ သိပြီ",
  dontShowAgain: "နောက်ထပ် မပြပါနဲ့",
  checked: "ရွေးထားသည်",
  unchecked: "မရွေးထားပါ",
};

export const catalogMapMy: CatalogMapCopy = {
  episodeLabel: (ordinal) => `အပိုင်း ${ordinal}။`,
  coverTitle: "မိတ်ဆက်",
  lessonTitle: (ordinal) => `သင်ခန်းစာ ${ordinal}`,
  sheetHeading: (unit, title) => `${unit}: “${title}”`,
  finalTitle: "နောက်ဆုံး စာမေးပွဲ",
  cultureTitle: "ယဉ်ကျေးမှု",
  storyTitle: "ဇာတ်လမ်း",
  nodeLabel: (label, title) => `${label} ${title}`,
  caption: {
    pending: "မကြာမီ",
    update: "အပ်ဒိတ် လိုသည်",
    unavailable: "မရနိုင်ပါ",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}၊ ${unavailableTail[kind]}`,
  comingSoon: {
    title: "မကြာမီ လာမည်",
    body: "နောက်ဇာတ်လမ်းကို ပြင်ဆင်နေပါတယ်။",
    label: (episodeLabel) => `${episodeLabel} မကြာမီ လာမည်။ နောက်ဇာတ်လမ်းကို ပြင်ဆင်နေပါတယ်။`,
    checkedToday: "ဒီနေ့ စစ်ပြီး",
    checkedDaysAgo: (d) => (d === 1 ? "မနေ့က စစ်ခဲ့သည်" : `လွန်ခဲ့သော ${d} ရက်က စစ်ခဲ့သည်`),
    staleTitle: "ဇာတ်လမ်းသစ် ရှိနိုင်ပါတယ်",
    staleBody: "အပိုင်းသစ် စစ်ရန် အင်တာနက် ချိတ်ပါ။",
    checkNew: "ဇာတ်လမ်းသစ် စစ်ရန်",
  },
  coverDownload: {
    gettingReady: (percent) => `ပြင်ဆင်နေသည် · ${percent}%`,
    tapToDownload: (size) => (size === null ? "ဒေါင်းရန် တို့ပါ" : `ဒေါင်းရန် တို့ပါ · ${size}`),
  },
};

export const catalogCoverMy: CatalogCoverCopy = {
  toggleScript: {
    en: "အသံထွက် ပြရန်",
    roman: "အဓိပ္ပာယ် ပြရန်",
  },
  nextCut: (ordinal, total) => `နောက်မြင်ကွင်း၊ ${total} ခုအနက် ${ordinal}`,
  finishCover: "မိတ်ဆက် ပြီးရန်",
  finishEpilogue: "အပိုင်း ပြီးရန်",
  finishStory: "ဇာတ်လမ်း ပြီးရန်",
  thinking: "စဉ်းစားနေသည်",
  episodeStart: "အပိုင်း စပြီ!",
  episodeClear: "အပိုင်း ပြီးဆုံးပြီ!",
  episodeContinue: "ဆက်ရန်…",
  skipDescription: "အပိုင်း မိတ်ဆက်မှ အချိန်မရွေး ပြန်ကြည့်နိုင်ပါတယ်။",
};

export const typingMy: TypingCopy = {
  instruction: "စာကြောင်းကို ကိုရီးယားလို ရိုက်ပါ။",
  answerField: (typed) => `သင့်အဖြေ: ${typed}`,
  answerFieldEmpty: "သင့်အဖြေ၊ ဗလာ",
  answerReveal: (answer) => `အဖြေ: ${answer}`,
};

export const vocabCardMy: VocabCardCopy = {
  instruction: "ဒီစကားလုံးကို လေ့လာပါ။",
  badge: "စကားလုံးသစ်",
  gotIt: "နားလည်ပြီ",
  runLabel: (ordinal, total) => `စကားလုံး ${total} လုံးအနက် ${ordinal}`,
  pronunciation: (romanization) => `အသံထွက်: ${romanization}`,
  meaning: (meaning) => `အဓိပ္ပာယ်: ${meaning}`,
};

export const cultureCardMy: CultureCardCopy = {
  instruction: "ကိုရီးယားရှိ နေထိုင်မှုအကြောင်း လေ့လာပါ။",
  eyebrow: "ယဉ်ကျေးမှု",
  tapToFlip: "လှန်ရန် တို့ပါ",
  flipCard: "ကတ် လှန်ရန်",
  nextCard: "နောက်ကတ်",
  koreanBodyTitle: "ကိုရီးယားလို",
  counter: (position, total) => `${position} / ${total}`,
  pronunciation: (romanization) => `အသံထွက်: ${romanization}`,
  frontPlace: (position, total) => `ယဉ်ကျေးမှုကတ် ${total} ခုအနက် ${position}၊ ရှေ့ဘက်။`,
  backPlace: (position, total) => `ယဉ်ကျေးမှုကတ် ${total} ခုအနက် ${position}၊ နောက်ဘက်။`,
  flipBackHint: "ပြန်လှန်ရန် တို့ပါ။",
};

// 미얀마어는 복수형이 없어 음절 수를 그대로 붙입니다.
export const syllableBuildMy: SyllableBuildCopy = {
  instruction: "စကားလုံး ဖြစ်အောင် ဝဏ္ဏများကို တို့ပါ။",
  meaning: (meaning) => `အဓိပ္ပာယ်: ${meaning}`,
  placedTile: (text, position, slotCount) => `${text}၊ နေရာ ${slotCount} ခုအနက် ${position}`,
  wordEmpty: (slotCount) => `သင့်စကားလုံး၊ ဗလာ၊ ဝဏ္ဏ ${slotCount} လုံး`,
  word: (word) => `သင့်စကားလုံး: ${word}`,
  usedTile: (text) => `${text}၊ သုံးပြီး`,
};

export const readAloudMy: ReadAloudCopy = {
  matched: (matched, total) => {
    if (matched === total) {
      return total === 1 ? "စကားလုံးကို မှန်အောင် ပြောနိုင်ပါတယ်။" : `စကားလုံး ${total} လုံးလုံး မှန်ပါတယ်။`;
    }
    // 앞에서부터 이어 맞은 수입니다 — 0이면 "ပထမ"를 붙이지 않습니다.
    const lead = matched === 0 ? "" : "ပထမ ";
    return `စကားလုံး ${total} လုံးအနက် ${lead}${matched} လုံး မှန်ပါတယ်။`;
  },
  pronunciation: (romanization) => `အသံထွက်: ${romanization}`,
};

export const speakWordMy: SpeakWordCopy = {
  instruction: "ပုံနှင့် ကိုက်ညီသော စကားလုံးကို ပြောပါ။",
  recognitionUnavailable: "အသံ မှတ်သားမှု ယခု မရနိုင်ပါ။ ဆက်ရန် ကျော်ရန် ခလုတ်ကို တို့ပါ။",
};

export const pairMatchMy: PairMatchCopy = {
  instruction: "စကားလုံးတစ်လုံးကို တို့ပြီး ၎င်း၏ အဓိပ္ပာယ်ကို တို့ပါ။",
  progress: (matched, total) => `တွဲပြီး ${matched} / ${total}`,
  progressLabel: (matched, total) => `အတွဲ ${total} တွဲအနက် ${matched} တွဲ တွဲပြီး`,
  selected: (text) => `${text}၊ ရွေးထားသည်`,
  matched: (text, ordinal, partner) => `${text}၊ အတွဲ ${ordinal}၊ ${partner} နှင့် တွဲပြီး`,
  judged: (text, partner) => `${text}၊ ${partner} နှင့် တွဲပြီး`,
  answerPair: (word, meaning) => `${word} = ${meaning}`,
  linked: (word, meaning, matched, total) => `တွဲပြီး: ${word}၊ ${meaning}။ ${total} အနက် ${matched}။`,
  unlinked: (text) => `မတွဲရသေး: ${text}`,
  missedPairs: (pairs) => `မှန်ကန်သော အတွဲများ: ${pairs}`,
  spokenPair: (word, meaning) => `${word}၊ ${meaning}။`,
};

export const wordChoicePictureMy: WordChoicePictureCopy = {
  picture: (meaning) => `ပုံ: ${meaning}`,
  loading: "ပုံ၊ ဖွင့်နေသည်",
  unavailable: (meaning) => `ပုံ မရှိပါ။ အဓိပ္ပာယ်: ${meaning}`,
  unavailableCaption: "ပုံ မရှိပါ",
  answer: (word, romanization, meaning) =>
    romanization === null
      ? `အဖြေ: ${word}၊ ${meaning}`
      : `အဖြေ: ${word}၊ ${romanization}၊ ${meaning}`,
  answerSubline: (romanization, meaning) =>
    romanization === null ? meaning : `${romanization} · ${meaning}`,
};

export const catalogFinalMy: CatalogFinalCopy = {
  turnProgress: (n, total) => `အလှည့် ${total} ခုအနက် ${n}`,
  replyLabel: (reply) => `သင့်အဖြေ: ${reply}`,
  replyEmpty: "သင့်အဖြေ၊ ဗလာ",
  replyHint: (translation) => `ဒီလို ပြောပါ: ${translation}`,
  correctAnswer: (answer) => `အဖြေမှန်: ${answer}`,
  answerLabel: "အဖြေမှန်",
};

export const catalogStoryFinalMy: CatalogStoryFinalCopy = {
  redo: "ပြန်လုပ်ရန်",
  listen: "နားထောင်ရန်",
  nextLetter: "နောက်စာလုံး",
  letterLabel: (ordinal, total, state) =>
    `စာလုံး ${total} လုံးအနက် ${ordinal}၊ ${state.kind === "written" ? state.syllable : state.kind === "writing" ? "ရေးနေသည်" : "ဗလာ"}`,
  padLabel: (syllable) => `ရေးရန် နေရာ။ ${syllable} ကို လိုက်ရေးပါ`,
};

export const audioUnavailableMy: AudioUnavailableCopy = {
  label: "အသံ မရှိသေးပါ",
};
