import { useEffect, useMemo, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import {
  sheetPercentCountUpFor,
  sheetPercentView,
  type SheetEntranceMotion,
} from "./journey-map-sheet-motion";

export type StepSheetPercentProps = {
  /** 최종 백분율 정수 — `sheetPercentOf(progress.fillPercent)`. */
  readonly percent: number;
  readonly entrance: SheetEntranceMotion;
};

/**
 * 말풍선의 백분율 글자입니다. 등장 중이면 0에서 최종값까지 한 칸씩 오르고 마지막 칸에서 한 번 튑니다 — 칸마다
 * 이 잎만 다시 그립니다(프레임마다 화면 전체를 다시 그리지 않습니다). 일정은 순수 함수가 내고, 타이머는 한 번에
 * 하나만 걸려 있다가 마지막 칸에서 끝납니다. 대기 · 줄이기 · 0%는 처음부터 최종값입니다.
 */
export function StepSheetPercent({ percent, entrance }: StepSheetPercentProps): ReactNode {
  const countUp = useMemo(() => sheetPercentCountUpFor(entrance, percent), [entrance, percent]);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (countUp === null) {
      return undefined;
    }
    const last = countUp.frames.length - 1;
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const step = (): void => {
      index += 1;
      setFrameIndex(index);
      timer = index < last ? setTimeout(step, countUp.stepMs) : null;
    };
    // 첫 칸은 시작 지연 뒤 한 칸 간격에 옵니다 — 막대(CSS)가 지연 뒤 움직이기 시작해 같은 때 끝납니다.
    timer = setTimeout(step, countUp.startDelayMs + countUp.stepMs);
    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [countUp]);

  const view = sheetPercentView(countUp, percent, frameIndex);
  return (
    <view className={view.className} data-testid="step-sheet-progress-percent-pop">
      <text className="step-sheet-progress-percent" data-testid="step-sheet-progress-percent">
        {view.label}
      </text>
    </view>
  );
}
