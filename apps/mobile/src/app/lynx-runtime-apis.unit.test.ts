import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { expect, test } from "vitest";

// `unit` 계층(LR1): Lynx 배경 스레드(PrimJS)에 없는 내장 API를 앱 코드가 쓰지 않는다. vitest(Node)에서는 있어서 테스트가 통과하지만
// 기기에서는 첫 화면을 불러오다 멈춥니다(2026-11-17 `Promise.allSettled` — 「loadCard failed: F.allSettled is not a function」).

const SRC = resolve(process.cwd(), "src");

/** 기기에 없는 API와 대신 쓸 것입니다. */
const MISSING: readonly { readonly pattern: RegExp; readonly instead: string }[] = [
  {
    pattern: /\bPromise\.allSettled\s*\(/,
    instead: "각 약속에 .then(ok, fail)을 붙여 끝남만 기다리기",
  },
  { pattern: /\bPromise\.any\s*\(/, instead: "Promise.race / 직접 모으기" },
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test("LR1 앱 코드는 Lynx 배경 스레드에 없는 Promise.allSettled · Promise.any를 쓰지 않는다", () => {
  const found: string[] = [];
  for (const path of walk(SRC)) {
    if (!/\.(ts|tsx)$/.test(path) || /\.test(-support)?\./.test(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const { pattern, instead } of MISSING) {
      if (pattern.test(text))
        found.push(`${relative(SRC, path)} — ${String(pattern)} → ${instead}`);
    }
  }
  expect(found).toEqual([]);
});
