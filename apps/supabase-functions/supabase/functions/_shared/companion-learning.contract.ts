// 학습 표현 · 화제 상태 · 답의 `@state` 줄의 서버 쪽 타입. `chat-send.contract.ts`가 다시 내보냅니다(PRD §3.7 · §3.8).

import type { LearningSettings } from "./companion-learning.ts";

/** 배운 표현 하나(`companion_learning_context`). 유저 기록 칸(20261125)은 옛 DB면 없다. */
export type LearningExpression = {
  readonly id: string;
  readonly kind: string;
  readonly surface: string;
  readonly roman: string | null;
  readonly gloss: string | null;
  /** 이 표현을 낸 끝낸 에피소드(가장 최근 것). */
  readonly episode?: string;
  /** 캐릭터가 실제로 쓴 횟수(노출 · 첫 인사 · 선톡). */
  readonly exposed?: number;
  /** 유도 질문을 던진 횟수. */
  readonly elicited?: number;
  /** 칩에 실린 횟수. */
  readonly chipShown?: number;
  /** 유저가 직접 입력해 쓴 횟수(칩 전송은 세지 않는다). */
  readonly produced?: number;
  /** 마지막으로 만난 시각(노출 · 유도 · 칩 가운데 가장 늦은 것). */
  readonly lastSeenAt?: string | null;
};

export type LearningContext = {
  readonly episodes: readonly string[];
  readonly expressions: readonly LearningExpression[];
  /** 넣기 설정(20261125). 옛 DB면 없다 — 기본값을 쓴다. */
  readonly settings?: Partial<LearningSettings>;
  /** 유저가 정한 범위(20261126). `manual`이면 고른 에피소드의 끝낸 유닛만 풀에 들어 있고, 고른 것이 없으면 `empty`. 옛 DB면 없다. */
  readonly scope?: {
    readonly mode: "auto" | "manual";
    readonly units: readonly string[];
    readonly empty: boolean;
  };
};

/** 메인 답변 끝의 `@state` 줄(PRD §3.2 · §3.7 · §3.8). 모델이 빠뜨리면 null. 학습 칸은 참일 때만 싣는다. */
export type TurnState = {
  readonly intimacyDelta: number;
  readonly topic: string | null;
  readonly userWantsSwitch: boolean;
  /** 이번 턴 지시의 학습 표현을 썼다(노출) · 그 표현으로 답할 질문을 했다(유도). */
  readonly learned?: true;
  /** 학습자가 슬프거나 속상해 위로가 필요해 보인다 — 다음 턴에 학습 표현을 넣지 않는다. */
  readonly heavy?: true;
};

/** 대화의 화제 상태(conversations.topic_state). 서버가 분기를 고르는 데 쓴다. 학습 칸(20261125)은 옛 상태에 없다. */
export type TopicState = {
  readonly turn: number;
  readonly topic: string | null;
  readonly topicTurns: number;
  readonly shortStreak: number;
  readonly wantsSwitch: boolean;
  /** 마지막으로 학습 표현을 지시한 턴. */
  readonly lastInsertTurn: number | null;
  readonly lastSwitchTurn: number | null;
  /** 앞 턴의 `@state.heavy`. */
  readonly heavy?: boolean;
  /** 학습 지시를 센 날(UTC `YYYY-MM-DD`)과 그날의 수 — 대화당 하루 상한. */
  readonly learnDay?: string | null;
  readonly learnToday?: number;
  readonly lastExpressionId?: string | null;
  /** 최근 지시한 표현 id(오래된 것부터, 최대 5) — 피드백이 유저 산출을 판정할 후보. */
  readonly recentTargets?: readonly string[];
};
