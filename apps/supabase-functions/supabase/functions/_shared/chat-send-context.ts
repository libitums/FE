// 턴 하나의 스트림(`runTurn`)이 받는 것. 핸들러가 판정 · 예약 · 유저 메시지 저장을 끝낸 뒤 채웁니다.

import type {
  BegunTurn,
  ChatSendDeps,
  ChatSendEnv,
  CompanionLlm,
  GateResult,
  LearningContext,
} from "./chat-send.contract.ts";
import type { TurnStatus } from "./chat-send-finish.ts";
import type { Sink } from "./chat-send-http.ts";
import type { ChatSendRequest } from "./companion-contract/index.ts";
import type { UsageCollector } from "./companion-usage.ts";

export type TurnContext = {
  deps: ChatSendDeps;
  env: ChatSendEnv;
  llm: CompanionLlm;
  sink: Sink;
  body: ChatSendRequest;
  userId: string;
  gate: Extract<GateResult, { result: "ok" }>;
  turn: BegunTurn;
  learning: LearningContext;
  /** 턴 시작 때 반복 위반 수 · 기억 가득 참. 읽지 못했으면 null — 입력 차단은 지금처럼 `guardrail_blocked`, `memoryFull`은 싣지 않는다. */
  status: TurnStatus | null;
  assistantMessageId: string;
  playground: boolean;
  /** 요약 뒤에도 남기는 최근 메시지 수(`companion_summary_source`의 p_keep). */
  historyKeep: number;
  /** 이 턴의 LLM 사용량 — `llm`이 기록하는 곳. 저장 meta의 `usage`가 된다. */
  usage: UsageCollector;
};
