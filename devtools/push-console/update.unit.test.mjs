import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appVersionsFrom,
  DEFAULT_TARGET_BUILDS,
  needsUpdate,
  normalizeTargets,
  storeNameFor,
  targetsProblems,
  UPDATE_SEGMENT,
  updatedCondition,
} from "./update.mjs";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("PC-U1. 목표 빌드 — 기본은 Android만, 정수만 받고 빈칸 · 이상한 값은 그 플랫폼을 뺀다", () => {
  assert.equal(UPDATE_SEGMENT, "update-available");
  assert.deepEqual(DEFAULT_TARGET_BUILDS, { android: 23, ios: null });
  assert.deepEqual(normalizeTargets(undefined), DEFAULT_TARGET_BUILDS);
  assert.deepEqual(normalizeTargets({ android: "24", ios: "" }), { android: 24, ios: null });
  assert.deepEqual(normalizeTargets({ android: 0, ios: 25 }), { android: null, ios: 25 });
  assert.deepEqual(normalizeTargets({ android: "1; DROP", ios: 2.5 }), {
    android: null,
    ios: null,
  });
  assert.deepEqual(targetsProblems({ android: null, ios: null }), [
    "목표 빌드를 Android · iOS 중 하나는 적어 주세요.",
  ]);
  assert.deepEqual(targetsProblems({ android: 23, ios: null }), []);
});

test("PC-U2. 업데이트 대상 — 그 플랫폼의 마지막 빌드가 목표보다 낮을 때만(본 적 없으면 빼기)", () => {
  const targets = { android: 23, ios: null };
  assert.equal(needsUpdate({ platform: "android", appBuild: 14 }, targets), true);
  assert.equal(needsUpdate({ platform: "android", appBuild: 23 }, targets), false);
  assert.equal(needsUpdate({ platform: "android", appBuild: 24 }, targets), false);
  assert.equal(needsUpdate({ platform: "ios", appBuild: 15 }, targets), false); // iOS 목표 없음
  assert.equal(needsUpdate({ platform: "ios", appBuild: 15 }, { android: 23, ios: 24 }), true);
  assert.equal(needsUpdate({ platform: null, appBuild: null }, targets), false);
  assert.equal(needsUpdate({}, targets), false);
});

test("PC-U3. 스토어 이름은 플랫폼으로 — 모르면 Google Play(기기 대부분이 Android)", () => {
  assert.equal(storeNameFor("ios"), "App Store");
  assert.equal(storeNameFor("android"), "Google Play");
  assert.equal(storeNameFor(null), "Google Play");
});

test("PC-U4. PostHog 행 → 사람마다 마지막 플랫폼 · 빌드 · 버전(숫자가 아닌 빌드 · uuid가 아닌 id는 버림)", () => {
  const versions = appVersionsFrom([
    [id(1), "android", "14", "1.3.0", "2026-11-17T10:00:00"],
    [id(2), "ios", 15, "1.0.0", "2026-11-16T10:00:00Z"],
    [id(3), "android", "abc", "1.3.0", "2026-11-16T10:00:00"],
    ["anon-device-id", "android", "14", "1.3.0", "2026-11-16T10:00:00"],
    [id(4), "web", "3", "1.0.0", "2026-11-16T10:00:00"],
  ]);
  assert.deepEqual(
    [...versions],
    [
      [
        id(1),
        {
          platform: "android",
          appBuild: 14,
          appVersion: "1.3.0",
          seenMs: Date.UTC(2026, 10, 17, 10),
        },
      ],
      [
        id(2),
        { platform: "ios", appBuild: 15, appVersion: "1.0.0", seenMs: Date.UTC(2026, 10, 16, 10) },
      ],
    ],
  );
});

test("PC-U5. 업데이트함 조건(HogQL) — 플랫폼마다 목표 이상, 목표 없는 플랫폼은 빠진다", () => {
  assert.equal(
    updatedCondition({ android: 23, ios: null }),
    "(properties.platform = 'android' AND toIntOrNull(toString(properties.appBuild)) >= 23)",
  );
  assert.equal(
    updatedCondition({ android: 23, ios: 24 }),
    "(properties.platform = 'android' AND toIntOrNull(toString(properties.appBuild)) >= 23) OR " +
      "(properties.platform = 'ios' AND toIntOrNull(toString(properties.appBuild)) >= 24)",
  );
  assert.equal(updatedCondition({ android: null, ios: null }), null);
  // 정수가 아닌 값은 질의에 들어가지 않는다.
  assert.equal(updatedCondition({ android: "1 OR 1=1", ios: null }), null);
});
