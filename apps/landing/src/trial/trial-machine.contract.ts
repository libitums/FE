// 체험판 흐름의 상태 · 행동 · 파생 — 전부 순수입니다.
import type { AnswerResult, PassVerdict } from "@libitums/episode-core/judge";
import type { TrialModel } from "./trial-model.contract";

export type TrialStepId =
  | "start"
  | "prologue"
  | "vocab"
  | "image-match"
  | "reply-select"
  | "culture"
  | "roleplay"
  | "epilogue"
  | "complete";

/** 이탈 측정에 쓰는 단계 — 시작 화면(페이지 보기)은 뺀다. */
export type TrialFunnelStep = Exclude<TrialStepId, "start">;

/** 브라우저 말하기 — 생성자 유무로 시작, 거부되면 denied(그 뒤 턴은 타일). */
export type SpeechAvailability = "supported" | "unsupported" | "denied";

export type TurnMode = "speech" | "tiles";
export type TurnPhase = "ready" | "listening" | "judged";
/** 판정 없이 보이는 안내 — 이번 턴을 타일로 바꾼 까닭. */
export type TurnNotice = "unsupported" | "denied" | "unavailable" | null;

export type TrialTurnState = {
  readonly index: number;
  readonly mode: TurnMode;
  readonly phase: TurnPhase;
  /** 말하기 judged에서만 — 판정에 쓴 문장(못 들었으면 ""). */
  readonly heard: string;
  /** 타일 모드의 놓은 순서(보이는 자리 번호). */
  readonly placed: readonly number[];
  readonly verdict: AnswerResult | null;
  readonly hintShown: boolean;
  readonly notice: TurnNotice;
};

export type TurnRecord = { readonly result: AnswerResult; readonly mode: TurnMode };

export type TrialRoleplayState = {
  readonly turn: TrialTurnState;
  readonly records: readonly TurnRecord[];
  /** 마지막 턴을 넘긴 뒤의 결과 — 그 전에는 null. 결과와 무관하게 엔딩으로 간다. */
  readonly verdict: PassVerdict | null;
};

export type TrialChoiceState = {
  readonly selected: number | null;
  readonly verdict: AnswerResult | null;
};

export type TrialState = {
  readonly step: TrialStepId;
  /** prologue · epilogue의 컷 자리(0부터). */
  readonly cutIndex: number;
  readonly choice: TrialChoiceState;
  readonly cultureFace: "front" | "back";
  readonly speech: SpeechAvailability;
  readonly roleplay: TrialRoleplayState;
  /** 처음 닿은 순서 — 단계 이벤트는 한 번만. */
  readonly reached: readonly TrialFunnelStep[];
};

export type SpeechFailure = "no-speech" | "denied" | "unsupported" | "unavailable" | "aborted";

export type TrialAction =
  | { readonly type: "start" }
  | { readonly type: "next" }
  | { readonly type: "choose"; readonly optionIndex: number }
  | { readonly type: "flip" }
  | { readonly type: "speak" }
  | { readonly type: "heard"; readonly alternatives: readonly string[] }
  | { readonly type: "speech-failed"; readonly reason: SpeechFailure }
  | { readonly type: "retry" }
  | { readonly type: "cant-speak" }
  | { readonly type: "hint" }
  | { readonly type: "toggle-tile"; readonly tileIndex: number }
  | { readonly type: "check" };

export type InitialTrialState = (speech: Exclude<SpeechAvailability, "denied">) => TrialState;
/** 바뀔 것이 없으면 같은 참조. */
export type ReduceTrial = (state: TrialState, action: TrialAction, model: TrialModel) => TrialState;

// ------------------------------------------------------------ 파생

/** start 0 · prologue 1 · vocab 2 · image-match 3 · reply-select 4 · culture 5 · roleplay 6 · epilogue · complete 7. */
export type TrialProgress = { readonly ordinal: number; readonly total: 7 };
export type TrialProgressOf = (state: TrialState) => TrialProgress;

/** 지금 나야 할 음성 — key가 바뀔 때만 재생(같은 key면 다시 내지 않음). */
export type TrialVoiceCue = { readonly key: string; readonly url: string };
export type TrialVoiceCueOf = (state: TrialState, model: TrialModel) => TrialVoiceCue | null;

export type TrialSfx =
  | "button"
  | "correct_answer"
  | "wrong_answer"
  | "pass_lesson"
  | "lesson_complete";
export type TrialSfxOf = (
  prev: TrialState,
  next: TrialState,
  action: TrialAction,
) => TrialSfx | null;

export type TrialRoleplayVerdictOf = (records: readonly TurnRecord[]) => PassVerdict;
