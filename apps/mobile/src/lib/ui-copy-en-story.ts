// 영어 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay).

import type {
  EpisodeFinalCopy,
  EpisodeIntroCopy,
  EpisodeNarrativeCopy,
  MessengerCopy,
  PhoneCallCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";

export const episodeIntroEn: EpisodeIntroCopy = {
  guide: {
    map: "Tap to start your lesson!",
    continue: "Tap anywhere to continue",
    story: {
      title: "Learn Korean through stories",
      description:
        "Explore stories, chats and calls in this episode. Tap the screen to read the next line.",
    },
    messenger: {
      title: "Be part of the conversation",
      description:
        "Read the messages and their translations. When your reply appears, tap the send arrow.",
    },
    call: {
      title: "Listen to a Korean call",
      description:
        "Answer the call to listen. Follow the translations and tap Continue when the call ends.",
    },
  },
  skipDialog: {
    title: "Skip the story?",
    description: "If you skip it, this episode's story won't appear again.",
    skip: "Skip",
    keepWatching: "Keep watching",
  },
  call: {
    volumeDown: "Volume down",
    volumeUp: "Volume up",
    volumeLevel: (level, max) => `Volume ${level} of ${max}`,
    volume: "Volume",
    volumeExpanded: "Volume, expanded",
    mute: (on) => `Mute, ${on ? "on" : "off"}`,
    endCall: "End call",
  },
};

export const episodeNarrativeEn: EpisodeNarrativeCopy = {
  nextLine: (ordinal, total) => `Next line, ${ordinal} of ${total}`,
};

export const episodeFinalEn: EpisodeFinalCopy = {
  optionSuffix: { idle: "", correct: ", correct", incorrect: ", your answer, incorrect" },
};

export const messengerEn: MessengerCopy = {
  chooseReply: "Choose a reply, then send.",
  placeholder: "Type your answer.",
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

export const phoneCallEn: PhoneCallCopy = {
  status: {
    incoming: "Incoming call…",
    ready: "Ready to call",
    playing: "Speaking…",
    "reply-ready": "Your turn to reply",
    completed: "Call ended",
  },
  play: { start: "Accept", listen: "Listen", "listen-again": "Listen again" },
  voiceCall: (callerName) => `Voice call, ${callerName}`,
};

export const visualNovelEn: VisualNovelCopy = {
  storyComplete: "Story complete",
  sceneProgress: (ordinal, total) => `Scene ${ordinal} / ${total}`,
};

export const roleplayEn: RoleplayCopy = {
  title: "Roleplay",
  form: { messenger: "Messenger", "phone-call": "Phone call", "visual-novel": "Visual novel" },
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
