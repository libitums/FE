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
  /** 방금 해금돼 아직 열어 보지 않은 방(목록 NEW 줄). */
  readonly isNew: boolean;
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
  /** 내 텍스트 글 id만 키. 없는 키 = NO_NOTES. */
  readonly notes: Readonly<Record<string, ChatMyNotes>>;
};

/** 잔액(보유 엽전)은 출처가 아니라 앱이 줍니다(§9 · ADR-0116). */
export type ChatSnapshot = { readonly rooms: readonly ChatRoomSummary[] };

// 내 글 노트(뜻 · 교정) — messenger-chat-1-5 spec §5.1. 뜻은 en 고정, 범위는 corrected 안 코드 포인트입니다.
export type ChatMeaning = { readonly romanization: string; readonly meaning: string };
export type ChatCorrectionChange = { readonly start: number; readonly end: number };
export type ChatCorrection = {
  readonly corrected: string;
  readonly changes: readonly ChatCorrectionChange[];
  readonly explanation: string;
};
export type ChatLoad<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: T };
export type ChatCorrectionNote =
  | { readonly kind: "none" }
  | {
      readonly kind: "available";
      readonly seen: boolean;
      readonly detail: ChatLoad<ChatCorrection>;
    };
export type ChatMyNotes = {
  readonly meaning: ChatLoad<ChatMeaning>;
  readonly correction: ChatCorrectionNote;
};
export type ChatUnlockResult =
  | { readonly kind: "unlocked"; readonly roomId: string }
  | { readonly kind: "already-open"; readonly roomId: string }
  | { readonly kind: "unknown" };

/** 뜻 idle · 교정 none. */
export const NO_NOTES: ChatMyNotes = {
  meaning: { status: "idle" },
  correction: { kind: "none" },
};

/** 없는 키 → NO_NOTES. */
export function notesOf(thread: ChatThread, messageId: string): ChatMyNotes {
  return thread.notes[messageId] ?? NO_NOTES;
}

export type ChatReportReasonId = "rude" | "sexual" | "hateful" | "wrong-korean" | "other";

export type ChatSource = {
  /** 같은 상태면 같은 참조(구독 훅이 비교합니다). */
  readonly snapshot: () => ChatSnapshot;
  /** 없는(지운) 방 = null. */
  readonly thread: (roomId: string) => ChatThread | null;
  readonly subscribe: (listener: () => void) => () => void;
  /** unread → 0. 이 방이 「열린 방」이 되어, 이후 온 답은 안 읽음으로 쌓이지 않습니다. */
  readonly openRoom: (roomId: string) => void;
  /** 방을 나갑니다(리뷰 #1). 이후 온 답은 다시 안 읽음으로 쌓입니다. 열려 있지 않은 방이면 무동작. */
  readonly closeRoom: (roomId: string) => void;
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
  /** 내 글 · 뜻 idle일 때만: loading → timing.meaningMs 뒤 ready. 그 밖 무동작. */
  readonly requestMeaning: (roomId: string, messageId: string) => void;
  /** 교정 available일 때만: seen = true(즉시), detail idle이면 loading → timing.correctionMs 뒤 ready. */
  readonly openCorrection: (roomId: string, messageId: string) => void;
  readonly unlockCharacter: (characterId: string) => ChatUnlockResult;
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
      /** from "me"만 의미 있음. */
      readonly correction?: ChatFixtureCorrection;
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
  /** 해금될 때 로그에 놓이는 첫 말(없으면 빈 방). */
  readonly opening?: ChatText;
};

export type ChatFixtureMeaning = { readonly ko: string } & ChatMeaning;
export type ChatFixtureCorrection = { readonly original: string } & ChatCorrection;

export type ChatFixtureSeed = {
  readonly rooms: readonly ChatFixtureRoom[];
  readonly meanings?: readonly ChatFixtureMeaning[];
  readonly corrections?: readonly ChatFixtureCorrection[];
  readonly fallbackMeaning?: ChatMeaning;
};

export type FixtureChatSourceOptions = {
  readonly imageUrlOf: (relativePath: string) => string | null;
  readonly seed?: ChatFixtureSeed;
  readonly now?: () => number;
  readonly timers?: ChatTimers;
  /** 처음부터 열린 채 시작할 인물 id(재시작 뒤 모습). */
  readonly unlocked?: readonly string[];
};
