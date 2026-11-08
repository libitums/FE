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
  | "COMPANION_MODERATION_MODEL"
  | "COMPANION_DAILY_LIMIT_SECONDS";

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
  /** 하루 이용 시간 상한(초). 없으면 상한을 보지 않습니다(값은 PRD O4 — 팀 논의). */
  readonly dailyLimitSeconds: number | null;
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

/** 벤더 추상화 계층(PRD §5 M1). 메인 답변은 글자 조각의 흐름, 검사는 판정 하나입니다. */
export type CompanionLlm = {
  readonly model: string;
  reply(request: ReplyRequest): AsyncIterable<string>;
  moderate(request: ModerationRequest): Promise<ModerationVerdict>;
};

// ------------------------------------------------------------------ DB 창구(서버용 함수)

export type AgeBand = "adult" | "minor" | "unknown";

export type GateResult =
  | {
      readonly result: "ok";
      readonly ageBand: AgeBand;
      readonly l1: string | null;
      readonly notices: readonly NoticeKind[];
    }
  | { readonly result: string; readonly detail?: Record<string, unknown> };

export type BegunTurn = {
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
  readonly event: "chat_send";
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
};
