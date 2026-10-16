import { afterEach, beforeEach, expect, test } from "vitest";
import { act } from "@lynx-js/react/testing-library";

import { CATALOG_FINAL_KEY } from "../lib/catalog-progress";
import { noStatBumps } from "../lib/stat-bump";
import {
  boot,
  env,
  flush,
  ok,
  setUp,
  snap,
  tearDown,
} from "./use-journey-progress.cache.test-support";

// `integration` 계층: 지표 칩의 「오르기 전 값」이 활동으로 오를 때만 서는가(ADR-0064). 불러오기(서버 · 저장본)로
// 맞춰진 값은 오름이 아닙니다 — 앱을 켤 때마다 칩이 움직이면 안 됩니다.

beforeEach(setUp);
afterEach(tearDown);

const passed = (episodeId: string) => ({ [episodeId]: [CATALOG_FINAL_KEY] });

test("SBI1. 서버에서 불러온 트로피는 표식을 남기지 않는다", async () => {
  env.load = async () => ok(snap({ catalogProgress: passed("ep-1") }));
  await boot();
  await flush();

  expect(env.progress.trophyCount).toBe(1);
  expect(env.progress.statBumps).toEqual(noStatBumps);
});

test("SBI2. 활동으로 트로피가 오르면 오르기 전 값을 남기고, 재생을 알리면 지운다", async () => {
  await boot();
  expect(env.progress.trophyCount).toBe(0);

  act(() => env.progress.setCatalogProgress(passed("ep-1")));
  await flush();
  expect(env.progress.trophyCount).toBe(1);
  expect(env.progress.statBumps).toEqual({ streak: null, trophy: 0 });
  expect(env.progress.wiring.statBumps).toEqual({ streak: null, trophy: 0 });

  act(() => env.progress.onStatBumped("trophy"));
  expect(env.progress.statBumps).toEqual(noStatBumps);
});

test("SBI3. 재생 전에 두 번 오르면 처음 값을 지킨다", async () => {
  await boot();

  act(() => env.progress.setCatalogProgress(passed("ep-1")));
  await flush();
  act(() => env.progress.setCatalogProgress({ ...passed("ep-1"), ...passed("ep-2") }));
  await flush();

  expect(env.progress.trophyCount).toBe(2);
  expect(env.progress.statBumps.trophy).toBe(0);
});
