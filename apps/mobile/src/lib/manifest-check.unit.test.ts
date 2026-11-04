import { expect, test } from "vitest";

import { MANIFEST_STALE_AFTER_MS, catalogFreshness, manifestCheckedAtFrom } from "./manifest-check";

// `unit` 계층: 목록 확인 시각과 신선도(ADR-0095 D9)입니다.

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 4, 12);

test("MC1. 저장값은 양의 정수만 읽고 나머지는 null이다", () => {
  expect(manifestCheckedAtFrom(String(NOW))).toBe(NOW);
  for (const bad of [null, "", "abc", "-5", "0", "1.5e", "NaN"]) {
    expect(manifestCheckedAtFrom(bad)).toBeNull();
  }
});

test("MC2. 확인한 적이 없으면 오래된 것이고 며칠 전인지 모른다", () => {
  expect(catalogFreshness(null, NOW)).toEqual({ stale: true, daysAgo: null });
});

test("MC3. 3일 안이면 신선하고, 3일이 지나면 오래됐다 — 며칠 전은 내림", () => {
  expect(catalogFreshness(NOW - 1000, NOW)).toEqual({ stale: false, daysAgo: 0 });
  expect(catalogFreshness(NOW - DAY - 1000, NOW)).toEqual({ stale: false, daysAgo: 1 });
  expect(catalogFreshness(NOW - MANIFEST_STALE_AFTER_MS + 1, NOW)).toEqual({
    stale: false,
    daysAgo: 2,
  });
  expect(catalogFreshness(NOW - MANIFEST_STALE_AFTER_MS, NOW)).toEqual({ stale: true, daysAgo: 3 });
  expect(catalogFreshness(NOW - 10 * DAY, NOW)).toEqual({ stale: true, daysAgo: 10 });
});

test("MC4. 시계가 거꾸로면(미래 기록) 신선하고 0일 전이다", () => {
  expect(catalogFreshness(NOW + DAY, NOW)).toEqual({ stale: false, daysAgo: 0 });
});
