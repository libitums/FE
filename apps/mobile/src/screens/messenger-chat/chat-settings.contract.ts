// 대화 설정(ADR-0126)의 문구 · test-id 계약입니다 — 설정 탭 Chats 화면 · 먼저 보내는 메시지 · 기억 · 교정 방식.

import type { ChatAlbumCopy, ChatSnapshotSelf } from "./chat-album.contract";
import type { ChatMediaCopy } from "./chat-media.contract";
import type { FeedbackCopy } from "./chat-feedback.contract";
import type { MessengerAccessCopy } from "./messenger-access";
import type { SuggestedFriendsCopy } from "./suggested-friends.contract";
import type { FriendStoriesCopy } from "./friend-stories.contract";
import type { MyStoriesCopy } from "./my-stories-copy.contract";
import type { NewMessagePillCopy } from "./new-message-pill.contract";
import type { ReplyToastCopy } from "./reply-toast-copy.contract";
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
  /** 사진 속 내 모습(ADR-0150). null = 아직 고른 적 없음(서버 기본 female) — 첫 Snapshot에서 한 번 묻습니다. */
  readonly snapshotSelf: ChatSnapshotSelf | null;
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
import type { ChatPushAskCopy } from "./chat-push-ask.contract";

/** 메신저 문구 표에 덧붙는 칸입니다 — 대화 설정(ADR-0126) · 선톡 푸시 안내(ADR-0127). */
export type MessengerChatExtraCopy = {
  /** 서버 사진 · 음성(ADR-0146 「앱 연결」). */
  readonly media: ChatMediaCopy;
  /** 앨범 · 내 모습 · 다시 만들기(ADR-0150). */
  readonly album: ChatAlbumCopy;
  /** 추천 친구 줄 · 프로필 시트 · 친구 찾기(ADR-0162). */
  readonly suggested: SuggestedFriendsCopy;
  /** 친구 스토리 줄 · 보기 · 대화 인용(ADR-0178). */
  readonly stories: FriendStoriesCopy;
  /** 내 스토리(ADR-0194). */
  readonly myStories: MyStoriesCopy;
  readonly chatSettings: ChatSettingsCopy;
  readonly pushNotice: MessengerListNoticeCopy;
  /** 첫 답장 뒤 알림 권한 카드(ADR-0197). */
  readonly pushAsk: ChatPushAskCopy;
  readonly access: MessengerAccessCopy;
  /** 위로 올려 읽는 중 「새 메시지 ↓」 알약 · 맨 아래로 단추. */
  readonly newMessages: NewMessagePillCopy;
  /** 채팅 목록 · 그 방 밖에서 답이 오면 위에 잠깐 서는 카드(ADR-0200). */
  readonly replyToast: ReplyToastCopy;
  /** 교정 카드 · 다시 보내기 · 답 평가(ADR-0129). */
  readonly feedback: FeedbackCopy;
  /** 덕수쌤 첫 입장 안내 — 목록 카드 · 방 코치마크(2026-11-13). */
  readonly guide: MessengerGuideCopy;
  /** 엽전 출시 · 채팅 새 기능 모달(ADR-0140). */
  readonly launch: LaunchCopy;
  /** 서버 보내기 실패 줄(ADR-0137). */
  readonly remote: {
    readonly noCredits: (name: string) => string;
    readonly notAvailable: (name: string) => string;
    readonly sendFailed: string;
    // 배달 실패(ADR-0138) — 회색 줄 · Not sent · 끊긴 답 채우기 · 기록 실패.
    readonly replyFailed: (name: string) => string;
    readonly cantReply: (name: string) => string;
    readonly rateLimited: string;
    readonly updateRequired: string;
    readonly serverError: string;
    readonly signedOut: string;
    readonly notSent: string;
    readonly sendAgain: string;
    readonly unsentTitle: string;
    readonly unsentDescription: string;
    readonly deleteUnsent: string;
    readonly cancel: string;
    readonly recovering: string;
    readonly stalled: string;
    readonly refresh: string;
    readonly loadFailedTitle: string;
    readonly loadFailedBody: string;
    readonly loadFailedNew: string;
    readonly tryAgain: string;
  };
};

export type LaunchCopy = {
  readonly newTag: string;
  readonly coinsTitle: string;
  readonly coinsBody: string;
  readonly fromEpisodes: string;
  readonly launchBonus: string;
  readonly balance: string;
  readonly perLesson: string;
  readonly gotIt: string;
  readonly chatTitle: string;
  readonly chatBody: string;
  readonly met: string;
  readonly now: string;
  readonly episode: (order: number) => string;
  readonly metCount: (met: number, total: number) => string;
  readonly prices: string;
  readonly later: string;
  readonly start: string;
};

export type MessengerGuideCopy = {
  readonly cardTitle: (name: string) => string;
  readonly cardBody: string;
  readonly cardButton: (name: string) => string;
  readonly steps: {
    readonly ideas: string;
    readonly media: string;
    /** 예시 스냅샷 단계(ADR-0146 추가) — 사진 단추를 누르면 첫 한 장은 무료. */
    readonly sample: string;
    /** 예시 음성 단계 — 음성 단추를 누르면 첫 인사를 읽은 음성을 무료로 한 번. */
    readonly voice: string;
  };
  /** 키보드 두 갈래 단계(ADR-0190) — 휴대폰 키보드 화면 · Hangul keys 화면마다 큰 줄(title)과 작은 줄(body). */
  readonly keyboard: {
    readonly phone: { readonly title: string; readonly body: string };
    readonly hangul: { readonly title: string; readonly body: string };
  };
  readonly next: string;
  readonly done: string;
  readonly skip: string;
  readonly stepOf: (step: number, total: number) => string;
  /** 안내를 이미 본 사람에게 예시 단계만 보일 때의 꼬리표(「1 of 1」 대신). */
  readonly newTag: string;
  /** 예시 단계 동안 사진 알약의 가격 자리에 서는 글. */
  readonly free: string;
  /** 첫 인사를 기다리는 동안 잠긴 입력 칸의 글 · 낭독(ADR-0139 개정 2026-11-27). */
  readonly greeting: (name: string) => string;
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
