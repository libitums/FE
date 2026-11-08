// AI 컴패니언 Edge Function(`chat-send`)의 서버 쪽 어휘입니다. 요청 · SSE 이벤트 · 에러 코드의 모양은 계약 패키지 사본
// (`./companion-contract/`)이 지고, 여기는 환경 · 의존성 · LLM 계층의 타입만 둡니다. 로직은 런타임 중립 TypeScript라
// Deno(배포)와 Node(vitest)에서 같은 코드가 돕니다. `Deno`는 진입 파일 `chat-send/index.ts`만 씁니다.
//
// 결정: docs/specs/ai-companion-api.md §2.1 · §4, ADR-0113 · 0114.

import type { Outbound } from "./delete-account.contract.ts";
import type { NoticeKind, SegmentKind, SpeechLevel } from "./companion-contract/index.ts";

// ------------------------------------------------------------------ 환경

export type ChatSendEnvName =
  | "SUPABASE_URL"
  | "SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "ANTHROPIC_API_KEY"
  | "COMPANION_LLM"
  | "COMPANION_MODEL"
  | "COMPANION_MODERATION_MODEL";

export type ChatSendEnv = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  /**
   * `anthropic`은 실제 호출, `fake`는 키 없이 정해진 답을 내는 로컬 · 플레이그라운드용 계층입니다. `fake`는
   * `COMPANION_LLM=fake`를 명시해야만 켜지고, 키가 없다고 저절로 켜지지 않습니다.
   */
  readonly llm:
    | {
        readonly kind: "anthropic";
        readonly apiKey: string;
        readonly model: string;
        readonly moderationModel: string;
      }
    | { readonly kind: "fake" };
};

export type ChatSendEnvFrom = (
  read: (name: ChatSendEnvName) => string | undefined,
) => ChatSendEnv | null;

// ------------------------------------------------------------------ LLM 계층

/** 프롬프트에 넣는 지난 턴 하나입니다. 캐릭터 답은 조각을 태그 줄로 다시 씁니다. */
export type HistoryEntry =
  | { readonly role: "user"; readonly text: string }
  | { readonly role: "assistant"; readonly segments: readonly Segment[] };

export type Segment = { readonly kind: SegmentKind; readonly text: string };

export type LearningExpression = {
  readonly id: string;
  readonly kind: string;
  readonly surface: string;
  readonly roman: string | null;
  readonly gloss: string | null;
};

export type PersonaCard = {
  readonly name: string;
  readonly age?: string;
  readonly job?: string;
  readonly role?: string;
  readonly register?: string;
  readonly speech?: string;
  readonly samples?: readonly string[];
  readonly doNot?: readonly string[];
  readonly memorySeed?: readonly string[];
  readonly maxSpeechLevel?: SpeechLevel;
  /** 화제 뱅크 씨앗(PRD §3.8 · O6 초안). */
  readonly topics?: readonly string[];
};

export type ReplyRequest = {
  readonly system: string;
  readonly history: readonly HistoryEntry[];
  readonly userText: string;
  readonly signal: AbortSignal;
};

export type ModerationLayer = "input" | "output_sync" | "output_async";
export type ModerationAction = "allow" | "block" | "crisis";
export type ModerationVerdict = { readonly category: string; readonly action: ModerationAction };

export type ModerationRequest = {
  readonly layer: ModerationLayer;
  readonly text: string;
  /** 출력 검사 때 앞선 유저 메시지 — 맥락 없이 답만 보면 위기 대응 답을 차단할 수 있습니다. */
  readonly context: string | null;
  readonly ageBand: AgeBand;
  readonly signal: AbortSignal;
};

export type FeedbackMode = "separate" | "natural" | "prefix";

/** SSE `correction`의 본문에서 `userMessageId`를 뺀 것(M2). */
export type Feedback = {
  readonly status: "ok" | "none" | "unavailable";
  readonly kind?: "correction" | "better" | "l1_to_ko";
  readonly items?: { original: string; corrected: string; reason: string }[];
  readonly better?: { text: string; meaning: string; explanation: string };
  readonly l1ToKo?: { text: string; meaning: string };
};

export type FeedbackRequest = {
  readonly text: string;
  /** 설명 · 뜻을 쓸 언어. 없으면 영어(PRD §3.5). */
  readonly l1: string | null;
  /** 바로 앞 캐릭터 말 — 대답으로서 자연스러운지 보려고. */
  readonly previous: string | null;
  readonly signal: AbortSignal;
};

export type MemoryItem = {
  readonly kind: "fact" | "event";
  readonly content: string;
  readonly shared: boolean;
};

export type MemoryRequest = {
  readonly userText: string;
  readonly reply: string;
  readonly existing: readonly string[];
  /** 미성년자 · 나이 모름이면 건강 · 심리 정보를 뺀다(뉴욕 Art.48). */
  readonly minor: boolean;
  readonly signal: AbortSignal;
};

export type SummaryRequest = {
  readonly previous: string | null;
  readonly messages: readonly HistoryEntry[];
  readonly signal: AbortSignal;
};

/** 벤더 추상화 계층(PRD §5 M1). 메인 답변은 글자 조각의 흐름, 나머지는 구조화된 결과 하나입니다. */
export type CompanionLlm = {
  readonly model: string;
  reply(request: ReplyRequest): AsyncIterable<string>;
  moderate(request: ModerationRequest): Promise<ModerationVerdict>;
  feedback(request: FeedbackRequest): Promise<Feedback>;
  extractMemories(request: MemoryRequest): Promise<MemoryItem[]>;
  summarize(request: SummaryRequest): Promise<string>;
};

/** 메인 답변 끝의 `@state` 줄(PRD §3.2 · §3.8). 모델이 빠뜨리면 null. */
export type TurnState = {
  readonly intimacyDelta: number;
  readonly topic: string | null;
  readonly userWantsSwitch: boolean;
};

/** 대화의 화제 상태(conversations.topic_state). 서버가 분기를 고르는 데 쓴다. */
export type TopicState = {
  readonly turn: number;
  readonly topic: string | null;
  readonly topicTurns: number;
  readonly shortStreak: number;
  readonly wantsSwitch: boolean;
  readonly lastInsertTurn: number | null;
  readonly lastSwitchTurn: number | null;
};

// ------------------------------------------------------------------ DB 창구(서버용 함수)

export type AgeBand = "adult" | "minor" | "unknown";

export type GateResult =
  | {
      readonly result: "ok";
      readonly ageBand: AgeBand;
      readonly l1: string | null;
      readonly region: string | null;
      readonly tier: "free" | "premium";
      readonly feedbackMode: FeedbackMode;
      readonly memoryEnabled: boolean;
      readonly notices: readonly NoticeKind[];
    }
  | { readonly result: string; readonly detail?: Record<string, unknown> };

export type BeginResult =
  | ({ readonly result: "ok" } & BegunTurn)
  | {
      readonly result: "trial_exhausted" | "insufficient_credits";
      readonly detail?: Record<string, unknown>;
    };

export type BegunTurn = {
  readonly holdId: string;
  readonly creditsReserved: number;
  readonly trial: boolean;
  readonly topicState: Partial<TopicState> | null;
  readonly memories: readonly { kind: string; content: string; shared: boolean }[];
  readonly conversationId: string;
  readonly userMessageId: string;
  readonly speechLevel: SpeechLevel;
  readonly persona: PersonaCard | null;
  readonly summary: string | null;
  readonly history: readonly {
    role: "user" | "assistant";
    text: string | null;
    segments: readonly Segment[];
  }[];
};

export type LearningContext = {
  readonly episodes: readonly string[];
  readonly expressions: readonly LearningExpression[];
};

// ------------------------------------------------------------------ 의존성

export type ChatSendLogEntry = {
  readonly event: "chat_send" | "companion_after_turn" | "companion_proactive";
  readonly status: number | "stream";
  readonly outcome?: string;
  readonly error?: string;
};

export type ChatSendDeps = {
  readonly env: ChatSendEnv | null;
  readonly outbound: Outbound;
  readonly llm: CompanionLlm | null;
  readonly nowMs: () => number;
  readonly randomUuid: () => string;
  /** 응답이 끝나도(앱이 끊어도) 턴을 끝까지 처리하게 런타임에 알립니다. 없으면 그냥 둡니다. */
  readonly waitUntil?: (work: Promise<unknown>) => void;
  readonly log: (entry: ChatSendLogEntry) => void;
  /** 이벤트가 없을 때 `: ping`을 보내는 간격. 테스트가 줄입니다. */
  readonly pingIntervalMs?: number;
  /** LLM 호출 하나의 제한 시간. */
  readonly llmTimeoutMs?: number;
  /** 피드백을 기다리는 시간. 넘으면 `unavailable`(PRD §3.5). */
  readonly feedbackTimeoutMs?: number;
  /** 분기의 랜덤(0 ~ 1). 테스트가 고정합니다. */
  readonly random?: () => number;
};
