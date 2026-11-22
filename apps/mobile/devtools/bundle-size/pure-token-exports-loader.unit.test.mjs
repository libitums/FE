import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { expect, test } from "vitest";

const require = createRequire(import.meta.url);
const pureTokenExportsLoader = require("./pure-token-exports-loader.cjs");
// 설치된 패키지 파일을 그대로 읽습니다 — 버전을 올려 모양이 바뀌면 여기서 먼저 섭니다.
const installed = readFileSync(require.resolve("@libitums/design-tokens"), "utf8");

test("PT1. 최상위 `export const … = deepFreeze(`마다 순수 표시가 붙는다", () => {
  const exportCalls = installed.match(/^export const \w+ = deepFreeze\(/gm) ?? [];
  const marked = pureTokenExportsLoader(installed);
  expect(exportCalls.length).toBeGreaterThan(0);
  expect(marked.match(/^export const \w+ = \/\*#__PURE__\*\/ deepFreeze\(/gm)).toHaveLength(
    exportCalls.length,
  );
});

test("PT2. 함수 본문의 재귀 호출은 그대로라 남는 묶음은 깊게 얼려진다", () => {
  const marked = pureTokenExportsLoader(installed);
  expect(marked.match(/^\s+deepFreeze\(child\);$/m)).not.toBeNull();
  expect(marked.match(/\/\*#__PURE__\*\/ deepFreeze\(child\)/)).toBeNull();
});

test("PT3. 패키지 모양이 바뀌어 표시할 곳이 없으면 던져 빌드를 멈춘다", () => {
  expect(() => pureTokenExportsLoader("export const color = Object.freeze({});")).toThrow(
    /deepFreeze/,
  );
});
