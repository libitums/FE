// 대화 설정(ADR-0126)의 문구 · test-id 계약입니다 — 설정 탭 Chats 화면 · 먼저 보내는 메시지 · 기억 · 교정 방식.

import type { FeedbackCopy } from "./chat-feedback.contract";
import type { MessengerAccessCopy } from "./messenger-access";
/** 캐릭터가 먼저 보내는 메시지의 빈도입니다(ADR-0126). */
export type ChatProactivePref = "off" | "daily1" | "daily2";
/** 교정 방식입니다 — 카드만 · 답 안에서 자연스럽게 · 먼저 짚고. 카드는 셋 모두 옵니다. */
export type ChatFeedbackMode = "separate" | "natural" | "prefix";

/** 계정 하나의 대화 설정입니다(모든 방에 적용). */
export type ChatPreferences = {
  readonly replyIdeas: boolean;
  readonly proactive: ChatProactivePref;
  /** 현지 0~23시, null이면 아무 때나. */
  readonly proactiveHour: number | null;
  readonly feedbackMode: ChatFeedbackMode;
};

/** 기억의 층입니다 — 모든 캐릭터가 함께 쓰는 것 · 한 캐릭터만 쓰는 것. */
export type ChatMemoryScope =
  | { readonly kind: "shared" }
  | { readonly kind: "character"; readonly characterId: string };

export type ChatMemory = {
  readonly id: string;
  readonly content: string;
  /** 사용자가 고친 기억은 상한을 넘겨도 지워지지 않습니다. */
  readonly edited: boolean;
  readonly createdAt: number;
};

/** `full` = 그 층이 상한에 닿아 새 기억을 넣지 못함. */
export type ChatMemoryList = {
  readonly memories: readonly ChatMemory[];
  readonly count: number;
  readonly cap: number;
  readonly full: boolean;
};

import type { MessengerListNoticeCopy } from "./messenger-list-notice";

/** 메신저 문구 표에 덧붙는 칸입니다 — 대화 설정(ADR-0126) · 선톡 푸시 안내(ADR-0127). */
export type MessengerChatExtraCopy = {
  readonly chatSettings: ChatSettingsCopy;
  readonly pushNotice: MessengerListNoticeCopy;
  readonly access: MessengerAccessCopy;
  /** 교정 카드 · 다시 보내기 · 답 평가(ADR-0129). */
  readonly feedback: FeedbackCopy;
};

export type ChatSettingsCopy = {
  readonly entryTitle: string;
  readonly entryDescription: string;
  readonly title: string;
  readonly back: string;
  readonly sectionWhile: string;
  readonly replyIdeas: string;
  readonly replyIdeasBody: string;
  readonly sectionProactive: string;
  readonly proactive: string;
  readonly sectionAbout: string;
  readonly sharedMemories: string;
  readonly sharedMemoriesSummary: (count: number) => string;
  readonly footnote: string;
  readonly proactiveSheet: {
    readonly title: string;
    readonly body: string;
    readonly howOften: string;
    readonly prefs: Readonly<Record<"off" | "daily1" | "daily2", string>>;
    readonly preferredTime: string;
    readonly anyTime: string;
    readonly hour: (hour: number) => string;
    readonly quietNote: string;
    readonly save: string;
    readonly close: string;
  };
  readonly memories: {
    readonly titleShared: string;
    readonly titleCharacter: (name: string) => string;
    readonly count: (count: number, cap: number) => string;
    readonly fullTitle: string;
    readonly fullBody: (name: string | null) => string;
    readonly intro: (name: string | null) => string;
    readonly empty: (name: string | null) => string;
    readonly edited: string;
    readonly edit: string;
    readonly delete: string;
    readonly editTitle: string;
    readonly editHint: (name: string | null) => string;
    readonly length: (count: number, max: number) => string;
    readonly cancel: string;
    readonly save: string;
    readonly deleteTitle: string;
    readonly deleteBody: (name: string | null) => string;
    readonly deleteConfirm: string;
    readonly sidebar: (name: string) => string;
    readonly sidebarSummary: (count: number, cap: number, full: boolean) => string;
  };
  readonly feedback: {
    readonly sidebar: string;
    readonly title: string;
    readonly body: (name: string) => string;
    readonly modes: Readonly<
      Record<
        "separate" | "natural" | "prefix",
        { readonly title: string; readonly body: (name: string) => string }
      >
    >;
    readonly defaultTag: string;
    readonly note: string;
    readonly save: string;
    readonly close: string;
  };
};

// --- test-id ---

const settings = (suffix: string): string => `chat-settings-${suffix}`;

export const chatSettingsTestIds = {
  /** 설정 탭 학습 묶음의 「Chats」 줄(ui-lynx SettingsGroup의 항목 test-id). */
  entry: "ui-lynx-settings-group-item-chats",
  screen: settings("screen"),
  back: settings("back"),
  replyIdeas: settings("reply-ideas"),
  proactive: settings("proactive"),
  sharedMemories: settings("shared-memories"),
  birthYear: settings("birth-year"),
  proactiveSheet: settings("proactive-sheet"),
  proactivePref: (pref: string): string => settings(`proactive-${pref}`),
  proactiveHour: (hour: number | null): string =>
    settings(`proactive-hour-${hour === null ? "any" : String(hour)}`),
  memoriesScreen: settings("memories"),
  memoriesBack: settings("memories-back"),
  memoriesFull: settings("memories-full"),
  memoriesEmpty: settings("memories-empty"),
  memory: (id: string): string => settings(`memory-${id}`),
  memoryEdit: (id: string): string => settings(`memory-${id}-edit`),
  memoryDelete: (id: string): string => settings(`memory-${id}-delete`),
  memoryEditSheet: settings("memory-edit"),
  memoryDeleteDialog: settings("memory-delete"),
  feedbackSheet: settings("feedback-sheet"),
  feedbackMode: (mode: string): string => settings(`feedback-${mode}`),
  sidebarMemories: "messenger-chat-sidebar-memories",
  sidebarFeedback: "messenger-chat-sidebar-feedback",
} as const;
