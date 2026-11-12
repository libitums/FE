import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

// 이 패키지는 Lynx 앱 · Deno(Edge Function 사본) · Node(테스트) 셋이 같은 글자를 읽습니다. 셋 모두에 있는 것만 써야 합니다.

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(packageRoot, "src");
const toPosix = (file: string) => relative(packageRoot, file).split(sep).join("/");
const sourceFiles = () =>
  readdirSync(srcRoot)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => join(srcRoot, name));

const importedModules = (text: string) =>
  [...text.matchAll(/(?:from\s+|import\s*\(?\s*)["']([^"']+)["']/g)].map((match) => match[1] ?? "");

// CB1 — 외부 모듈은 `zod/mini` 하나입니다. 사본을 Deno가 읽을 때 import map에 이을 이름이 그것뿐이어야 합니다.
test("CB1. 비테스트 파일의 외부 import는 zod/mini뿐이다", () => {
  const external = sourceFiles().flatMap((file) =>
    importedModules(readFileSync(file, "utf8"))
      .filter((name) => !name.startsWith("./"))
      .filter((name) => name !== "zod/mini")
      .map((name) => `${toPosix(file)} → ${name}`),
  );
  expect(external).toEqual([]);
});

// CB2 — Node 전역 · Deno 전역 · Lynx 전역은 셋 중 하나에만 있습니다. 쓰면 다른 소비자에서 조용히 깨집니다.
test("CB2. Node · Deno · Lynx 전역을 쓰지 않는다(주석 제외)", () => {
  const offenders = sourceFiles().filter((file) => {
    const code = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    return /\b(process|Buffer|Deno|NativeModules|lynx)\b/.test(code);
  });
  expect(offenders.map(toPosix)).toEqual([]);
});

test("CB3. 하위 폴더가 없다 — 사본 생성이 한 폴더만 옮긴다", () => {
  expect(
    readdirSync(srcRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()),
  ).toEqual([]);
});
