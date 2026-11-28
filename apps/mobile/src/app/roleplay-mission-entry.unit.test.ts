import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, test } from "vitest";

// 스위치가 꺼진 release 번들에서 미션 코드를 통째로 빼는 약속(ME, ADR-0193)입니다 — 빌드 상수 `__ROLEPLAY_MISSION_IN_BUNDLE__`
// (`lynx.config.ts`의 `defineDCE`)와 부수 효과 없는 입구(`roleplay-mission-entry.ts`). 실제로 빠졌는지는 release 번들을 grep해서
// 봅니다(성능 보고서 04). 여기서는 그 수단이 코드 모양으로 서 있는지를 지킵니다 — 미션 화면 쪽 모듈을 늘 번들에 드는 파일이 직접
// import하면 가지치기가 조용히 깨집니다.

const appDir = __dirname;
const srcDir = join(appDir, "..");

function productFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return productFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /(\.test\.|test-support|\.d\.ts$)/.test(entry.name))
      return [];
    return [path];
  });
}

const rel = (file: string): string => relative(srcDir, file).split(sep).join("/");
const code = (file: string): string =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

// 미션 쪽 파일 — 늘 번들에 드는 파일이 값으로 import해도 되는 것은 입구 둘 · 스위치 · 대기 판 규칙(순수 함수 하나)뿐입니다.
const MISSION_SIDE =
  /^(screens\/roleplay-mission\/|lib\/ui-copy-roleplay-mission(?!-list)|app\/(RoleplayMissionFlow|render-roleplay-mission|roleplay-mission-))/;
const LIST_SAFE = new Set([
  "screens/roleplay-mission/mission-report-ready",
  "screens/roleplay-mission/roleplay-mission-list-entry",
  "screens/roleplay-mission/roleplay-mission-ready",
  "app/roleplay-mission-entry",
]);

function valueImports(file: string): string[] {
  const source = code(file);
  const found: string[] = [];
  for (const match of source.matchAll(/^import (?!type )[^;]*? from "(\.[^"]+)";/gms)) {
    const target = rel(join(file, "..", match[1] ?? ""));
    found.push(target);
  }
  return found;
}

describe("ME 스위치가 꺼진 release에서 미션 코드는 입구 하나로만 닿는다", () => {
  test("ME-S1. 미션 쪽이 아닌 제품 파일은 미션 화면 모듈을 값으로 import하지 않는다(목록 카드 몫 · 입구만)", () => {
    const leaks = productFiles(srcDir)
      .filter((file) => !MISSION_SIDE.test(rel(file)))
      .flatMap((file) =>
        valueImports(file)
          .filter((target) => MISSION_SIDE.test(target) && !LIST_SAFE.has(target))
          .map((target) => `${rel(file)} → ${target}`),
      );
    expect(leaks).toEqual([]);
  });

  test("ME-S2. 입구를 부르는 곳은 둘이고 빌드 상수 삼항으로만 부른다", () => {
    const callers = productFiles(srcDir)
      .filter((file) => valueImports(file).includes("app/roleplay-mission-entry"))
      .map(rel)
      .sort();
    expect(callers).toEqual(["app/render-screen.tsx", "app/roleplay-sections.ts"]);
    expect(code(join(appDir, "render-screen.tsx"))).toContain(
      "__ROLEPLAY_MISSION_IN_BUNDLE__ ? renderRoleplayMission(screen, wiring) : null",
    );
    expect(code(join(appDir, "roleplay-sections.ts"))).toContain(
      "__ROLEPLAY_MISSION_IN_BUNDLE__ ? useRoleplayMissions() : null",
    );
  });

  test("ME-S2b. 목록 쪽 입구를 부르는 곳은 목록 화면 둘이고 빌드 상수로만 부른다", () => {
    const callers = productFiles(srcDir)
      .filter((file) =>
        valueImports(file).includes("screens/roleplay-mission/roleplay-mission-list-entry"),
      )
      .map(rel)
      .sort();
    expect(callers).toEqual([
      "screens/roleplay-list/RoleplayCard.tsx",
      "screens/roleplay-list/roleplay-list.ts",
    ]);
    for (const file of callers) {
      const source = code(join(srcDir, file));
      expect(source.match(/__ROLEPLAY_MISSION_IN_BUNDLE__/g)?.length ?? 0, file).toBeGreaterThan(0);
    }
  });

  test("ME-S3. lynx.config.ts는 스위치 파일을 읽어 빌드 상수를 정한다(dev이거나 스위치가 켜졌을 때)", () => {
    const config = readFileSync(join(srcDir, "..", "lynx.config.ts"), "utf8");
    expect(config).toContain("const missionInBundle = dev || roleplayMissionReady();");
    expect(config).toContain("__ROLEPLAY_MISSION_IN_BUNDLE__: JSON.stringify(missionInBundle)");
  });
});
