// 받기 시트 본문 행 계산입니다(순수).

import type { DownloadSheetState } from "./download-sheet.contract";

export type DownloadSheetRowId = "common" | "target" | "rest";
export type DownloadSheetRowStatus = "done" | "pending" | "wifi";
export type DownloadSheetRow = {
  readonly id: DownloadSheetRowId;
  readonly status: DownloadSheetRowStatus;
};

/** 편 대상: [common, target] 두 행. 유닛 대상: [common, target, rest(wifi)] 세 행. offline은 행이 없다. */
export function downloadSheetRowsOf(state: DownloadSheetState): readonly DownloadSheetRow[] {
  if (state.kind === "offline") return [];
  const { target, commonDone } = state;
  const rows: DownloadSheetRow[] = [
    { id: "common", status: commonDone ? "done" : "pending" },
    { id: "target", status: "pending" },
  ];
  if (target.kind === "unit") rows.push({ id: "rest", status: "wifi" });
  return rows;
}
