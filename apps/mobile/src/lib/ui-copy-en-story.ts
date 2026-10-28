// 영어 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay).

import type {
  EpisodeIntroCopy,
  MessengerCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";
import type { StoryCallCopy } from "../screens/story-call/story-call.contract";
import type { StoryIntroCopy } from "../screens/story-intro/story-intro.contract";
import type { StoryMessengerCopy } from "../screens/story-messenger/story-messenger.contract";

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
  sceneProgress: (ordinal, total) => `Scene ${ordinal} / ${total}`,
};

export const roleplayEn: RoleplayCopy = {
  title: "Roleplay",
  form: { story: "Roleplay" },
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

export const storyMessengerEn: StoryMessengerCopy = {
  back: "Back to map",
  typing: (speaker) => `${speaker} is typing`,
  replyTitle: "How will you reply?",
  closeReply: "Close",
  send: "Send",
  composerPlaceholder: "Message",
  finish: "Finish story",
};

export const storyIntroEn: StoryIntroCopy = {
  overline: (ordinal) => `STORY · EPISODE ${ordinal}`,
  back: "Back to map",
  skip: "Skip",
  start: "Start",
  skipDialog: {
    title: "Skip the story?",
    description: "You can watch it again anytime from the map.",
    skip: "Skip",
    keepWatching: "Keep watching",
  },
};

export const storyCallEn: StoryCallCopy = {
  incoming: "Incoming call",
  answer: "Answer",
  connecting: "Connecting…",
  callEnded: (clock) => `Call ended · ${clock}`,
  me: "Me",
  mute: "Mute",
  speaker: "Speaker",
  end: "End",
  back: "Back to map",
  finish: "Finish story",
};
