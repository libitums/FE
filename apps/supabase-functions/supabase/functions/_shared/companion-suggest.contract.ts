// 추천 답변 칩(`companion-suggest`)의 서버 쪽 어휘입니다. 요청 · 응답 모양은 계약 패키지 사본(`./companion-contract/suggest.ts`)이
// 지고, 여기는 LLM 요청 · DB 맥락 · 의존성 타입만 둡니다. `chat-send.contract.ts`의 `CompanionLlm.suggest`가 이 타입을 씁니다.

import type {
  AgeBand,
  ChatSendEnv,
  CompanionLlm,
  FeedbackHistoryEntry,
  PersonaCard,
  Segment,
} from "./chat-send.contract.ts";
import type { ReplySuggestion, SpeechLevel } from "./companion-contract/index.ts";
import type { Outbound } from "./delete-account.contract.ts";

/** 칩을 만드는 요청. 맥락은 피드백과 같은 모양(최근 6개 · 한 줄 500자 · 번역 없음)입니다. */
export type SuggestRequest = {
  readonly character: { readonly name: string; readonly role: string | null };
  /** 지금 관계의 말투 단계. 모르면 null(해요체로 둡니다). */
  readonly speechLevel: SpeechLevel | null;
  /** 뜻을 쓸 언어(BCP 47). 없으면 영어, 한국어면 뜻을 비웁니다. */
  readonly l1: string | null;
  /** 최근 대화(오래된 것부터). 마지막이 캐릭터 말입니다. */
  readonly history: readonly FeedbackHistoryEntry[];
  readonly signal: AbortSignal;
};

/** 모델이 낸 칩 하나. 검사(`suggestionsFrom`)를 지나야 응답에 실립니다. */
export type SuggestionDraft = {
  readonly text: string;
  readonly meaning: string | null;
  readonly intent: string;
};

/** `companion_suggest_context`의 반환입니다. 판정이 통과하지 못하면 `result`만 옵니다. */
export type SuggestContext =
  | {
      readonly result: "ok";
      readonly ageBand: AgeBand;
      readonly l1: string | null;
      readonly replySuggestions: boolean;
      readonly persona: PersonaCard | null;
      readonly speechLevel: SpeechLevel;
      /** 마지막 캐릭터 메시지(숨김 제외). 저장된 칩이 있으면 `suggestions.items`. */
      readonly latest: {
        readonly id: string;
        readonly status: string;
        readonly origin: string;
        readonly refusal: boolean;
        readonly suggestions: { readonly items?: readonly ReplySuggestion[] } | null;
      } | null;
      /** 마지막 캐릭터 메시지 뒤의 유저 메시지가 차단됐는가(차단된 턴은 캐릭터 답을 남기지 않습니다). */
      readonly latestTurnBlocked: boolean;
      readonly history: readonly {
        role: "user" | "assistant";
        text: string | null;
        segments: readonly Segment[];
      }[];
    }
  | { readonly result: string };

export type SuggestLogEntry = {
  readonly event: "companion_suggest";
  readonly status: number;
  readonly outcome?: string;
};

export type CompanionSuggestDeps = {
  readonly env: ChatSendEnv | null;
  readonly outbound: Outbound;
  readonly llm: CompanionLlm | null;
  readonly nowMs: () => number;
  readonly log: (entry: SuggestLogEntry) => void;
  /** 칩 생성 한 번 · 출력 검사 한 번의 제한 시간. */
  readonly suggestTimeoutMs?: number;
};
