import type { SheetTargetId } from "./catalog-map.contract";
import type { SheetEntrancePhase } from "./journey-map-sheet-entrance";

export type SheetEntranceControls = {
  readonly phase: SheetEntrancePhase;
  /** 상태를 measuring으로, 상한 타이머를 겁니다(앞 타이머는 걷음). */
  readonly open: (stepId: SheetTargetId) => void;
  /** 측정 답 — travelling이 되면 조용함 타이머를 겁니다. */
  readonly measured: (stepId: SheetTargetId, offset: number | null, scrollTop: number) => void;
  /** 열린 동안의 스크롤 이벤트 — travelling이면 조용함 타이머를 다시 겁니다. */
  readonly scroll: (scrollTop: number) => void;
  /** idle로, 타이머 둘을 걷습니다. */
  readonly close: () => void;
};

function ignore(): void {
  // 껍데기입니다 — 동작은 다음 단계에서 채웁니다.
}

const idleControls: SheetEntranceControls = {
  phase: "waiting",
  open: ignore,
  measured: ignore,
  scroll: ignore,
  close: ignore,
};

/** 등장 시작 시점을 집니다 — 아직 늘 대기 상태입니다. */
export function useSheetEntrance(): SheetEntranceControls {
  return idleControls;
}
