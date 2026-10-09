import { motion as motionTokens } from "@libitums/design-tokens";
import { motionDurationMs, type Motion } from "@libitums/ui-lynx/motion";

/** 문항 전환의 세 상태. idle은 전환 없음, primed는 새 내용이 보이지 않는 시작값, entering은 정착값으로 가는 중. */
export type QuestionTransitionPhase = "idle" | "primed" | "entering";

/** 전환을 움직이는 사건. change는 문항이 바뀜, tick은 시작값이 칠해짐, end는 전환 시간이 지남. */
export type QuestionTransitionEvent = "change" | "tick" | "end";

/** 전환의 단위 — 문항 순번 또는 완료 장면. 바뀌면 전환이 섭니다. */
export function questionTransitionKey(questionIndex: number, complete: boolean): string {
  return complete ? "complete" : String(questionIndex);
}

/**
 * 마운트 시 상태. 첫 문항(0)은 화면 push와 함께 서므로 전환하지 않고,
 * 그 뒤 순번으로 마운트되면(Writing 재마운트) 전환합니다.
 */
export function initialQuestionTransitionPhase(questionIndex: number): QuestionTransitionPhase {
  return questionIndex > 0 ? "primed" : "idle";
}

/**
 * 상태 전이. idle+change → primed · primed+tick → entering · entering+end → idle.
 * entering+change는 현재 값에서 이어가므로 entering을 유지하고, 나머지 조합은 상태를 바꾸지 않습니다.
 */
export function questionTransitionReducer(
  phase: QuestionTransitionPhase,
  event: QuestionTransitionEvent,
): QuestionTransitionPhase {
  if (phase === "idle" && event === "change") {
    return "primed";
  }
  if (phase === "primed" && event === "tick") {
    return "entering";
  }
  if (phase === "entering" && event === "end") {
    return "idle";
  }
  return phase;
}

/** entering이 끝나는 시간(ms) — standard는 page, reduced는 d2 토큰에서 읽습니다. */
export function questionTransitionDurationMs(motion: Motion): number {
  return motionDurationMs(
    motion === "reduced" ? motionTokens.duration.d2 : motionTokens.duration.page,
  );
}

/**
 * 요소의 클래스 — base + (phase ≠ idle이면 `${block}-page-${phase}`) +
 * (reduced이고 phase ≠ idle이면 `${block}-motion-reduced`).
 */
export function questionTransitionClassName(
  block: "learning-shell-stage" | "learning-shell-scroll",
  extra: readonly string[],
  phase: QuestionTransitionPhase,
  motion: Motion,
): string {
  const tokens = [block, ...extra];
  if (phase !== "idle") {
    tokens.push(`${block}-page-${phase}`);
    if (motion === "reduced") {
      tokens.push(`${block}-motion-reduced`);
    }
  }
  return tokens.join(" ");
}
