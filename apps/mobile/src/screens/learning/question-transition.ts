import type { Motion } from "@libitums/ui-lynx/motion";

/** 문항 전환의 세 상태. idle은 전환 없음, primed는 새 내용이 보이지 않는 시작값, entering은 정착값으로 가는 중. */
export type QuestionTransitionPhase = "idle" | "primed" | "entering";

/** 전환을 움직이는 사건. change는 문항이 바뀜, tick은 시작값이 칠해짐, end는 전환 시간이 지남. */
export type QuestionTransitionEvent = "change" | "tick" | "end";

/** 전환의 단위 — 문항 순번 또는 완료 장면. 바뀌면 전환이 섭니다. */
export function questionTransitionKey(_questionIndex: number, _complete: boolean): string {
  return "0";
}

/**
 * 마운트 시 상태. 첫 문항(0)은 화면 push와 함께 서므로 전환하지 않고,
 * 그 뒤 순번으로 마운트되면(Writing 재마운트) 전환합니다.
 */
export function initialQuestionTransitionPhase(_questionIndex: number): QuestionTransitionPhase {
  return "idle";
}

/**
 * 상태 전이. idle+change → primed · primed+tick → entering · entering+end → idle.
 * entering+change는 현재 값에서 이어가므로 entering을 유지하고, 나머지 조합은 상태를 바꾸지 않습니다.
 */
export function questionTransitionReducer(
  phase: QuestionTransitionPhase,
  _event: QuestionTransitionEvent,
): QuestionTransitionPhase {
  return phase;
}

/** entering이 끝나는 시간(ms) — standard는 page, reduced는 d2 토큰에서 읽습니다. */
export function questionTransitionDurationMs(_motion: Motion): number {
  return 0;
}

/**
 * 요소의 클래스 — base + (phase ≠ idle이면 `${block}-page-${phase}`) +
 * (reduced이고 phase ≠ idle이면 `${block}-motion-reduced`).
 */
export function questionTransitionClassName(
  block: "learning-shell-stage" | "learning-shell-scroll",
  extra: readonly string[],
  _phase: QuestionTransitionPhase,
  _motion: Motion,
): string {
  return [block, ...extra].join(" ");
}
