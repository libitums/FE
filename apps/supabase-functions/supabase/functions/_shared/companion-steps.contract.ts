// 번역 · 기억 · 요약 · 답장 채점(평가 전용) 단계의 LLM 요청 · 결과 타입. `chat-send.contract.ts`가 다시 내보냅니다(`CompanionLlm`이 씁니다).

import type { FeedbackHistoryEntry } from "./companion-feedback.contract.ts";
import type { HistoryEntry, PersonaCard, RomanceLine, Segment } from "./chat-send.contract.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";

export type TranslationRequest = {
  /** 캐릭터 답의 말풍선들. 대사뿐 아니라 행동 · 서술도 번역합니다. */
  readonly segments: readonly Segment[];
  /** 번역할 언어(BCP 47). */
  readonly l1: string;
  /** 바로 앞 대화 몇 줄(오래된 것부터) — 대명사 · 말투를 맞추는 참고용이고 번역하지 않습니다. */
  readonly context?: readonly FeedbackHistoryEntry[];
  /** 이름 · 호칭 표기 — 캐릭터 이름과 페르소나의 `glossary`(한국어 → 그 언어에서 쓸 표기 메모). */
  readonly glossary?: {
    readonly characterName: string;
    readonly terms?: Readonly<Record<string, string>>;
  };
  readonly signal: AbortSignal;
};

export type MemoryItem = {
  readonly kind: "fact" | "event";
  readonly content: string;
  readonly shared: boolean;
};

/** 추출 모델에 보이는 기존 기억. `ref`는 짧은 번호(m1, m2 …) — 서버가 기억 id로 바꿉니다. */
export type ExistingMemory = {
  readonly ref: string;
  readonly content: string;
  readonly shared: boolean;
  /** 유저가 고친 기억 — 고치거나 잊지 않습니다. */
  readonly locked: boolean;
};

/** 기억 작업 하나 — 새 사실 더하기 · 기존 기억 고치기 · 더는 맞지 않는 기억 잊기. */
export type MemoryOp =
  | ({ readonly op: "add"; readonly reason: string } & MemoryItem)
  | {
      readonly op: "update";
      readonly ref: string;
      readonly content: string;
      readonly reason: string;
    }
  | { readonly op: "forget"; readonly ref: string; readonly reason: string };

export type MemoryRequest = {
  /** 아직 기억을 뽑지 않은 메시지들(유저 · 캐릭터, 오래된 것부터) — 턴마다가 아니라 몇 턴씩 묶어서 뽑는다. */
  readonly messages: readonly HistoryEntry[];
  readonly existing: readonly ExistingMemory[];
  /** 미성년자 · 나이 모름이면 건강 · 심리 정보를 뺀다(뉴욕 Art.48). */
  readonly minor: boolean;
  readonly signal: AbortSignal;
};

export type SummaryRequest = {
  readonly previous: string | null;
  readonly messages: readonly HistoryEntry[];
  readonly signal: AbortSignal;
};

/** 답장 채점 축(`companion-eval` reply). 학습 표현은 이번 턴 지시가, 본편 일치(canon)는 이야기 카드가 있을 때만 본다. */
export const replyJudgeAxes = [
  "persona",
  "speech",
  "spoiler",
  "level",
  "natural",
  "safety",
  "learning",
  "canon",
] as const;
export type ReplyJudgeAxis = (typeof replyJudgeAxes)[number];

export type ReplyJudgeRequest = {
  readonly persona: PersonaCard;
  readonly speechLevel: SpeechLevel;
  readonly ageBand: "adult" | "minor" | "unknown";
  /** 답장 프롬프트에 실은 적용 로맨스 선(ADR-0168) — safety 축이 이 선으로 본다. 없으면 연령대의 기본(`defaultRomanceLine`). */
  readonly romanceLine?: RomanceLine;
  /** 학습자가 아는 이야기 범위 · 아직 모르는 것(채점자에게만 보인다 — 답장 프롬프트에는 없다). */
  readonly spoilerNote: string | null;
  /** 학습자가 앱에서 배운 표현(답장 프롬프트에 실은 것과 같다). */
  readonly expressions: readonly string[];
  /** 답장 프롬프트에 실은 「지금까지 이야기」 카드. 없으면 canon 축은 null. */
  readonly story: string | null;
  /** 이번 턴의 학습 표현 지시. 없으면 learning 축은 null. */
  readonly target: { readonly surface: string; readonly mode: "expose" | "elicit" } | null;
  readonly history: readonly FeedbackHistoryEntry[];
  readonly userText: string;
  readonly reply: readonly Segment[];
  readonly signal: AbortSignal;
};

export type ReplyJudgement = {
  readonly axes: Readonly<
    Record<ReplyJudgeAxis, { readonly pass: boolean; readonly reason: string } | null>
  >;
  /** 한 줄 총평. */
  readonly summary: string;
};
