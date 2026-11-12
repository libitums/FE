// AI 컴패니언 Edge Function(`chat-send`)의 서버 쪽 어휘입니다. 요청 · SSE 이벤트 · 에러 코드의 모양은 계약 패키지 사본
// (`./companion-contract/`)이 지고, 여기는 환경 · 의존성 · LLM 계층의 타입만 둡니다. 로직은 런타임 중립 TypeScript라
// Deno(배포)와 Node(vitest)에서 같은 코드가 돕니다. `Deno`는 진입 파일 `chat-send/index.ts`만 씁니다.
//
// 결정: docs/specs/ai-companion-api.md §2.1 · §4, ADR-0132 · 0133.

import type { Outbound } from "./delete-account.contract.ts";
import type { NoticeKind, SegmentKind, SpeechLevel } from "./companion-contract/index.ts";
import type {
  BanmalFeedback,
  Feedback,
  FeedbackMode,
  FeedbackRequest,
} from "./companion-feedback.contract.ts";
import type { TopicState } from "./companion-learning.contract.ts";
import type {
  MemoryOp,
  MemoryRequest,
  SummaryRequest,
  TranslationRequest,
} from "./companion-steps.contract.ts";
import type { SuggestRequest, SuggestionDraft } from "./companion-suggest.contract.ts";

// ------------------------------------------------------------------ 환경

export type ChatSendEnvName =
  | "SUPABASE_URL"
  | "SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "ANTHROPIC_API_KEY"
  | "COMPANION_LLM"
  | "COMPANION_MODEL"
  | "COMPANION_MODERATION_MODEL"
  | "COMPANION_FEEDBACK_MODEL"
  | "COMPANION_TRANSLATION"
  | "COMPANION_TRANSLATION_MODEL"
  | "COMPANION_SUGGEST_MODEL";

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
        /** 검사 · 기억 추출 · 요약. */
        readonly moderationModel: string;
        /** 피드백(교정). 기본은 메인 모델 — 교정 품질이 검사보다 모델 크기를 더 탄다. */
        readonly feedbackModel: string;
        /** 캐릭터 답의 L1 번역. 기본은 검사 모델. */
        readonly translationModel: string;
        readonly suggestModel?: string; // 추천 답변 칩. 없으면 검사 모델.
      }
    | { readonly kind: "fake" };
  /** 캐릭터 답을 학습자 언어로 번역하는가(PRD O9 — 매 메시지 · 탭할 때 중 미정). `every`는 턴마다 SSE `translation`을 보내고 저장, `off`는 번역하지 않는다. */
  readonly translation: "every" | "off";
};

export type ChatSendEnvFrom = (
  read: (name: ChatSendEnvName) => string | undefined,
) => ChatSendEnv | null;

// ------------------------------------------------------------------ LLM 계층

/** 프롬프트에 넣는 지난 턴 하나입니다. 캐릭터 답은 조각을 태그 줄로 다시 씁니다. */
export type HistoryEntry =
  | { readonly role: "user"; readonly text: string; readonly picked?: boolean }
  | { readonly role: "assistant"; readonly segments: readonly Segment[] };

/** 말풍선 하나. `translation`은 저장된 L1 번역 — 프롬프트(history)에는 다시 넣지 않습니다. */
export type Segment = {
  readonly kind: SegmentKind;
  readonly text: string;
  readonly translation?: string;
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
  /** 존댓말 관계에서 학습자가 반말을 쓸 때 피드백 종류. 없으면 `better`(부드럽게). 덕수쌤(선생님)은 `correction`. */
  readonly banmalFeedback?: BanmalFeedback;
  /** 번역 표기 메모(한국어 → 학습자 언어에서 쓸 표기, 예: 「쌤」 → "teacher (casual)"). 운영자가 채운다(20261123). */
  readonly glossary?: Readonly<Record<string, string>>;
};

export type ReplyRequest = {
  readonly system: string;
  readonly history: readonly HistoryEntry[];
  readonly userText: string;
  /**
   * 서버가 고른 이번 턴 지시(화제 전환 · 학습 표현 삽입). 시스템 프롬프트가 아니라 유저 말 뒤의 system 메시지로 실어
   * 앞부분(시스템 · 지난 대화)의 캐시를 깨지 않는다. 없으면 null · 생략.
   */
  readonly directive?: string | null;
  readonly signal: AbortSignal;
};

export type ModerationLayer = "input" | "output_sync" | "output_async";
export type ModerationAction = "allow" | "block" | "crisis";
export type ModerationVerdict = { readonly category: string; readonly action: ModerationAction };

export type ModerationRequest = {
  readonly layer: ModerationLayer;
  readonly text: string;
  /**
   * 맥락 한 줄. 출력 검사는 앞선 유저 메시지(맥락 없이 답만 보면 위기 대응 답을 차단할 수 있다), 입력 검사는 바로 앞 캐릭터 말
   * (「응 할게」처럼 앞 말을 봐야 뜻이 정해지는 글). 판정은 늘 `text`에만 한다.
   */
  readonly context: string | null;
  readonly ageBand: AgeBand;
  readonly signal: AbortSignal;
};

export type {
  BanmalFeedback,
  Feedback,
  FeedbackHistoryEntry,
  FeedbackItem,
  FeedbackMode,
  FeedbackRequest,
} from "./companion-feedback.contract.ts";
export type {
  LearningContext,
  LearningExpression,
  TopicState,
  TurnState,
} from "./companion-learning.contract.ts";
export type {
  ExistingMemory,
  MemoryItem,
  MemoryOp,
  MemoryRequest,
  SummaryRequest,
  TranslationRequest,
} from "./companion-steps.contract.ts";

/** LLM 호출 단계 — 사용량 기록의 이름. */
export type LlmStep =
  | "reply"
  | "moderation_input"
  | "moderation_output"
  | "feedback"
  | "translation"
  | "memory"
  | "summary"
  | "suggestions";

/** 호출 하나의 토큰 사용량(API 응답의 usage). 캐시 쓰기 · 읽기는 입력과 따로 센다. */
export type LlmUsage = {
  readonly step: LlmStep;
  readonly model: string;
  readonly inputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly outputTokens: number;
};

/** 벤더 추상화 계층(PRD §5 M1). 메인 답변은 글자 조각의 흐름, 나머지는 구조화된 결과 하나입니다. */
export type CompanionLlm = {
  readonly model: string;
  reply(request: ReplyRequest): AsyncIterable<string>;
  moderate(request: ModerationRequest): Promise<ModerationVerdict>;
  feedback(request: FeedbackRequest): Promise<Feedback>;
  /** 말풍선마다 번역 한 줄 — 같은 개수 · 같은 순서. */
  translate(request: TranslationRequest): Promise<string[]>;
  /** 묶음에서 기억 작업(더하기 · 고치기 · 잊기)을 고릅니다. */
  extractMemories(request: MemoryRequest): Promise<MemoryOp[]>;
  summarize(request: SummaryRequest): Promise<string>;
  suggest(request: SuggestRequest): Promise<SuggestionDraft[]>;
  /** 호출마다 사용량을 `record`로 넘기는 같은 계층 — 턴마다 감싸 모은다. 없으면(테스트 대역) 모으지 않는다. */
  withUsage?(record: (usage: LlmUsage) => void): CompanionLlm;
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
      readonly replySuggestions?: boolean; // 추천 답변 칩 스위치(20261119) — 참이면 답마다 칩. 옛 DB는 칸이 없다(만들지 않는다).
      readonly notices: readonly NoticeKind[];
    }
  | { readonly result: string; readonly detail?: Record<string, unknown> };

export type BeginResult =
  | ({ readonly result: "ok" } & BegunTurn)
  | {
      // 고쳐서 다시 보내기(`companion_begin_replacement`)는 앞의 셋도 낸다.
      readonly result:
        | "trial_exhausted"
        | "insufficient_credits"
        | "not_latest_message"
        | "turn_in_progress"
        | "duplicate_message";
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

// ------------------------------------------------------------------ 의존성

export type ChatSendLogEntry = {
  readonly event:
    | "chat_send"
    | "companion_after_turn"
    | "companion_proactive"
    | "companion_memory_flush"
    | "companion_eval";
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
  /** 번역을 기다리는 시간. 넘으면 번역 없이 턴을 끝냅니다. */
  readonly translationTimeoutMs?: number;
  readonly suggestionTimeoutMs?: number; // 추천 답변 칩을 기다리는 시간(다시 묻기 · 출력 검사 포함). 넘으면 `unavailable`.
  /** 거절 답을 기다리는 시간. 넘으면 페르소나의 정해진 거절 줄로 끝냅니다. */
  readonly refusalTimeoutMs?: number;
  /** 분기의 랜덤(0 ~ 1). 테스트가 고정합니다. */
  readonly random?: () => number;
};
