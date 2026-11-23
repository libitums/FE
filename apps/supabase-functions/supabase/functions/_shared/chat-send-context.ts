// 턴 하나의 스트림(`runTurn`)이 받는 것. 핸들러가 판정 · 예약 · 유저 메시지 저장을 끝낸 뒤 채웁니다.

import type {
  BegunTurn,
  ChatSendDeps,
  ChatSendEnv,
  CompanionLlm,
  GateResult,
  LearningContext,
  RomanceLine,
} from "./chat-send.contract.ts";
import type { Choice } from "./chat-send-choice.ts";
import type { TurnStatus } from "./chat-send-finish.ts";
import type { Sink } from "./chat-send-http.ts";
import type { TurnStory } from "./chat-send-story.ts";
import type { ChatSendRequest } from "./companion-contract/index.ts";
import { effectiveRomanceTier, romanceLine } from "./companion-safety.ts";
import type { UsageCollector } from "./companion-usage.ts";

export type TurnContext = {
  deps: ChatSendDeps;
  env: ChatSendEnv;
  llm: CompanionLlm;
  sink: Sink;
  body: ChatSendRequest;
  userId: string;
  gate: Extract<GateResult, { result: "ok" }>;
  /** 턴 시작 결과 + 친밀도 숫자(ADR-0180, 마이그레이션 `20270103120000`). 옛 DB면 친밀도가 없다 — 친밀도 구간 줄이 빠진다. */
  turn: BegunTurn & { readonly intimacy?: number };
  learning: LearningContext;
  /** 턴 시작 때 반복 위반 수 · 기억 가득 참. 읽지 못했으면 null — 입력 차단은 지금처럼 `guardrail_blocked`, `memoryFull`은 싣지 않는다. */
  status: TurnStatus | null;
  /** 이번 유저 말의 입력 출처(칩 그대로 · 고침 · 지난 칩 · 직접 입력) — `resolveChoice`. */
  choice: Choice;
  assistantMessageId: string;
  playground: boolean;
  /** 요약 뒤에도 남기는 최근 메시지 수(`companion_summary_source`의 p_keep). */
  historyKeep: number;
  /** 이 턴의 LLM 사용량 — `llm`이 기록하는 곳. 저장 meta의 `usage`가 된다. */
  usage: UsageCollector;
  /** 친구 스토리 답장(ADR-0178) — 요청에 `story_id`가 있었을 때의 판정 결과 · 한 줄. 없으면 null · 생략. */
  story?: TurnStory | null;
};

/** 이 턴의 적용 수위(ADR-0164 — 성인이 아니면 standard)와 로맨스 선(ADR-0168). */
export const turnRomance = (context: Pick<TurnContext, "gate" | "turn">) => ({
  tier: effectiveRomanceTier(context.gate.ageBand, context.gate.romanceTier),
  line: turnRomanceLine(context),
});

/** 이 턴의 적용 로맨스 선(ADR-0168) — 판정의 수위 · 연령대와 턴 시작의 페르소나 · 말투 단계로. */
export const turnRomanceLine = (context: Pick<TurnContext, "gate" | "turn">): RomanceLine =>
  romanceLine(
    context.gate.ageBand,
    context.gate.romanceTier,
    context.turn.persona,
    context.turn.speechLevel,
  );
