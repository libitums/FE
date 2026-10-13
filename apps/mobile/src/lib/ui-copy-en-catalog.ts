// 영어 문구표 구획 — 카탈로그 맵 · 표지 컷.

import type { AudioUnavailableCopy } from "../components/audio-unavailable.contract";
import type { CatalogCoverCopy } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogFinalCopy } from "../screens/catalog-final/catalog-final.contract";
import type { CatalogMapCopy } from "../screens/journey-map/catalog-map.contract";
import type { PairMatchCopy } from "../screens/pair-match/pair-match.contract";
import type { TypingCopy } from "../screens/typing/typing.contract";
import type { VocabCardCopy } from "../screens/vocab-card/vocab-card.contract";
import type { WordChoicePictureCopy } from "../screens/word-choice/word-choice-picture";

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
  nodeLabel: (label, title) => `${label} ${title}`,
  caption: {
    pending: "COMING SOON",
    update: "UPDATE REQUIRED",
    unavailable: "NOT AVAILABLE",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}, ${unavailableTail[kind]}`,
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
  exampleTitle: "Example",
  pronunciation: (romanization) => `Pronunciation: ${romanization}`,
  meaning: (meaning) => `Meaning: ${meaning}`,
  example: (text) => `Example: ${text}`,
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
};

export const audioUnavailableEn: AudioUnavailableCopy = {
  label: "Audio not available yet",
};
