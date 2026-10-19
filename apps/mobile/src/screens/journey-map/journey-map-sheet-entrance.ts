// 유닛 탭 등장의 시작 시점을 정하는 상태 기계입니다 — 측정 → (스크롤 도착 대기) → 등장.

import { motion } from "@libitums/design-tokens";
import { motionDurationMs } from "@libitums/ui-lynx/motion";

import type { SheetTargetId } from "./catalog-map.contract";

export type SheetEntranceState =
  | { readonly phase: "idle" }
  /** 열었고 유닛을 재는 중입니다. */
  | { readonly phase: "measuring"; readonly stepId: SheetTargetId }
  /** 목적지로 보냈고 닿기를 기다립니다. 측정 실패(`scrollIntoView`)면 목적지를 몰라 null. */
  | { readonly phase: "travelling"; readonly stepId: SheetTargetId; readonly offset: number | null }
  | { readonly phase: "entering"; readonly stepId: SheetTargetId };

export type SheetEntranceAction =
  | { readonly type: "open"; readonly stepId: SheetTargetId }
  | {
      readonly type: "measured";
      readonly stepId: SheetTargetId;
      readonly offset: number | null;
      readonly scrollTop: number;
    }
  | { readonly type: "scroll"; readonly scrollTop: number }
  /** 조용함 · 상한 타이머가 보냅니다(출처를 가리지 않습니다). */
  | { readonly type: "expire"; readonly stepId: SheetTargetId }
  | { readonly type: "close" };

export const initialSheetEntranceState: SheetEntranceState = { phase: "idle" };

/**
 * 변화가 없으면 같은 참조를 돌려줍니다. 던지지 않습니다.
 * - open: 늘 새 measuring(같은 id여도 새로 시작).
 * - measured: measuring · 같은 id일 때만. 목적지가 지금 자리와 허용오차 이내면 바로 entering, 아니면 travelling.
 * - scroll: 목적지를 아는 travelling에서 목적지에 닿으면 entering.
 * - expire: measuring · travelling의 같은 id를 entering으로.
 * - close: idle(이미 idle이면 같은 참조).
 */
export function sheetEntranceReducer(
  state: SheetEntranceState,
  action: SheetEntranceAction,
  tolerance: number,
): SheetEntranceState {
  switch (action.type) {
    case "open":
      return { phase: "measuring", stepId: action.stepId };
    case "measured": {
      if (state.phase !== "measuring" || state.stepId !== action.stepId) {
        return state;
      }
      const arrived =
        action.offset !== null && Math.abs(action.offset - action.scrollTop) <= tolerance;
      return arrived
        ? { phase: "entering", stepId: state.stepId }
        : { phase: "travelling", stepId: state.stepId, offset: action.offset };
    }
    case "scroll": {
      if (state.phase !== "travelling" || state.offset === null) {
        return state;
      }
      return Math.abs(action.scrollTop - state.offset) <= tolerance
        ? { phase: "entering", stepId: state.stepId }
        : state;
    }
    case "expire":
      if (
        (state.phase === "measuring" || state.phase === "travelling") &&
        state.stepId === action.stepId
      ) {
        return { phase: "entering", stepId: state.stepId };
      }
      return state;
    case "close":
      return state.phase === "idle" ? state : initialSheetEntranceState;
  }
}

/** 조용함 타이머를 걸어 둘 단계인가 — travelling만. */
export function sheetEntranceAwaitsQuiet(state: SheetEntranceState): boolean {
  return state.phase === "travelling";
}

// 타이머 시간은 행동 계약이라 화면 모션 값은 아니지만 ADR-0053 D5 선례대로 토큰에서 읽습니다.
/** 스크롤 이벤트가 이만큼 끊기면 멈춘 것으로 읽습니다(끝에서 멈춤 · 측정 실패). */
export const sheetEntranceQuietMs: number = motionDurationMs(motion.duration.d4);
/** 열린 뒤 이 시간 안에는 대기가 끝납니다(측정 답이 오지 않는 경우도 덮습니다). */
export const sheetEntranceDeadlineMs: number = motionDurationMs(motion.duration.d9);

export type SheetEntrancePhase = "waiting" | "entering";

/** entering → "entering", 나머지(idle 포함) → "waiting". */
export function sheetEntrancePhaseOf(state: SheetEntranceState): SheetEntrancePhase {
  return state.phase === "entering" ? "entering" : "waiting";
}
