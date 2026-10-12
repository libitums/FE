// 영어 문구표 구획 — 카탈로그 맵 · 표지 컷.

import type { AudioUnavailableCopy } from "../components/audio-unavailable.contract";
import type { CatalogCoverCopy } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogFinalCopy } from "../screens/catalog-final/catalog-final.contract";
import type { CatalogMapCopy } from "../screens/journey-map/catalog-map.contract";
import type { TypingCopy } from "../screens/typing/typing.contract";

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
};

export const typingEn: TypingCopy = {
  instruction: "Type the sentence in Korean.",
  answerField: (typed) => `Your answer: ${typed}`,
  answerFieldEmpty: "Your answer, empty",
  answerReveal: (answer) => `Answer: ${answer}`,
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
