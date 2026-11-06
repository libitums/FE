import { expect, test } from "vitest";

import { downloadSheetRowsOf } from "./download-sheet-rows";

// `unit` 계층: 받기 시트 본문 행 계산입니다.
// 입력은 계약 3-1의 새 상태 모양(target · commonDone)입니다 — 뼈대의 인자 타입이 옛 모양이라 `as unknown as`로 넘깁니다.

type RowsInput = Parameters<typeof downloadSheetRowsOf>[0];

const episodeTarget = { kind: "episode", ordinal: 2, sizeBytes: null } as const;
const unitTarget = {
  kind: "unit",
  ordinal: 2,
  unit: { role: "lesson", ordinal: 3 },
} as const;

const rowsOf = (state: Record<string, unknown>) =>
  downloadSheetRowsOf(state as unknown as RowsInput);

test("[U-SR1] 편 ask — [common, target(pending)] 두 행이고 common 색은 commonDone을 따른다", () => {
  expect(rowsOf({ kind: "ask", target: episodeTarget, commonDone: false })).toEqual([
    { id: "common", status: "pending" },
    { id: "target", status: "pending" },
  ]);
  expect(rowsOf({ kind: "ask", target: episodeTarget, commonDone: true })).toEqual([
    { id: "common", status: "done" },
    { id: "target", status: "pending" },
  ]);
});

test("[U-SR1] 유닛 ask · wifi-only — 세 행이고 마지막은 wifi다", () => {
  expect(rowsOf({ kind: "ask", target: unitTarget, commonDone: true })).toEqual([
    { id: "common", status: "done" },
    { id: "target", status: "pending" },
    { id: "rest", status: "wifi" },
  ]);
  expect(rowsOf({ kind: "wifi-only", target: unitTarget, commonDone: false })).toEqual([
    { id: "common", status: "pending" },
    { id: "target", status: "pending" },
    { id: "rest", status: "wifi" },
  ]);
});

test("[U-SR1] offline은 행이 없다", () => {
  expect(rowsOf({ kind: "offline", target: unitTarget, canOpenAnyway: true })).toEqual([]);
  expect(rowsOf({ kind: "offline", target: episodeTarget, canOpenAnyway: false })).toEqual([]);
});
