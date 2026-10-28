import { expect, test } from "vitest";

import {
  catalogUpdateNoticeRecordFrom,
  emptyCatalogUpdateNoticeRecord,
  shouldShowCatalogUpdateNotice,
  withCatalogUpdateNoticeClosed,
} from "./catalog-update-notice";

// `unit` 계층: 업데이트 안내의 기록 — 읽기(망가진 값은 빈 기록) · 띄울지 · 닫은 뒤 기록.

test("UN1. 저장값을 읽는다 — 없거나 망가졌으면 빈 기록, 모르는 원소 · 중복은 버린다", () => {
  expect(catalogUpdateNoticeRecordFrom(null)).toEqual(emptyCatalogUpdateNoticeRecord);
  expect(catalogUpdateNoticeRecordFrom("{")).toEqual(emptyCatalogUpdateNoticeRecord);
  expect(catalogUpdateNoticeRecordFrom("[1]")).toEqual(emptyCatalogUpdateNoticeRecord);
  expect(
    catalogUpdateNoticeRecordFrom(
      JSON.stringify({ seen: ["u03:INT", 3, "u03:INT", ""], muted: true }),
    ),
  ).toEqual({ seen: ["u03:INT"], muted: true });
  expect(catalogUpdateNoticeRecordFrom(JSON.stringify({ muted: "yes" }))).toEqual(
    emptyCatalogUpdateNoticeRecord,
  );
});

test("UN2. 본 적 없는 서명이 하나라도 있으면 띄운다 — 끄기 · 저장소 없음 · 서명 없음이면 안 띄운다", () => {
  const record = { seen: ["u03:INT"], muted: false };
  const show = (
    signatures: readonly string[],
    extra: Partial<typeof record> = {},
    storageAvailable = true,
  ) =>
    shouldShowCatalogUpdateNotice({
      record: { ...record, ...extra },
      signatures,
      storageAvailable,
    });
  expect(show(["u03:INT"])).toBe(false);
  expect(show(["u03:INT", "u05:S9"])).toBe(true);
  expect(show([])).toBe(false);
  expect(show(["u05:S9"], { muted: true })).toBe(false);
  expect(show(["u05:S9"], {}, false)).toBe(false);
});

test("UN3. 닫으면 지금 서명을 본 것으로 더하고, 체크했으면 끈다 — 끈 기록은 되돌리지 않는다", () => {
  const closed = withCatalogUpdateNoticeClosed(
    { seen: ["u03:INT"], muted: false },
    ["u03:INT", "u05:S9"],
    false,
  );
  expect(closed).toEqual({ seen: ["u03:INT", "u05:S9"], muted: false });
  expect(withCatalogUpdateNoticeClosed(closed, [], true).muted).toBe(true);
  expect(withCatalogUpdateNoticeClosed({ seen: [], muted: true }, ["a:b"], false).muted).toBe(true);
});
