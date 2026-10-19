// 유닛 탭 등장의 시작 시점을 정하는 상태 기계입니다 — 측정 → (스크롤 도착 대기) → 등장.

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
 * 스캐폴드 — 전이는 아직 없고 늘 지금 상태를 돌려줍니다.
 */
export function sheetEntranceReducer(
  state: SheetEntranceState,
  _action: SheetEntranceAction,
  _tolerance: number,
): SheetEntranceState {
  return state;
}

/** 조용함 타이머를 걸어 둘 단계인가 — travelling만. */
export function sheetEntranceAwaitsQuiet(_state: SheetEntranceState): boolean {
  return false;
}

/** 조용함 타이머 · 상한 타이머의 시간(ms)입니다. */
export const sheetEntranceQuietMs: number = 0;
export const sheetEntranceDeadlineMs: number = 0;

export type SheetEntrancePhase = "waiting" | "entering";

/** entering → "entering", 나머지(idle 포함) → "waiting". */
export function sheetEntrancePhaseOf(_state: SheetEntranceState): SheetEntrancePhase {
  return "waiting";
}
