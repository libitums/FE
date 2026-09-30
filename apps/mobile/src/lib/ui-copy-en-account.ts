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
  group: { account: "Account", learning: "Learning" },
  nav: {
    profile: "User profile",
    "privacy-policy": "Privacy Policy",
    "terms-of-use": "Terms of Use",
  },
  sessionOption: { "auto-play-audio": "Auto-play", "show-transcript": "Show transcript" },
  optionState: { on: "on", off: "off" },
};

export const profileEn: ProfileCopy = {
  title: "User profile",
  itemLabel: {
    name: "Name",
    "learning-language": "Learning language",
    "learning-goal": "Learning goal",
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
