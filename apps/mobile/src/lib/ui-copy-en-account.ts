// 영어 문구표 구획 — 계정 · 기타(notifications ~ gemPurchase).

import type {
  GemPurchaseCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";

export const notificationsEn: NotificationsCopy = {
  title: "Notifications",
  emptyTitle: "No notifications yet",
  emptyBody: "We'll let you know here when there's something new.",
  deleteLabel: (message) => `${message}, delete`,
  destination: {
    messenger: "Open messenger",
    "phone-call": "Open call",
    "visual-novel": "Open visual novel",
    "roleplay-list": "See roleplay list",
  },
};

export const settingsEn: SettingsCopy = {
  title: "Settings",
  group: { account: "Account", learning: "Learning", accountActions: "Account actions" },
  nav: {
    profile: "User profile",
    notifications: "Notifications",
    "privacy-policy": "Privacy Policy",
    "terms-of-use": "Terms of Use",
  },
  sessionOption: { "auto-play-audio": "Auto-play", "show-transcript": "Show transcript" },
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
