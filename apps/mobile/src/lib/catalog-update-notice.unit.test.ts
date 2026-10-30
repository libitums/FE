import { expect, test } from "vitest";

import {
  catalogUpdateNoticeNeedsSync,
  catalogUpdateNoticeRecordFrom,
  emptyCatalogUpdateNoticeRecord,
  shouldShowCatalogUpdateNotice,
  withCatalogUpdateNoticeVersions,
} from "./catalog-update-notice";

// `unit` 계층: 업데이트 안내의 기록 — 마지막으로 본 에피소드 버전과 끄기. 버전이 바뀐(업데이트된) 에피소드에 새 유닛이
// 있을 때만 뜨므로, 유닛을 끝내거나 에피소드를 클리어해도 다시 뜨지 않습니다.

test("UN1. 저장값을 읽는다 — 없거나 망가졌거나 옛 모양(seen)이면 버전 기록 없음(null), 문자열 아닌 버전은 버린다", () => {
  expect(catalogUpdateNoticeRecordFrom(null)).toEqual(emptyCatalogUpdateNoticeRecord);
  expect(catalogUpdateNoticeRecordFrom("{")).toEqual(emptyCatalogUpdateNoticeRecord);
  expect(catalogUpdateNoticeRecordFrom(JSON.stringify({ seen: ["u03:INT"], muted: true }))).toEqual(
    {
      versions: null,
      muted: true,
    },
  );
  expect(
    catalogUpdateNoticeRecordFrom(JSON.stringify({ versions: { u03: "2026-10-28.1", u04: 3 } })),
  ).toEqual({ versions: { u03: "2026-10-28.1" }, muted: false });
});

const versions = { u03: "2026-10-28.1", u05: "2026-10-28.1" };
const show = (
  record: Parameters<typeof shouldShowCatalogUpdateNotice>[0]["record"],
  freshIds: readonly string[],
  storageAvailable = true,
) => shouldShowCatalogUpdateNotice({ record, versions, freshIds, storageAvailable });

test("UN2. 새 유닛이 있는 에피소드의 버전이 기록과 다를 때만 뜬다 — 기록이 없으면(첫 실행 · 앱 업데이트) 새 유닛만으로 뜬다", () => {
  expect(show({ versions: null, muted: false }, ["u03"])).toBe(true);
  expect(show({ versions: null, muted: false }, [])).toBe(false);
  expect(show({ versions, muted: false }, ["u03"])).toBe(false);
  expect(show({ versions: { ...versions, u03: "2026-10-26.1" }, muted: false }, ["u03"])).toBe(
    true,
  );
  expect(show({ versions: { ...versions, u05: "2026-10-26.1" }, muted: false }, ["u03"])).toBe(
    false,
  );
  expect(show({ versions: null, muted: true }, ["u03"])).toBe(false);
  expect(show({ versions: null, muted: false }, ["u03"], false)).toBe(false);
});

test("UN3. 닫거나 맞추면 지금 버전을 통째로 적고, 끈 기록은 되돌리지 않는다", () => {
  expect(
    withCatalogUpdateNoticeVersions({ versions: null, muted: false }, versions, false),
  ).toEqual({
    versions,
    muted: false,
  });
  expect(
    withCatalogUpdateNoticeVersions({ versions: null, muted: false }, versions, true).muted,
  ).toBe(true);
  expect(
    withCatalogUpdateNoticeVersions({ versions: null, muted: true }, versions, false).muted,
  ).toBe(true);
});

test("UN4. 지금 버전과 기록이 다르거나 기록이 없으면 맞출 필요가 있다", () => {
  expect(catalogUpdateNoticeNeedsSync({ versions: null, muted: false }, versions)).toBe(true);
  expect(catalogUpdateNoticeNeedsSync({ versions, muted: false }, { ...versions })).toBe(false);
  expect(catalogUpdateNoticeNeedsSync({ versions, muted: false }, { u03: "2026-10-28.1" })).toBe(
    true,
  );
  expect(catalogUpdateNoticeNeedsSync({ versions, muted: false }, { ...versions, u06: "1" })).toBe(
    true,
  );
});
