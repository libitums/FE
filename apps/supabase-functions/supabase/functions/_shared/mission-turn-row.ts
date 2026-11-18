// 미션 턴의 시작(`companion_mission_begin_turn`)이 돌려주는 값 — 핸들러와 턴 본체가 함께 읽습니다.

import type {
  AgeBand,
  ChatSendDeps,
  ChatSendEnv,
  CompanionLlm,
  FeedbackMode,
  LearningContext,
  PersonaCard,
  Segment,
} from "./chat-send.contract.ts";
import type { Sink } from "./chat-send-http.ts";
import type { MissionTurnRequest, NoticeKind } from "./companion-contract/index.ts";
import type { UsageCollector } from "./companion-usage.ts";
import type { MissionDefinition } from "./mission-definition.ts";
import type { MissionProgress } from "./mission-state.ts";
import type { DbMissionState } from "./mission-http.ts";

/** `companion_mission_begin_turn`의 반환(정상). */
export type MissionBeginRow = {
  readonly result: "ok";
  readonly conversationId: string;
  readonly userMessageId: string;
  readonly mission: { readonly id: string; readonly version: number; readonly definition: unknown };
  readonly state: DbMissionState;
  readonly persona: PersonaCard | null;
  readonly profile: {
    readonly ageBand: AgeBand;
    readonly l1: string | null;
    readonly region: string | null;
    readonly feedbackMode: FeedbackMode;
  };
  readonly learning: LearningContext;
  readonly notices: readonly NoticeKind[];
  readonly history: readonly {
    role: "user" | "assistant";
    text: string | null;
    segments: readonly Segment[];
  }[];
};

/** 미션 턴 하나(`runMissionTurn`)가 받는 것. */
export type MissionTurnContext = {
  readonly deps: ChatSendDeps;
  readonly env: ChatSendEnv;
  readonly llm: CompanionLlm;
  readonly sink: Sink;
  readonly body: MissionTurnRequest;
  readonly userId: string;
  readonly row: MissionBeginRow;
  readonly mission: MissionDefinition;
  /** 이번 턴 앞의 판 상태(DB 값을 코어 모양으로). */
  readonly progress: MissionProgress;
  readonly assistantMessageId: string;
  readonly playground: boolean;
  readonly usage: UsageCollector;
};
