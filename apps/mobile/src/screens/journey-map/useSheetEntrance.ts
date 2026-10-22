import { useEffect, useRef, useState } from "@lynx-js/react";

import type { SheetTargetId } from "./catalog-map.contract";
import {
  initialSheetEntranceState,
  sheetEntranceAwaitsQuiet,
  sheetEntranceDeadlineMs,
  sheetEntrancePhaseOf,
  sheetEntranceQuietMs,
  sheetEntranceReducer,
  type SheetEntranceAction,
  type SheetEntrancePhase,
  type SheetEntranceState,
} from "./journey-map-sheet-entrance";
import { autoScrollTolerance } from "./journey-map-scroll-position";

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

type Timer = ReturnType<typeof setTimeout>;

/**
 * 등장 시작 시점을 집니다. 순서는 순수 리듀서가 정하고, 이 훅은 거기에 타이머 둘을 잇습니다 — 열린 뒤 상한(측정
 * 답이 오지 않는 경우까지 덮습니다)과, 스크롤 이벤트가 끊긴 뒤의 조용함(끝에서 멈춤 · 측정 실패)입니다. 상태는
 * ref에도 두어 핸들러가 바로 다음 단계를 읽고 타이머를 걸 수 있게 합니다.
 */
export function useSheetEntrance(): SheetEntranceControls {
  const [state, setState] = useState<SheetEntranceState>(initialSheetEntranceState);
  const current = useRef<SheetEntranceState>(initialSheetEntranceState);
  const deadline = useRef<Timer | null>(null);
  const quiet = useRef<Timer | null>(null);

  const clearDeadline = (): void => {
    "background only";
    if (deadline.current !== null) {
      clearTimeout(deadline.current);
      // oxlint-disable-next-line react/immutability
      deadline.current = null;
    }
  };
  const clearQuiet = (): void => {
    "background only";
    if (quiet.current !== null) {
      clearTimeout(quiet.current);
      // oxlint-disable-next-line react/immutability
      quiet.current = null;
    }
  };

  const apply = (action: SheetEntranceAction): void => {
    "background only";
    const next = sheetEntranceReducer(current.current, action, autoScrollTolerance);
    if (next !== current.current) {
      // oxlint-disable-next-line react/immutability
      current.current = next;
      setState(next);
    }
    if (next.phase === "idle" || next.phase === "entering") {
      clearDeadline();
      clearQuiet();
      return;
    }
    if (next.phase === "measuring") {
      if (action.type === "open") {
        clearDeadline();
        clearQuiet();
        const stepId = next.stepId;
        // oxlint-disable-next-line react/immutability
        deadline.current = setTimeout(() => {
          "background only";
          apply({ type: "expire", stepId });
        }, sheetEntranceDeadlineMs);
      }
      return;
    }
    // travelling: 측정 답과 스크롤 이벤트마다 조용함을 다시 겁니다.
    if (
      sheetEntranceAwaitsQuiet(next) &&
      (action.type === "measured" || action.type === "scroll")
    ) {
      clearQuiet();
      const stepId = next.stepId;
      // oxlint-disable-next-line react/immutability
      quiet.current = setTimeout(() => {
        "background only";
        apply({ type: "expire", stepId });
      }, sheetEntranceQuietMs);
    }
  };

  useEffect(
    () => () => {
      clearDeadline();
      clearQuiet();
    },
    [],
  );

  return {
    phase: sheetEntrancePhaseOf(state),
    open: (stepId) => {
      "background only";
      apply({ type: "open", stepId });
    },
    measured: (stepId, offset, scrollTop) => {
      "background only";
      apply({ type: "measured", stepId, offset, scrollTop });
    },
    scroll: (scrollTop) => {
      "background only";
      apply({ type: "scroll", scrollTop });
    },
    close: () => {
      "background only";
      apply({ type: "close" });
    },
  };
}
