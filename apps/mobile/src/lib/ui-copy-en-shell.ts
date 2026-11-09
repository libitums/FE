// 영어 문구표 구획 — common · shell · journeyMap · learningShell.

import type {
  CommonCopy,
  JourneyMapCopy,
  LearningShellCopy,
  ShellCopy,
} from "./ui-copy-sections.contract";
import type { ProgressLoadCopy } from "../screens/journey-map/journey-map-load.contract";
import type { SplashCopy } from "../screens/splash/splash.contract";
import type { SpecialUnitMapCopy } from "../screens/journey-map/journey-special-unit.contract";
import { n } from "./ui-copy-en-plural";

export const commonEn: CommonCopy = {
  exitTo: { journey: "Back to map", roleplay: "Back to list" },
  backToSettings: "Back to settings",
  back: "Back",
  answerResult: { correct: "Correct", incorrect: "Incorrect" },
  answerResultSuffix: { correct: "correct", incorrect: "incorrect" },
  resultAnnouncement: (result) => `Result, ${result === "correct" ? "correct" : "incorrect"}`,
  allQuestionsDone: "All questions done",
  seeResults: "See results",
  next: "Next",
  continue: "Continue",
  check: "Check",
  ok: "OK",
  close: "Close",
  skip: "Skip",
  listening: "Listening",
  send: "Send",
  sendWithText: (text) => `Send, ${text}`,
  me: "Me",
  delete: "Delete",
  startOver: "Start over",
  blank: "blank",
  selected: (label) => `${label}, selected`,
  locked: (label) => `${label}, locked`,
  stepTitle: (ordinal, activity) => `Step ${ordinal} · ${activity}`,
  count: {
    streakDays: (days) => `${days}-day streak`,
    trophies: (count) => n(count, "trophy", "trophies"),
    gems: (count) => n(count, "gem", "gems"),
    coins: (count) => n(count, "coin", "coins"),
  },
};

export const shellEn: ShellCopy = {
  tabs: { journey: "Journey", roleplay: "Roleplay", settings: "Settings" },
  notifications: "Notifications",
  errorBoundary: { title: "Something went wrong", retry: "Try again" },
};

export const journeyMapEn: JourneyMapCopy = {
  start: "Start",
  activityCount: (completed, total) =>
    `${completed}/${total} ${total === 1 ? "activity" : "activities"}`,
  activityProgressLabel: (completed, total) =>
    `${completed} of ${n(total, "activity", "activities")} done`,
  // 설명 줄: 끝의 마침표를 떼고, 번호는 두 자리로 채웁니다.
  episodeUnitLabel: (episodeLabel, unit) =>
    `${String(episodeLabel).replace(/\.$/, "")}, unit ${String(unit).padStart(2, "0")}`,
  statModal: {
    streakHero: (days) => `${days}-day streak`,
    episodesClearedHero: (count) => `${n(count, "episode", "episodes")} cleared`,
    slotProgress: (completed, total) => `${completed} of ${total} completed`,
    kind: {
      streak: {
        title: "day streak",
        message: "Amazing work! Come back tomorrow to keep your streak alive!",
      },
      trophy: {
        title: "Episode Clear!",
        // Figma 원문은 "…to clear chapter"입니다. 제목(Episode Clear!)과 용어를 맞추고 관사 ·
        // 문장 부호를 보태 고쳤습니다(PR #124 리뷰). Figma 쪽 반영이 뒤따라야 합니다.
        message: "Amazing work! Come back tomorrow to clear the next episode!",
      },
    },
    continue: "Continue →",
    // 요일 약칭은 디자인 표기 그대로입니다.
    weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  },
};

export const learningShellEn: LearningShellCopy = {
  exitLesson: "Leave lesson",
  formLabels: {
    listening: "Listening",
    "sentence-order": "Word order",
    "word-choice": "Word choice",
    culture: "Culture",
    speaking: "Speaking",
    writing: "Writing",
    typing: "Typing",
    "vocab-card": "New words",
    "pair-match": "Matching",
    "culture-card": "Culture",
    "syllable-build": "Spelling",
    "read-aloud": "Speaking",
    "speak-word": "Speaking",
  },
  progressLabel: (ordinal, total) => `Lesson ${String(ordinal)} / ${String(total)}`,
  cultureQuizLabel: "Culture quiz",
  completionDescription: "Take a breath. You're ready for the next step.",
  completedQuestions: (count) => `${count} of ${n(count, "question", "questions")} completed`,
  // 완료 카드(시안 A)의 활동 타일 낭독 이름과, 숫자 타일의 보이는 이름(대문자 — 결과 화면 `PERFECT LESSON`과 같은 갈래)입니다.
  completedActivities: (count) => `${n(count, "activity", "activities")} completed`,
  completionStats: {
    questions: "QUESTIONS",
    activities: "ACTIVITIES",
  },
  leaveDialog: {
    title: "Leave this lesson?",
    description: "Your answers so far won't be saved, and you'll start over next time.",
    leave: "Leave",
    stay: "Keep going",
  },
  headerNoQuestions: (formLabel) => `${formLabel}, no questions`,
  headerQuestionOf: (formLabel, ordinal, count) => `${formLabel}, question ${ordinal} of ${count}`,
  review: {
    intro: (count) => `Let\u2019s fix ${n(count, "mistake", "mistakes")}`,
    remaining: (count) => `${count} more to pass`,
    unlocked: "Pass unlocked",
    progress: (ordinal, total) => `Review ${ordinal} / ${total}`,
    headerOf: (formLabel, ordinal, total) => `${formLabel}, review ${ordinal} of ${total}`,
    formSuffix: " \u00b7 try again",
    fixed: "Fixed it!",
    missed: "Not quite",
    missedLine: "No worries \u2014 keep going.",
  },
};

export const specialUnitMapEn: SpecialUnitMapCopy = {
  accessibilityLabel: (name) => `special, ${name}`,
};

export const progressLoadEn: ProgressLoadCopy = {
  loading: "Loading your progress\u2026",
  loadingAnnouncement: "Loading your progress",
  failed: "Couldn't load your progress.",
  retry: "Try again",
};

export const splashEn: SplashCopy = {
  updating: "Updating episodes",
  updatingLabel: (percent) => `Updating episodes, ${percent}%`,
};
