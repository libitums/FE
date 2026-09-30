// 영어 문구표 구획 — common · shell · journeyMap · learningShell.

import type {
  CommonCopy,
  JourneyMapCopy,
  LearningShellCopy,
  ShellCopy,
} from "./ui-copy-sections.contract";
import { n } from "./ui-copy-en-plural";

export const commonEn: CommonCopy = {
  exitTo: { journey: "Back to map", roleplay: "Back to list" },
  backToSettings: "Back to settings",
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
    diamonds: (count) => n(count, "diamond", "diamonds"),
  },
};

export const shellEn: ShellCopy = {
  tabs: { journey: "Journey", roleplay: "Roleplay", settings: "Settings" },
  notifications: "Notifications",
  errorBoundary: { title: "Something went wrong", retry: "Try again" },
};

export const journeyMapEn: JourneyMapCopy = {
  stepStatus: { done: "completed", current: "current step", locked: "locked" },
  start: "Start",
  activityCount: (completed, total) =>
    `${completed}/${total} ${total === 1 ? "activity" : "activities"}`,
  activityProgressLabel: (completed, total) =>
    `${completed} of ${n(total, "activity", "activities")} done`,
  episodePendingLabel: "COMING SOON",
  episodePending: (label, title) => `${label} ${title}, coming soon`,
  statModal: {
    streakHero: (days) => `${days}-day streak`,
    episodesClearedHero: (count) => `${n(count, "episode", "episodes")} cleared`,
    slotProgress: (completed, total) => `${completed} of ${total} completed`,
  },
};

export const learningShellEn: LearningShellCopy = {
  exitLesson: "Leave lesson",
  completionDescription: "Take a breath. You're ready for the next step.",
  completedQuestions: (count) => `${count} of ${n(count, "question", "questions")} completed`,
  leaveDialog: {
    title: "Leave this lesson?",
    description: "Your answers so far won't be saved, and you'll start over next time.",
    leave: "Leave",
    stay: "Keep going",
  },
  headerNoQuestions: (formLabel) => `${formLabel}, no questions`,
  headerQuestionOf: (formLabel, ordinal, count) => `${formLabel}, question ${ordinal} of ${count}`,
};
