import type { ReactNode } from "@lynx-js/react";

import { sheetPercentLabel, type SheetEntranceMotion } from "./journey-map-sheet-motion";

export type StepSheetPercentProps = {
  /** 최종 백분율 정수 — `sheetPercentOf(progress.fillPercent)`. */
  readonly percent: number;
  readonly entrance: SheetEntranceMotion;
};

/** 말풍선의 백분율 글자입니다 — 아직 최종값만 그립니다. */
export function StepSheetPercent({ percent }: StepSheetPercentProps): ReactNode {
  return (
    <text className="step-sheet-progress-percent" data-testid="step-sheet-progress-percent">
      {sheetPercentLabel(percent)}
    </text>
  );
}
