import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  roleplayMissionAudioDevice,
  roleplayMissionSource,
  setRoleplayMissionForTest,
} from "./roleplay-mission-wiring";

// 미션 가짜 출처 · 가짜 기기 · fixture를 release 번들에서 빼는 약속(MD)입니다 — 탐침 화면(DP, ADR-0171)과 같은 수단:
// 번들러가 `__DEV__`를 상수로 바꿔 넣고, 부수 효과 없음 표시로 쓰이지 않는 import를 통째로 버립니다. 실제로 빠졌는지는
// release 번들을 grep해서 봅니다(성능 보고서). 여기서는 그 수단이 코드 모양으로 서 있는지와 `__DEV__`에 따른 갈림을 지킵니다.

const appDir = __dirname;
const srcDir = join(appDir, "..");
const FAKE_MODULES =
  /from "[^"]*\/(mission-fake-source|mission-fake-voice|mission-fake-rules|mission-fake-turn|mission-fake-scripts|mission-fixture)"/;

function productFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return productFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /(\.test\.|test-support|\.d\.ts$)/.test(entry.name))
      return [];
    return [path];
  });
}

afterEach(() => {
  setRoleplayMissionForTest(null);
  vi.unstubAllGlobals();
});

describe("MD 미션 가짜는 dev 빌드에만", () => {
  test("MD-S1. 가짜 · fixture를 import하는 제품 파일은 dev 전용 자리와 가짜끼리뿐이다", () => {
    const importers = productFiles(srcDir)
      .filter((file) => FAKE_MODULES.test(readFileSync(file, "utf8")))
      .map((file) => relative(srcDir, file).split(sep).join("/"))
      .filter((file) => !/^screens\/roleplay-mission\/mission-fake-/.test(file));
    expect(importers).toEqual(["app/roleplay-mission-dev-fakes.ts"]);
  });

  test("MD-S2. 결선은 dev 전용 자리를 `__DEV__ ?` 삼항으로만 부른다", () => {
    const wiring = readFileSync(join(appDir, "roleplay-mission-wiring.ts"), "utf8");
    expect(wiring).toContain("__DEV__ ? devMissionSource() : null");
    expect(wiring).toContain("__DEV__ ? devMissionAudioDevice() : null");
  });

  test("MD-U1. release(__DEV__ = false)에서는 빈 출처 — 목록이 비고 시작은 not_available", async () => {
    vi.stubGlobal("__DEV__", false);
    setRoleplayMissionForTest(null);
    const source = roleplayMissionSource();
    expect((await source.list()).missions).toEqual([]);
    expect(await source.start("u06-cafe")).toEqual({ kind: "rejected", code: "not_available" });
    expect(roleplayMissionAudioDevice().play("x", () => undefined)).toBe("unavailable");
  });

  test("MD-U2. dev(__DEV__ = true)에서는 가짜 출처 — 채점 대기 판 하나가 있다", async () => {
    vi.stubGlobal("__DEV__", true);
    setRoleplayMissionForTest(null);
    const list = await roleplayMissionSource().list();
    expect(list.missions.length).toBeGreaterThan(0);
    expect(list.pendingReports).toHaveLength(1);
  });
});
