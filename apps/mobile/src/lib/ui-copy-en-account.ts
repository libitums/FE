// 영어 문구표 구획 — 계정 · 기타(notifications ~ gemPurchase).

import type { FeedbackCopy } from "./feedback.contract";
import type {
  AppUpdateCopy,
  GemPurchaseCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";
import type { DownloadSheetCopy } from "./ui-copy-settings.contract";

export const notificationsEn: NotificationsCopy = {
  title: "Notifications",
  emptyTitle: "No notifications yet",
  emptyBody: "We'll let you know here when there's something new.",
  deleteLabel: (message) => `${message}, delete`,
  destination: {
    "roleplay-list": "See roleplay list",
  },
};

export const settingsEn: SettingsCopy = {
  title: "Settings",
  group: { account: "Account", learning: "Learning", accountActions: "Account actions" },
  nav: {
    profile: "User profile",
    "learner-profile": "Name and country in lessons",
    language: "Language",
    download: "Downloads",
    notifications: "Notifications",
    feedback: "Send feedback",
    "privacy-policy": "Privacy Policy",
    "terms-of-use": "Terms of Use",
  },
  downloads: {
    title: "Downloads",
    caption: "Choose when pictures and audio download.",
    mobileDataHeading: "Download on mobile data",
    policy: { ask: "Ask every time", always: "Always download", "wifi-only": "Wi-Fi only" },
    offlineHeading: "Offline",
    downloadAll: "Download all for offline",
    downloadAllCaption:
      "Pictures and audio for every episode, so you can learn without a connection.",
    downloadAllStarted: "Downloading in the background. You can keep learning.",
    downloaded: (size) => `Downloaded: ${size}`,
    episodeRow: (n, d, t) => `Episode ${n}: ${d} of ${t} lessons`,
    episodeRowComplete: (n) => `Episode ${n}: complete`,
    downloadRest: (n) => `Download the rest of Episode ${n}`,
    confirm: {
      title: "Download on mobile data?",
      description: "Downloading every episode can use a lot of data. You can also wait for Wi-Fi.",
      download: "Download now",
      cancel: "Cancel",
      restDescription: (n) =>
        `The rest of Episode ${n} downloads on mobile data. You can also wait for Wi-Fi.`,
    },
  },
  sessionOption: {
    "auto-play-audio": "Auto-play",
    "show-transcript": "Show transcript",
    "show-choice-romanization": "Romanization on choices",
  },
  sessionOptionDescription: {
    "show-choice-romanization": "Show how each Korean answer is read, in small text above it.",
  },
  optionState: { on: "on", off: "off" },
  action: { "sign-out": "Sign out", "delete-account": "Delete account" },
  signOutDialog: { title: "Sign out?", confirm: "Sign out", cancel: "Stay signed in" },
  deleteDialog: {
    title: "Delete your account?",
    description:
      "Your account and learning progress will be permanently deleted. This can't be undone.",
    confirm: "Delete account",
    cancel: "Keep account",
  },
  deleteFailure: {
    network: "Couldn't delete your account. Check your connection and try again.",
    other: "Couldn't delete your account. Please try again.",
  },
  exitAnnouncement: { "signed-out": "You're signed out.", deleted: "Your account was deleted." },
  version: (name, build) => `Version ${name} (${build})`,
};

export const appUpdateEn: AppUpdateCopy = {
  title: "Update Duru to continue",
  description:
    "This version of Duru is no longer supported. Get the latest version from the store to keep learning.",
  update: "Update",
  failure: "Couldn't open the store. Please update Duru from the App Store or Google Play.",
};

export const feedbackEn: FeedbackCopy = {
  title: "Send feedback",
  ratingQuestion: "How is Duru so far?",
  ratingOption: { 1: "Not good", 2: "Could be better", 3: "Okay", 4: "Good", 5: "Love it" },
  messageLabel: "Anything else you'd like to tell us? (optional)",
  send: "Send",
  sent: "Thanks! We got your feedback.",
  failed: "Couldn't send your feedback. Please try again.",
  survey: {
    title: "How was this episode?",
    description: (episodeTitle) => `You finished ${episodeTitle}. Tell us what you thought.`,
    skip: "Not now",
  },
};

export const profileEn: ProfileCopy = {
  notProvided: "Not provided",
  learningLanguage: "Korean",
  title: "User profile",
  itemLabel: {
    name: "Name",
    "learning-language": "Learning language",
    email: "Email",
    phone: "Phone number",
  },
};

export const gemPurchaseEn: GemPurchaseCopy = {
  packAmount: (count, display) => `${display} ${count === 1 ? "gem" : "gems"}`,
  balance: (count, display) => `You have ${display} ${count === 1 ? "gem" : "gems"}`,
  paymentMethod: "Payment method",
  notice: {
    title: "Payment coming soon",
    description: "Gem payments aren't available yet. Please check back soon.",
  },
};

export const downloadSheetEn: DownloadSheetCopy = {
  askTitle: (n) => `Download Episode ${n}?`,
  askDescription:
    "Pictures and audio for this episode aren't on your phone yet. Downloading uses mobile data.",
  size: (size) => `About ${size}`,
  downloadNow: "Download now",
  onWifi: "Download on Wi-Fi",
  wifiOnlyTitle: (n) => `Episode ${n} downloads on Wi-Fi`,
  wifiOnlyDescription:
    "You chose Wi-Fi only in Settings. Use mobile data this once, open without pictures and audio, or change the setting.",
  ok: "OK",
  offlineTitle: "You're offline",
  offlineDescription: (n) =>
    `Episode ${n} isn't downloaded yet. It will download when you're back online.`,
  openAnyway: "Open anyway",
  close: "Close",
  askUnitTitle: (l) => `Download ${l}?`,
  askUnitDescription:
    "Pictures and audio for this lesson aren't on your phone yet. Downloading uses mobile data.",
  rows: {
    common: "Shared pictures and audio",
    allLessons: "All lessons in this episode",
    otherLessons: "Other lessons",
    status: { done: "On your phone", pending: "Downloads now", wifi: "On Wi-Fi" },
  },
  askHint: "You'll be asked each time. Change this in Settings › Downloads.",
  wifiOnlyUnitTitle: (l) => `${l} downloads on Wi-Fi`,
  mobileDataOnce: "Use mobile data this once",
  openWithout: "Open without pictures and audio",
  changeSetting: "Change setting",
  offlineUnitDescription: (l) =>
    `${l} isn't downloaded yet. It will download when you're back online.`,
  offlineHint: "Pictures show as plain color and listening items are skipped.",
  allCleared: {
    title: "You've finished every story here",
    description: "New episodes may be waiting. Connect to the internet and we'll check for you.",
    offline: "You're offline",
    lastChecked: (d) =>
      d === null
        ? "Not checked yet"
        : d === 0
          ? "Last checked today"
          : d === 1
            ? "Last checked yesterday"
            : `Last checked ${d} days ago`,
    checkNow: "Check now",
    later: "Later",
    autoNote: "We'll also check automatically when you're back online.",
    offlineHint: "We'll check as soon as you're connected.",
  },
};
