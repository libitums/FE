// 체험판 흐름의 상태 · 행동 · 파생 — 전부 순수입니다.
import type { AnswerResult, PassVerdict } from "@libitums/episode-core/judge";
import type { TrialModel } from "./trial-model.contract";

export type TrialStepId =
  | "prologue"
  | "vocab"
  | "image-match"
  | "reply-select"
  | "culture"
  | "roleplay"
  | "epilogue"
  | "clear"
  | "complete";

/** 이탈 측정에 쓰는 단계 — 표지가 없어 모든 단계다(prologue는 첫 탭 `begin`에서 닿는다). */
export type TrialFunnelStep = TrialStepId;

/** Episode clear 장면의 두 자리 — 배너(유지 시간 · 탭) 뒤 예고. */
export type TrialClearPhase = "banner" | "teaser";

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
  /** 첫 탭(begin) 전이면 false — 소리 · 이벤트가 그때 시작한다. */
  readonly begun: boolean;
  readonly clearPhase: TrialClearPhase;
  readonly choice: TrialChoiceState;
  readonly cultureFace: "front" | "back";
  readonly speech: SpeechAvailability;
  readonly roleplay: TrialRoleplayState;
  /** 처음 닿은 순서 — 단계 이벤트는 한 번만. */
  readonly reached: readonly TrialFunnelStep[];
};

export type SpeechFailure = "no-speech" | "denied" | "unsupported" | "unavailable" | "aborted";

export type TrialAction =
  | { readonly type: "begin"; readonly speech: "supported" | "unsupported" }
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

/** 열 때의 상태 — 컷 1 · begun false. 말하기 지원은 begin이 정한다(그 전 speech는 자리값 "unsupported"). */
export type InitialTrialState = () => TrialState;
/** 바뀔 것이 없으면 같은 참조. */
export type ReduceTrial = (state: TrialState, action: TrialAction, model: TrialModel) => TrialState;

// ------------------------------------------------------------ 파생

/** prologue 1 · vocab 2 · image-match 3 · reply-select 4 · culture 5 · roleplay 6 · epilogue · clear · complete 7. */
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

/** 컷 · 장면 사이 전환 — dream: 구름빛에서 또렷해짐, wake: 눈을 뜨듯 위아래에서 열림. */
export type TrialTransition = "dream" | "wake";
/** 전이 하나에 쓸 전환. 학습 단계 사이 · 그 밖은 null(r1 페이드가 맡는다). 순수. */
export type TrialTransitionOf = (
  prev: TrialState,
  next: TrialState,
  model: TrialModel,
) => TrialTransition | null;

/** 배너가 스스로 넘어가기까지(ms) — 앱 EPISODE_BANNER_HOLD_MS와 같다. */
export const TRIAL_CLEAR_HOLD_MS = 1600;
