import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

// 소스 검사 — 코드 모양으로만 지킬 수 있는 약속입니다. 계획 id SC2(동기화) · SC3(데이터 계층 새 파일).
// 화면 쪽 새 파일(SC1 · SC3의 화면 부분)은 화면 단계의 테스트가 이어서 봅니다.

const appDir = __dirname;
const read = (name: string): string => readFileSync(join(appDir, name), "utf8");

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("SC2 journey-progress-sync 소스", () => {
  const source = withoutComments(read("journey-progress-sync.ts"));

  test("SC2. 재시도 간격은 그대로다", () => {
    expect(source).toContain("retryDelays = [1_000, 5_000, 15_000, 30_000, 60_000]");
  });

  test("SC2. 저장 판정을 JSON 비교로 하지 않는다", () => {
    expect(source).not.toContain("observedJson === jsonFrom(server)");
  });

  test("SC2. 미전송 지우기 호출마다 그 앞에 저장본 쓰기가 있다(두 자리 모두)", () => {
    const clears = [...source.matchAll(/clearPendingProgress\(/g)].map((m) => m.index ?? 0);
    const writes = [...source.matchAll(/writeCachedProgress\(/g)].map((m) => m.index ?? 0);
    expect(clears.length).toBeGreaterThanOrEqual(2);
    clears.forEach((clearAt, index) => {
      const from = index === 0 ? -1 : (clears[index - 1] ?? -1);
      expect(writes.some((writeAt) => writeAt > from && writeAt < clearAt)).toBe(true);
    });
  });
});

const dataFiles = [
  "progress-load.ts",
  "progress-load.contract.ts",
  "cached-learning-progress.ts",
  "use-progress-load.ts",
  "use-progress-load-events.ts",
];
const wiringFiles = ["AppSession.tsx", "render-screen.tsx", "screen-wiring.ts"];

describe("SC3 데이터 계층 새 파일", () => {
  test.each(dataFiles)("SC3. %s — 한글 문자열 리터럴 · .agent-harness 없음, 300줄 이하", (name) => {
    const raw = read(name);
    expect(raw).not.toContain(".agent-harness");
    expect(withoutComments(raw)).not.toMatch(/(["'`])(?:(?!\1)[^\\\n]|\\.)*[가-힣]/);
    expect(raw.trimEnd().split("\n").length).toBeLessThanOrEqual(300);
  });

  test.each(wiringFiles)("SC3. %s — 300줄 이하", (name) => {
    expect(read(name).trimEnd().split("\n").length).toBeLessThanOrEqual(300);
  });
});
