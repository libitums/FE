// 대화 출처 포트의 계약입니다(messenger-chat-ui spec §5.1). 1단계는 가짜 구현이 이 모양을 채우고,
// 2단계는 서버판 구현 하나로 바꿉니다(화면 · 리듀서는 이 타입에만 기댑니다).

export type ChatText = { readonly ko: string; readonly en: string };
export type ChatReplyIdea = {
  readonly ko: string;
  readonly roman: string;
  readonly en: string;
};
export type ChatMediaKind = "photo" | "voice";
export type ChatCounterpart = {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl: string | null;
};

type ChatMessageBase = { readonly id: string; readonly at: number };

export type ChatMessage =
  | (ChatMessageBase & {
      readonly kind: "text";
      readonly from: "me" | "them";
      readonly text: ChatText;
    })
  | (ChatMessageBase & { readonly kind: "photo-pending" })
  | (ChatMessageBase & { readonly kind: "photo"; readonly imageUrl: string | null })
  | (ChatMessageBase & { readonly kind: "voice-pending" })
  | (ChatMessageBase & {
      readonly kind: "voice";
      readonly durationMs: number;
      readonly text: ChatText;
    });

export type ChatRoomAccess =
  | { readonly kind: "open" }
  | { readonly kind: "locked"; readonly unlockEpisode: number };
export type ChatRoomActivity = "idle" | "typing" | "sending-photo" | "recording-voice";

export type ChatRoomSummary = {
  readonly roomId: string;
  readonly counterpart: ChatCounterpart;
  readonly access: ChatRoomAccess;
  readonly lastMessage: ChatMessage | null;
  readonly unread: number;
  readonly activity: ChatRoomActivity;
  readonly updatedAt: number;
};

export type ChatRelation = "just-met" | "getting-to-know" | "friends";
export type ChatStoryPoint = {
  readonly id: string;
  readonly episodeNumber: number;
  readonly title: string;
  readonly relation: ChatRelation;
  readonly unlocked: boolean;
};
export type ChatRoomSettings = { readonly autoIdeas: boolean; readonly storyPointId: string };

export type ChatThread = {
  readonly roomId: string;
  readonly counterpart: ChatCounterpart;
  readonly messages: readonly ChatMessage[];
  readonly typing: boolean;
  readonly ideas: readonly ChatReplyIdea[];
  readonly settings: ChatRoomSettings;
  readonly storyPoints: readonly ChatStoryPoint[];
};

/** 젬 잔액은 출처가 아니라 앱이 줍니다(§9). */
export type ChatSnapshot = { readonly rooms: readonly ChatRoomSummary[] };

export type ChatReportReasonId = "rude" | "sexual" | "hateful" | "wrong-korean" | "other";

export type ChatSource = {
  /** 같은 상태면 같은 참조(구독 훅이 비교합니다). */
  readonly snapshot: () => ChatSnapshot;
  /** 없는(지운) 방 = null. */
  readonly thread: (roomId: string) => ChatThread | null;
  readonly subscribe: (listener: () => void) => () => void;
  /** unread → 0. */
  readonly openRoom: (roomId: string) => void;
  readonly sendText: (roomId: string, text: string) => void;
  /** 잔액은 줄지 않습니다(결제 없음). */
  readonly requestMedia: (roomId: string, media: ChatMediaKind) => void;
  readonly regenerateIdeas: (roomId: string) => void;
  readonly setAutoIdeas: (roomId: string, on: boolean) => void;
  readonly setStoryPoint: (roomId: string, storyPointId: string) => void;
  /** 1단계 무동작. */
  readonly report: (roomId: string, reasons: readonly ChatReportReasonId[]) => void;
  /** 1단계 무동작. */
  readonly requestFix: (roomId: string, text: string) => void;
  readonly deleteRoom: (roomId: string) => void;
  /** 걸린 타이머 전부 해제 · 구독 해제. */
  readonly dispose: () => void;
};

export type ChatTimers = {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

// 픽스처 씨앗: 메시지의 `at` 대신 minutesAgo, 그림은 상대 경로(imageUrlOf가 풉니다).
export type ChatFixtureMessage =
  | {
      readonly kind: "text";
      readonly from: "me" | "them";
      readonly text: ChatText;
      readonly minutesAgo: number;
    }
  | { readonly kind: "photo"; readonly imagePath: string | null; readonly minutesAgo: number }
  | {
      readonly kind: "voice";
      readonly durationMs: number;
      readonly text: ChatText;
      readonly minutesAgo: number;
    };

export type ChatFixtureRoom = {
  readonly roomId: string;
  readonly counterpart: {
    readonly id: string;
    readonly name: string;
    readonly avatarPath: string | null;
  };
  readonly access: ChatRoomAccess;
  readonly unread: number;
  readonly messages: readonly ChatFixtureMessage[];
  readonly storyPoints: readonly ChatStoryPoint[];
  readonly settings: ChatRoomSettings;
  readonly ideaSets: readonly (readonly ChatReplyIdea[])[];
  readonly cannedReplies: readonly ChatText[];
  readonly photoPath: string | null;
  readonly voiceLine: { readonly durationMs: number; readonly text: ChatText };
};

export type ChatFixtureSeed = { readonly rooms: readonly ChatFixtureRoom[] };

export type FixtureChatSourceOptions = {
  readonly imageUrlOf: (relativePath: string) => string | null;
  readonly seed?: ChatFixtureSeed;
  readonly now?: () => number;
  readonly timers?: ChatTimers;
};
