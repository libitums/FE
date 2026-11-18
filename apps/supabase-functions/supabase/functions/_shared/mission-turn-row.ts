// 미션 턴의 시작(`companion_mission_begin_turn`)이 돌려주는 값 — 핸들러와 턴 본체가 함께 읽습니다.

import type {
  AgeBand,
  FeedbackMode,
  LearningContext,
  PersonaCard,
  Segment,
} from "./chat-send.contract.ts";
import type { NoticeKind } from "./companion-contract/index.ts";
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
