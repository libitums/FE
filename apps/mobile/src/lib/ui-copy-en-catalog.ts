// 영어 문구표 구획 — 카탈로그 맵 · 표지 컷.

import type { AudioUnavailableCopy } from "../components/audio-unavailable.contract";
import type { CatalogCoverCopy } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogFinalCopy } from "../screens/catalog-final/catalog-final.contract";
import type { CatalogMapCopy } from "../screens/journey-map/catalog-map.contract";
import type { CultureCardCopy } from "../screens/culture-card/culture-card.contract";
import type { PairMatchCopy } from "../screens/pair-match/pair-match.contract";
import type { ReadAloudCopy } from "../screens/read-aloud/read-aloud.contract";
import type { SpeakWordCopy } from "../screens/speak-word/speak-word.contract";
import type { SyllableBuildCopy } from "../screens/syllable-build/syllable-build.contract";
import type { TypingCopy } from "../screens/typing/typing.contract";
import type { VocabCardCopy } from "../screens/vocab-card/vocab-card.contract";
import type { WordChoicePictureCopy } from "../screens/word-choice/word-choice-picture";
import { n } from "./ui-copy-en-plural";

const unavailableTail = {
  pending: "coming soon",
  update: "update the app to open",
  unavailable: "not available",
} as const;

export const catalogMapEn: CatalogMapCopy = {
  episodeLabel: (ordinal) => `Episode ${ordinal}.`,
  coverTitle: "Episode intro",
  lessonTitle: (ordinal) => `Lesson ${ordinal}`,
  finalTitle: "Final test",
  cultureTitle: "Culture",
  nodeLabel: (label, title) => `${label} ${title}`,
  caption: {
    pending: "COMING SOON",
    update: "UPDATE REQUIRED",
    unavailable: "NOT AVAILABLE",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}, ${unavailableTail[kind]}`,
  comingSoon: {
    title: "Coming soon",
    body: "We're preparing the next story.",
    label: (episodeLabel) => `${episodeLabel} Coming soon. We're preparing the next story.`,
  },
};

export const catalogCoverEn: CatalogCoverCopy = {
  toggleScript: {
    en: "Show romanization",
    roman: "Show English",
  },
  nextCut: (ordinal, total) => `Next scene, ${ordinal} of ${total}`,
  finishCover: "Finish intro",
  finishEpilogue: "Finish episode",
  thinking: "thinking",
  episodeStart: "Episode start!",
  episodeClear: "Episode clear!",
  skipDescription: "You can watch it again anytime from the episode intro.",
};

export const typingEn: TypingCopy = {
  instruction: "Type the sentence in Korean.",
  answerField: (typed) => `Your answer: ${typed}`,
  answerFieldEmpty: "Your answer, empty",
  answerReveal: (answer) => `Answer: ${answer}`,
};

export const vocabCardEn: VocabCardCopy = {
  instruction: "Learn this word.",
  badge: "New word",
  gotIt: "Got it",
  runLabel: (ordinal, total) => `Word ${ordinal} of ${total}`,
  pronunciation: (romanization) => `Pronunciation: ${romanization}`,
  meaning: (meaning) => `Meaning: ${meaning}`,
};

export const cultureCardEn: CultureCardCopy = {
  instruction: "Learn about life in Korea.",
  eyebrow: "CULTURE",
  tapToFlip: "Tap to flip",
  flipCard: "Flip card",
  nextCard: "Next card",
  koreanBodyTitle: "In Korean",
  counter: (position, total) => `${position} / ${total}`,
  pronunciation: (romanization) => `Pronunciation: ${romanization}`,
  frontPlace: (position, total) => `Culture card ${position} of ${total}, front.`,
  backPlace: (position, total) => `Culture card ${position} of ${total}, back.`,
  flipBackHint: "Tap to flip back.",
};

export const syllableBuildEn: SyllableBuildCopy = {
  instruction: "Tap the syllables to spell the word.",
  meaning: (meaning) => `Meaning: ${meaning}`,
  placedTile: (text, position, slotCount) => `${text}, position ${position} of ${slotCount}`,
  wordEmpty: (slotCount) =>
    `Your word, empty, ${slotCount} ${slotCount === 1 ? "syllable" : "syllables"}`,
  word: (word) => `Your word: ${word}`,
  usedTile: (text) => `${text}, used`,
};

export const readAloudEn: ReadAloudCopy = {
  matched: (matched, total) => {
    if (matched === total) {
      return total === 1 ? "You said the word." : `You said all ${total} words.`;
    }
    // 앞에서부터 이어 맞은 수입니다 — 0이면 "first"를 붙이지 않습니다.
    const lead = matched === 0 ? "" : "the first ";
    return `You said ${lead}${matched} of ${n(total, "word", "words")}.`;
  },
  pronunciation: (romanization) => `Pronunciation: ${romanization}`,
};

export const speakWordEn: SpeakWordCopy = {
  instruction: "Say the word for the picture.",
  recognitionUnavailable: "Speech recognition isn't available right now. Tap Skip to continue.",
};

export const pairMatchEn: PairMatchCopy = {
  instruction: "Tap a word, then its meaning.",
  progress: (matched, total) => `${matched} / ${total} matched`,
  progressLabel: (matched, total) => `${matched} of ${total} pairs matched`,
  selected: (text) => `${text}, selected`,
  matched: (text, ordinal, partner) => `${text}, pair ${ordinal}, matched with ${partner}`,
  judged: (text, partner) => `${text}, matched with ${partner}`,
  answerPair: (word, meaning) => `${word} = ${meaning}`,
  linked: (word, meaning, matched, total) =>
    `Matched: ${word}, ${meaning}. ${matched} of ${total}.`,
  unlinked: (text) => `Unmatched: ${text}`,
  missedPairs: (pairs) => `Correct pairs: ${pairs}`,
  spokenPair: (word, meaning) => `${word}, ${meaning}.`,
};

export const wordChoicePictureEn: WordChoicePictureCopy = {
  picture: (meaning) => `Picture: ${meaning}`,
  loading: "Picture, loading",
  unavailable: (meaning) => `Picture unavailable. Meaning: ${meaning}`,
  unavailableCaption: "Picture unavailable",
  answer: (word, romanization, meaning) =>
    romanization === null
      ? `Answer: ${word}, ${meaning}`
      : `Answer: ${word}, ${romanization}, ${meaning}`,
  answerSubline: (romanization, meaning) =>
    romanization === null ? meaning : `${romanization} · ${meaning}`,
};

export const catalogFinalEn: CatalogFinalCopy = {
  turnProgress: (n, total) => `Turn ${n} of ${total}`,
  replyLabel: (reply) => `Your reply: ${reply}`,
  replyEmpty: "Your reply, empty",
  replyHint: (translation) => `Say: ${translation}`,
  correctAnswer: (answer) => `Answer: ${answer}`,
  answerLabel: "Answer",
};

export const audioUnavailableEn: AudioUnavailableCopy = {
  label: "Audio not available yet",
};
