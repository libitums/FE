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
  | (ChatMessageBase & { readonly kind: "action"; readonly text: ChatText })
  | (ChatMessageBase & { readonly kind: "photo-pending" })
  | (ChatMessageBase & { readonly kind: "photo"; readonly imageUrl: string | null })
  | (ChatMessageBase & { readonly kind: "voice-pending" })
  | (ChatMessageBase & {
      readonly kind: "voice";
      readonly durationMs: number;
      readonly text: ChatText;
    })
  | (ChatMessageBase & { readonly kind: "notice"; readonly notice: ChatNoticeKind })
  | (ChatMessageBase & {
      readonly kind: "crisis";
      readonly resources: readonly ChatCrisisResource[];
    });

/** 로그 가운데 회색 줄로 서는 고지입니다(ADR-0125). 문구는 앱이 가집니다. */
export type ChatNoticeKind =
  | "ai-disclosure"
  | "minor-notice"
  | "break-reminder"
  | ChatSendFailureNotice;

/** 위기 안내 카드의 기관 하나입니다. 지역에 맞춘 목록은 서버가 줍니다 — 없는 칸은 null. */
export type ChatCrisisResource = {
  readonly name: string;
  readonly phone: string | null;
  readonly url: string | null;
  readonly hours: string | null;
};

/** 입력 줄 자리를 대신하는 막힘입니다. 시각은 ms(epoch). */
export type ChatInputBlock =
  | { readonly kind: "temporarily-blocked"; readonly until: number }
  | { readonly kind: "usage-time-limit"; readonly resetsAt: number }
  | { readonly kind: "age-restricted" };

/** 첫 대화 전에 묻는 생년입니다. 건너뛰면 18세 미만 기본값이 적용됩니다(서버 몫). */
export type ChatBirthYear =
  | { readonly kind: "unasked" }
  | { readonly kind: "skipped" }
  | { readonly kind: "set"; readonly year: number };

// 대화 설정 · 기억 타입(ADR-0126)은 대화 설정 계약에 둡니다 — 이 파일은 그 이름을 그대로 다시 내보냅니다.
import type {
  ChatFeedbackMode,
  ChatMemory,
  ChatMemoryList,
  ChatMemoryScope,
  ChatPreferences,
  ChatProactivePref,
} from "./chat-settings.contract";

export type {
  ChatFeedbackMode,
  ChatMemory,
  ChatMemoryList,
  ChatMemoryScope,
  ChatPreferences,
  ChatProactivePref,
};

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
  readonly server: ChatServerRoom | null; // 서버 모드(ADR-0137 · 0138) — null이면 가짜 출처.
  /** 보낸 글의 답을 기다리는 중(입력 중 점 전 포함) — 다시 보내기 판정(ADR-0129). */
  readonly awaitingReply: boolean;
  readonly ideas: readonly ChatReplyIdea[];
  readonly settings: ChatRoomSettings;
  readonly storyPoints: readonly ChatStoryPoint[];
  /** 내 텍스트 글 id만 키. 없는 키 = NO_NOTES. */
  readonly notes: Readonly<Record<string, ChatMyNotes>>;
  /** 캐릭터 글 id만 키 — 내가 남긴 평가(ADR-0129). */
  readonly ratings: Readonly<Record<string, ChatRating>>;
  /** null이면 보통 입력 줄입니다. */
  readonly inputBlock: ChatInputBlock | null;
};

/** 잔액(보유 엽전)은 출처가 아니라 앱이 줍니다(§9 · ADR-0116). */
export type ChatSnapshot = {
  readonly rooms: readonly ChatRoomSummary[];
  readonly birthYear: ChatBirthYear;
  readonly preferences: ChatPreferences;
};

// 내 글 노트(뜻 · 교정) — messenger-chat-1-5 spec §5.1. 뜻은 en 고정, 범위는 corrected 안 코드 포인트입니다.
export type ChatMeaning = { readonly romanization: string; readonly meaning: string };
import type { ChatCorrection, ChatCorrectionChange, ChatRating } from "./chat-feedback.contract"; // 교정 · 평가(ADR-0129)
import type { ChatRemote, ChatSendFailureNotice } from "./chat-remote.contract";
import type { ChatServerControls, ChatServerRoom } from "./chat-delivery.contract";
export type { ChatCorrection, ChatCorrectionChange, ChatRating };
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
  /** 평가를 남기거나(null이면) 지웁니다. 같은 값이면 무동작(ADR-0129). */
  readonly rateMessage: (roomId: string, messageId: string, rating: ChatRating | null) => void;
  /** 마지막 내 글을 고친 문장으로 다시 보냅니다 — 옛 턴은 로그에서 빠집니다. 규칙을 어기면 무동작(ADR-0129). */
  readonly resendCorrected: (roomId: string, messageId: string) => void;
  readonly deleteRoom: (roomId: string) => void;
  /** 내 글 · 뜻 idle일 때만: loading → timing.meaningMs 뒤 ready. 그 밖 무동작. */
  readonly requestMeaning: (roomId: string, messageId: string) => void;
  /** 교정 available일 때만: seen = true(즉시), detail idle이면 loading → timing.correctionMs 뒤 ready. */
  readonly openCorrection: (roomId: string, messageId: string) => void;
  readonly unlockCharacter: (characterId: string) => ChatUnlockResult;
  /** null = 건너뜀. 바뀌면 구독자에게 알립니다. */
  readonly setBirthYear: (year: number | null) => void;
  /** 바뀐 칸만 넘깁니다. 바뀌면 구독자에게 알립니다. */
  readonly setPreferences: (patch: Partial<ChatPreferences>) => void;
  /** 같은 상태면 같은 참조입니다. */
  readonly memories: (scope: ChatMemoryScope) => ChatMemoryList;
  /** 1~500자(앞뒤 공백 걷음)가 아니면 무동작. 고친 기억은 `edited`가 됩니다. */
  readonly updateMemory: (id: string, content: string) => void;
  readonly deleteMemory: (id: string) => void;

  readonly server: ChatServerControls | null; // 서버 모드의 배달 조작(ADR-0138) — 가짜 출처는 null.
  readonly dispose: () => void; // 걸린 타이머 전부 해제 · 구독 해제.
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
    }
  | { readonly kind: "notice"; readonly notice: ChatNoticeKind; readonly minutesAgo: number }
  | {
      readonly kind: "crisis";
      readonly resources: readonly ChatCrisisResource[];
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
  /** 확인용 씨앗만 씁니다. 시각은 지금부터 몇 분 뒤입니다. */
  readonly inputBlock?:
    | { readonly kind: "temporarily-blocked" | "usage-time-limit"; readonly inMinutes: number }
    | { readonly kind: "age-restricted" };
};

export type ChatFixtureMeaning = { readonly ko: string } & ChatMeaning;
export type ChatFixtureCorrection = { readonly original: string } & ChatCorrection;

export type ChatFixtureSeed = {
  readonly rooms: readonly ChatFixtureRoom[];
  readonly meanings?: readonly ChatFixtureMeaning[];
  readonly corrections?: readonly ChatFixtureCorrection[];
  readonly fallbackMeaning?: ChatMeaning;
  /** 없으면 추천 답변 켬 · 하루 한 번 · 아무 때나 · 카드만. */
  readonly preferences?: ChatPreferences;
  /** 기억 씨앗(글만). 인물은 상대 id로 찾습니다. */
  readonly memories?: {
    readonly shared: readonly string[];
    readonly byCharacter: Readonly<Record<string, readonly string[]>>;
  };
  /** 없으면 unasked입니다. */
  readonly birthYear?: ChatBirthYear;
};

export type FixtureChatSourceOptions = {
  readonly imageUrlOf: (relativePath: string) => string | null;
  readonly seed?: ChatFixtureSeed;
  readonly now?: () => number;
  readonly timers?: ChatTimers;
  /** 처음부터 열린 채 시작할 인물 id(재시작 뒤 모습). */
  readonly unlocked?: readonly string[];
  readonly remote?: ChatRemote; // 서버 모드(ADR-0137) — 방 기록 · 첫 인사 · 보내기를 서버에서.
};
