import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

// 배포 구성 검사: 함수마다 `index.ts`에서 상대 import를 따라가 모은 외부 이름(`zod/mini` · `@anthropic-ai/sdk` …)이 그 함수 폴더의
// `deno.json` imports에 있어야 한다. 없으면 `supabase functions deploy`가 번들을 만들 때 이름을 풀지 못한다(Node 테스트는 node_modules로
// 풀려 통과해 버린다). `node:` · `npm:` · `jsr:` · `https:` 지정자는 그대로 풀리므로 보지 않는다.

const functionsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const specifiers = (text: string) =>
  [...text.matchAll(/(?:^|\n)\s*(?:import|export)[^"';]*?from\s+["']([^"']+)["']/g)].map(
    (match) => match[1] ?? "",
  );
const runtimeSpecifier = /^(node:|npm:|jsr:|https?:)/;

function externalImports(entry: string): Set<string> {
  const seen = new Set<string>();
  const out = new Set<string>();
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const name of specifiers(readFileSync(file, "utf8"))) {
      if (name.startsWith(".")) walk(resolve(dirname(file), name));
      else if (!runtimeSpecifier.test(name)) out.add(name);
    }
  };
  walk(entry);
  return out;
}

const functionDirs = readdirSync(functionsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(functionsRoot, name, "index.ts")))
  .sort();

test.each(functionDirs)("FI1. %s의 외부 import는 모두 그 폴더 deno.json에 있다", (name) => {
  const needed = [...externalImports(join(functionsRoot, name, "index.ts"))].sort();
  const mapPath = join(functionsRoot, name, "deno.json");
  const imports: Record<string, string> = existsSync(mapPath)
    ? ((JSON.parse(readFileSync(mapPath, "utf8")) as { imports?: Record<string, string> })
        .imports ?? {})
    : {};
  const missing = needed.filter(
    (spec) =>
      !(spec in imports) &&
      !Object.keys(imports).some((key) => key.endsWith("/") && spec.startsWith(key)),
  );
  expect(missing).toEqual([]);
});

test("FI2. 미션 함수 다섯이 검사 대상에 들어 있다", () => {
  expect(functionDirs).toEqual(
    expect.arrayContaining([
      "mission-start",
      "mission-hint",
      "mission-finish",
      "mission-stt",
      "mission-tts",
    ]),
  );
});
