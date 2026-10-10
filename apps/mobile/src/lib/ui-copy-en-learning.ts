// 영어 문구표 구획 — 학습 활동(listening ~ lessonComplete).

import type {
  AssessmentCopy,
  CultureCopy,
  CultureQuizCopy,
  LessonCompleteCopy,
  ListeningCopy,
  SentenceOrderCopy,
  SpeakingCopy,
  WordChoiceCopy,
  WritingCopy,
} from "./ui-copy-sections.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";
import { n } from "./ui-copy-en-plural";

export const listeningEn: ListeningCopy = {
  instruction: "Choose what the sentence means.",
  playback: { pause: "Pause", resume: "Resume", play: "Play" },
  playFromStart: "Play from the start",
};

export const wordChoiceEn: WordChoiceCopy = { instruction: "Choose the word that fits." };

export const sentenceOrderEn: SentenceOrderCopy = {
  instruction: "Complete the conversation.",
  placedChip: (text, position) => `${text}, position ${position}`,
};

export const speakingEn: SpeakingCopy = {
  instruction: "Read the sentence out loud.",
  speak: "Speak",
  stopSpeaking: "Stop speaking",
  tryAgain: "Try again",
  dictationDisabled:
    "Siri or Dictation is off. Turn on Settings > General > Keyboard > Enable Dictation, then try again.",
  tapToContinue: "Tap the screen to continue",
  recognitionUnavailable:
    "Speech recognition isn't available right now. Skip to the next sentence.",
};

export const writingEn: WritingCopy = {
  instruction: "Trace the letters in the blank.",
  erase: "Erase",
  rewrite: "Write again",
  recognitionUnavailable: "Handwriting can't be checked right now. Moving on.",
  guideGlyph: (glyph) => `Guide letter ${glyph}`,
  slotsAllWritten: (total, written) =>
    `${n(total, "letter", "letters")} to write, all written, ${written}`,
  slotsCurrent: (total, position, current, written) =>
    `Letter ${position} of ${total}, ${current}${written === "" ? "" : `, written ${written}`}`,
};

export const cultureEn: CultureCopy = { activity: "Culture", takeQuiz: "Take the quiz" };

export const cultureQuizEn: CultureQuizCopy = {
  activity: "Culture quiz",
  instruction: "Choose the right answer.",
  progress: (ordinal, total) => `Question ${ordinal} / ${total}`,
};

export const assessmentEn: AssessmentCopy = {
  activity: "Assessment",
  verdict: { passed: "Passed", failed: "Not passed" },
  itemTitle: (ordinal) => `Question ${ordinal}`,
  announcement: (verdict) => `Assessment result, ${verdict === "passed" ? "passed" : "not passed"}`,
};

export const lessonCompleteEn: LessonCompleteCopy = {
  rewardDiamonds: (count) => `Reward, ${n(count, "diamond", "diamonds")}`,
  grade: (grade) => `Grade ${grade}`,
  outcome: { passed: "Lesson complete", failed: "Lesson not passed" },
  mistakes: (count) => (count === 0 ? "no mistakes" : n(count, "mistake", "mistakes")),
  skippedSuffix: (count) =>
    count === 0 ? "" : `, ${n(count, "skipped question", "skipped questions")}`,
};

// 학습 문항 안내 문구입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다.
export const learningItemGuideEn: LearningItemGuideCopy = {
  "sentence-order": {
    title: "Just one piece this time",
    description:
      "Usually you put several pieces in order. Here there's only one, so tap it, then tap Check.",
  },
  messenger: {
    title: "Just one reply this time",
    description:
      "Usually you choose a reply or type your own. Here there's only one, so tap it and send.",
  },
  "phone-call": {
    title: "Reply with a tap",
    description:
      "Tap Accept and listen. You don't need to speak, so just tap your reply when it's your turn.",
  },
  "visual-novel": {
    title: "Your lines are ready",
    description:
      "Tap Next to read each line. Your replies are already written, so there's nothing to choose.",
  },
  speaking: {
    title: "Try it, or skip it",
    description: "Tap Speak and read the sentence out loud, or tap Skip if you're not ready.",
  },
  writing: {
    title: "Trace it, or skip it",
    description: "Follow the pale letter with your finger and tap Check, or tap Skip to move on.",
  },
};
