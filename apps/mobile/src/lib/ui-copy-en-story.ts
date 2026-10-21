// 영어 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay).

import type {
  EpisodeIntroCopy,
  MessengerCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";

export const episodeIntroEn: EpisodeIntroCopy = {
  guide: {
    map: "Tap to start your lesson!",
    continue: "Tap anywhere to continue",
  },
  skipDialog: {
    title: "Skip the story?",
    description: "If you skip it, this episode's story won't appear again.",
    skip: "Skip",
    keepWatching: "Keep watching",
  },
};

export const messengerEn: MessengerCopy = {
  keyboard: {
    shift: "Shift",
    shiftOn: "Shift, on",
    backspace: "Delete",
    comma: "Comma",
    period: "Period",
    space: "Space",
    questionMark: "Question mark",
  },
};

export const visualNovelEn: VisualNovelCopy = {
  storyComplete: "Story complete",
  sceneProgress: (ordinal, total) => `Scene ${ordinal} / ${total}`,
};

export const roleplayEn: RoleplayCopy = {
  title: "Roleplay",
  form: {
    messenger: "Messenger",
    "phone-call": "Phone call",
    "visual-novel": "Visual novel",
    story: "Roleplay",
  },
  viewAll: "View all",
  viewAllLabel: (sectionLabel) => `View all, ${sectionLabel}`,
  plus: "Plus",
  plusTagline: "Practice similar situations",
  plusSectionLabel: (sectionLabel) =>
    `${sectionLabel} Plus roleplay, practice situations similar to this episode`,
  plusDialogTitle: "Plus roleplay",
  lockedSection: (name) => `${name}, locked, finish this episode in your journey to unlock it`,
  premiumLock: { episode: "locked", payment: "Plus only" },
  premiumNotice: (itemTitle) => `“${itemTitle}” is a Plus roleplay. Plus isn't available yet.`,
};
