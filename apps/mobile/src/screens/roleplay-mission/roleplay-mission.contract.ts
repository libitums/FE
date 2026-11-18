// 롤플레이 미션(ADR-0160) 화면 셋 — 미리보기 · 대화 · 리포트 — 의 타입 전용 계약입니다. 구현 · JSX를 두지 않습니다.
// 서버 모양은 계약 패키지(`@libitums/companion-contract`)의 타입을 그대로 씁니다 — `import type`이라 번들에 들지 않습니다
// (zod 스키마는 앱 번들에 넣지 않습니다, 메신저 `companion-parse.ts`와 같은 이유). 정본은 PRD `docs/specs/ai-companion-mission.md` §4.

import type {
  MissionEndReason,
  MissionFinishResponse,
  MissionGoalState,
  MissionHintResponse,
  MissionList,
  MissionListItem,
  MissionPrice,
  MissionReport,
  MissionStartResponse,
} from "@libitums/companion-contract";

import type { SafeAreaInsets } from "../../lib/safe-area";
import type { ChatCorrection } from "../messenger-chat/chat-feedback.contract";
import type { TurnState } from "../messenger-chat/companion-turn";

export type {
  MissionEndReason,
  MissionFinishResponse,
  MissionGoalState,
  MissionHintResponse,
  MissionList,
  MissionListItem,
  MissionPrice,
  MissionReport,
  MissionStartResponse,
};

// ------------------------------------------------------------------ 출처 포트

/** `mission-start`의 거절 — 1단계 거절 코드 그대로(PRD §3.9)와 연결 실패(`network`). */
export type MissionStartRejection =
  | "insufficient_credits"
  | "not_available"
  | "age_restricted"
  | "usage_time_limit"
  | "temporarily_blocked"
  | "network";

export type MissionStartResult =
  | { readonly kind: "started"; readonly value: MissionStartResponse }
  | { readonly kind: "rejected"; readonly code: MissionStartRejection };

/** 힌트 — 예시 문장 하나, 또는 더 받을 수 없음(세 번을 다 썼거나 못 이룬 목표가 없음 · 실패). */
export type MissionHintResult =
  | { readonly kind: "hint"; readonly value: MissionHintResponse }
  | { readonly kind: "unavailable" };

export type MissionInputMode = "text" | "voice";

export type MissionTurnRequest = {
  readonly conversationId: string;
  readonly text: string;
  readonly inputMode: MissionInputMode;
};

/** 턴 하나의 SSE 수신자 — 이벤트는 이름과 JSON 글자 그대로(메신저 `applyTurnEvent`가 읽는 모양)입니다. */
export type MissionTurnListener = {
  readonly onEvent: (event: string, data: string) => void;
  /** 스트림이 닫혔습니다. `done` · `error`를 받았으면 그 뒤, 받지 못했으면 연결이 끊긴 것입니다. */
  readonly onEnd: () => void;
};

/**
 * 미션의 출처 포트입니다 — 화면 · 리듀서는 이 타입에만 기댑니다. 1판은 가짜 구현(`mission-fake-source.ts`)이 채우고,
 * 서버 구현(`mission-start` · `chat-send` + `conversation_id` · `mission-hint` · `mission-finish`, PRD §6)은 나중에 같은 모양으로 붙입니다.
 * 메신저 `ChatSource`(방 = 캐릭터 전제)는 쓰지 않습니다(PRD §7).
 */
export type MissionSource = {
  /** `companion_list_missions()` — 미션 목록과 이번 판의 값. */
  readonly list: () => Promise<MissionList>;
  readonly start: (missionId: string) => Promise<MissionStartResult>;
  /** 턴 하나를 보냅니다. 돌려받은 함수는 스트림을 끊습니다(화면을 떠날 때). */
  readonly sendTurn: (request: MissionTurnRequest, listener: MissionTurnListener) => () => void;
  readonly hint: (conversationId: string) => Promise<MissionHintResult>;
  /** 몇 번 불러도 같은 결과입니다 — 채점 실패 뒤 다시 부르면 채점만 다시 돕니다(PRD §3.6). */
  readonly finish: (conversationId: string, abandon: boolean) => Promise<MissionFinishResponse>;
};

// ------------------------------------------------------------------ 판의 상태

/**
 * 판의 국면입니다(PRD §3.3 · §3.6) — 시작 전 · 시작 중 · 대화(내 차례) · 답 기다림 · 끝남(마지막 턴이 옴) · 채점 중 ·
 * 리포트 · 채점 실패 · 그만둠.
 */
export type MissionPhase =
  | "preview"
  | "starting"
  | "talking"
  | "awaiting"
  | "ended"
  | "grading"
  | "report"
  | "grading-failed"
  | "abandoned";

/** 대화 줄 하나 — 상대역의 말풍선이거나 내 글입니다. */
export type MissionLine =
  | {
      readonly kind: "them";
      readonly id: string;
      readonly ko: string;
      readonly translation: string | null;
    }
  | {
      readonly kind: "me";
      /** 앱이 붙인 id(`me-<n>`). 서버 id는 `start`에서 받아 `serverId`에 둡니다. */
      readonly id: string;
      readonly serverId: string | null;
      readonly ko: string;
      readonly inputMode: MissionInputMode;
      /** 보내지 못했다 — 스트림 오류 · 연결 끊김. 다시 보내면 새 줄이 섭니다. */
      readonly failed: boolean;
      readonly correction: ChatCorrection | null;
    };

export type MissionSessionState = {
  readonly phase: MissionPhase;
  readonly missionId: string;
  readonly startError: MissionStartRejection | null;
  readonly conversationId: string | null;
  readonly counterpartLabel: string;
  readonly goals: readonly MissionGoalState[];
  readonly turnLimit: number;
  readonly turnsLeft: number;
  readonly hintsLeft: number;
  readonly hintsUsed: number;
  readonly lines: readonly MissionLine[];
  /** 지금 받는 중인 턴(메신저 턴 리듀서의 상태). 없으면 `null`. */
  readonly turn: TurnState | null;
  /** 받는 중인 턴의 내 줄 id. */
  readonly turnLineId: string | null;
  readonly sentCount: number;
  /** 펼친 힌트 카드. 닫으면 `null`. */
  readonly hint: MissionHintResponse | null;
  readonly hintLoading: boolean;
  readonly endReason: MissionEndReason | null;
  readonly report: MissionReport | null;
  readonly gradingFailure: { readonly refunded: boolean; readonly retryable: boolean } | null;
};

export type MissionSessionAction =
  | { readonly type: "start-requested" }
  | { readonly type: "started"; readonly value: MissionStartResponse }
  | { readonly type: "start-rejected"; readonly code: MissionStartRejection }
  | { readonly type: "send"; readonly text: string; readonly inputMode: MissionInputMode }
  | { readonly type: "turn-event"; readonly event: string; readonly data: string }
  | { readonly type: "turn-closed" }
  | { readonly type: "hint-requested" }
  | { readonly type: "hint-received"; readonly value: MissionHintResponse }
  | { readonly type: "hint-unavailable" }
  | { readonly type: "hint-dismissed" }
  | { readonly type: "grading-requested" }
  | { readonly type: "finished"; readonly value: MissionFinishResponse }
  | { readonly type: "finish-failed" }
  | { readonly type: "abandoned" }
  | { readonly type: "reset" };

// ------------------------------------------------------------------ 화면 props

/** 미리보기 · 대화 · 리포트가 함께 쓰는 미션 한 칸(목록 값 + 장면 그림). */
export type MissionCard = {
  readonly item: MissionListItem;
  readonly price: MissionPrice;
  /** 장면 그림 — 에피소드 표지의 첫 그림. 없으면 단색 바탕입니다. */
  readonly imageUrl: string | null;
  /** 「Episode n.」의 n. 카탈로그에 없으면 `null`. */
  readonly ordinal: number | null;
};

export type MissionPreviewScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly card: MissionCard;
  readonly starting: boolean;
  readonly startError: MissionStartRejection | null;
  readonly onStart: () => void;
  readonly onExit: () => void;
};

export type MissionTalkScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly card: MissionCard;
  readonly state: MissionSessionState;
  readonly onSend: (text: string, inputMode: MissionInputMode) => void;
  readonly onHint: () => void;
  readonly onDismissHint: () => void;
  /** 그만두기 — 확인 뒤 부릅니다(리포트 없이 나감). */
  readonly onQuit: () => void;
};

export type MissionReportScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly card: MissionCard;
  /** 리포트, 또는 채점 실패(`report === null`). */
  readonly report: MissionReport | null;
  readonly gradingFailure: { readonly refunded: boolean; readonly retryable: boolean } | null;
  readonly grading: boolean;
  readonly onRetryGrading: () => void;
  readonly onPlayAgain: () => void;
  readonly onExit: () => void;
};
