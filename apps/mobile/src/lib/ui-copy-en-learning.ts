// 영어 문구표 구획 — 학습 활동(listening ~ lessonComplete).

import type {
  AssessmentCopy,
  LessonCompleteCopy,
  ListeningCopy,
  SentenceOrderCopy,
  SpeakingCopy,
  WordChoiceCopy,
} from "./ui-copy-sections.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";
import { n } from "./ui-copy-en-plural";

export const listeningEn: ListeningCopy = {
  instruction: "Choose what the sentence means.",
  playback: { pause: "Pause", resume: "Resume", play: "Play" },
  playFromStart: "Play from the start",
  slow: "Slow",
  playAgain: "Play again",
  stop: "Stop",
};

export const wordChoiceEn: WordChoiceCopy = {
  instruction: "Choose the word that fits.",
  culture: {
    sceneInstruction: "What do you say?",
    feedbackTitle: {
      scene: { correct: "Nice reply!", incorrect: "Not quite" },
      question: { correct: "That's right!", incorrect: "Not quite" },
    },
  },
};

export const sentenceOrderEn: SentenceOrderCopy = {
  instruction: "Complete the conversation.",
  placedChip: (text, position) => `${text}, position ${position}`,
  dialogueSpeaker: { counterpart: "Partner", me: "You" },
  dialogueTurn: (speaker, position, text) => `${speaker}, turn ${position}: ${text}`,
  dialogueEmptyTurn: (speaker, position) => `${speaker}, turn ${position}, empty`,
  dialogueLine: {
    me: (text) => `Your line: ${text}`,
    counterpart: (text) => `Partner's line: ${text}`,
  },
};

export const speakingEn: SpeakingCopy = {
  instruction: "Read the sentence out loud.",
  speak: "Speak",
  stopSpeaking: "Stop speaking",
  tryAgain: "Try again",
  dictationDisabled:
    "Siri or Dictation is off. Turn on Settings > General > Keyboard > Enable Dictation, then try again.",
  tapToContinue: "Tap the screen to continue",
  recognitionUnavailable: "Speech recognition isn't available right now. Tap Skip to continue.",
};

export const assessmentEn: AssessmentCopy = {
  activity: "Assessment",
  verdict: { passed: "Passed", failed: "Not passed" },
  itemTitle: (ordinal) => `Question ${ordinal}`,
  announcement: (verdict) => `Assessment result, ${verdict === "passed" ? "passed" : "not passed"}`,
};

export const lessonCompleteEn: LessonCompleteCopy = {
  rewardCoins: (count) => `Reward, ${n(count, "coin", "coins")}`,
  grade: (grade) => `Grade ${grade}`,
  gradeName: (grade) => grade,
  outcome: { passed: "Lesson complete", failed: "Lesson not passed" },
  mistakes: (count) => (count === 0 ? "no mistakes" : n(count, "mistake", "mistakes")),
  skippedSuffix: (count) =>
    count === 0 ? "" : `, ${n(count, "skipped question", "skipped questions")}`,
  nextLesson: "Next lesson",
  nextFinal: "Final test",
  continueStory: "Continue story",
  title: { perfect: "PERFECT LESSON!", complete: "LESSON COMPLETE!", failed: "LESSON FAILED" },
  subtitle: (mistakeCount) =>
    mistakeCount === 0
      ? "YOU MADE NO MISTAKES IN THIS LESSON"
      : `YOU MADE ${mistakeCount} ${mistakeCount === 1 ? "MISTAKE" : "MISTAKES"} IN THIS LESSON`,
  streakLabel: (days) => `${days} Day Streak`,
  rewardLabel: (count) => `+ ${count} REWARD`,
  tryAgain: "Try again",
  review: {
    soClose: "SO CLOSE!",
    fixedOf: (fixed, total) =>
      `YOU FIXED ${fixed} OF ${total} ${total === 1 ? "MISTAKE" : "MISTAKES"}`,
    dotsLabel: (fixed, total) => `Fixed ${fixed} of ${n(total, "mistake", "mistakes")}`,
    neededMore: (count) =>
      `You needed ${count} more right. Try the lesson again \u2014 it\u2019ll feel easier now.`,
  },
};

// 학습 문항 안내 문구입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다.
export const learningItemGuideEn: LearningItemGuideCopy = {
  "sentence-order": {
    title: "Just one piece this time",
    description:
      "Usually you put several pieces in order. Here there's only one, so tap it, then tap Check.",
  },
  "activity-vocab-card": {
    title: "New word",
    description: "Listen to the word and look at its meaning. Tap Next when you're ready.",
  },
  "activity-word-choice": {
    title: "Pick one",
    description: "Choose the answer that fits, then tap Check.",
  },
  "activity-listening": {
    title: "Listen first",
    description: "Tap the speaker to hear it again. Then choose what you heard.",
  },
  "activity-syllable-build": {
    title: "Build the word",
    description: "Tap the syllable blocks in order to make the word. Then tap Check.",
  },
  "activity-sentence-order": {
    title: "Put it in order",
    description: "Tap the pieces in order to make the sentence. Tap a piece again to take it back.",
  },
  "activity-culture-card": {
    title: "Culture note",
    description: "A short tip about life in Korea. Read it, then tap Next.",
  },
};
