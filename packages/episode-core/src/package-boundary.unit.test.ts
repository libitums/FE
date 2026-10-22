import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

// `unit` 계층: 패키지의 경계(무엇을 import하는가 · 무엇을 내보내는가)를 파일 글자로 고정합니다.
// Lynx · 앱 · node 모듈 없이 웹과 앱이 함께 읽을 수 있어야 합니다.

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(packageRoot, "src");

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.ts$/.test(entry.name) ? [full] : [];
  });

// 테스트 · 테스트 지원 파일은 경계 밖입니다(node:fs 등을 써도 된다).
const isTestFile = (file: string) => /\.(test|test-support)\.ts$/.test(file);
const toPosix = (file: string) => relative(packageRoot, file).split(sep).join("/");
const sourceFiles = () => walk(srcRoot).filter((file) => !isTestFile(file));

/** `from "x"` · `import "x"` · `import("x")`의 모듈 이름들. */
function importedModules(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(/(?:from\s+|import\s*\(?\s*)["']([^"']+)["']/g)) {
    if (match[1] !== undefined) names.push(match[1]);
  }
  return names;
}

describe("패키지 src 경계", () => {
  test("EC4. zod를 import하는 비테스트 파일은 와이어 스키마 셋뿐이다", () => {
    const importers = sourceFiles()
      // 스키마는 `zod/mini`를 쓴다 — 하위 경로도 zod import로 센다.
      .filter((file) =>
        importedModules(readFileSync(file, "utf8")).some(
          (name) => name === "zod" || name.startsWith("zod/"),
        ),
      )
      .map(toPosix)
      .sort();
    expect(importers).toEqual([
      "src/episode/episode-content.schema-items.ts",
      "src/episode/episode-content.schema-parts.ts",
      "src/episode/episode-content.schema.ts",
    ]);
  });

  test("EC4. Lynx · UI · node · 앱 경로 import가 없다", () => {
    const forbidden = (name: string) =>
      name.startsWith("@lynx-js/") ||
      name.startsWith("@libitums/ui-lynx") ||
      name.startsWith("node:") ||
      name.includes("apps/");
    const offenders = sourceFiles().flatMap((file) =>
      importedModules(readFileSync(file, "utf8"))
        .filter(forbidden)
        .map((name) => `${toPosix(file)} → ${name}`),
    );
    expect(offenders).toEqual([]);
  });

  // 디코더(zod를 끌고 오는 입구)만 메인 스레드 표식을 단다 — Lynx lepus 조건에서는 던지고, 웹 · node에서는 빈 모듈입니다.
  test("EC4. background-only를 import하는 파일은 디코더 episode-content.ts 하나이고 첫 줄이다", () => {
    const importers = sourceFiles()
      .filter((file) => importedModules(readFileSync(file, "utf8")).includes("background-only"))
      .map(toPosix);
    expect(importers).toEqual(["src/episode/episode-content.ts"]);
    const firstLine = readFileSync(join(srcRoot, "episode/episode-content.ts"), "utf8").split(
      "\n",
    )[0];
    expect(firstLine).toBe('import "background-only";');
  });

  test("EC4. ./lines 입구의 import 그래프에는 zod도 background-only도 없다", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      exports: Record<string, { default?: string } | string>;
    };
    const entry = manifest.exports["./lines"];
    const target = typeof entry === "string" ? entry : entry?.default;
    expect(target).toBe("./src/episode/lines.ts");
    const seen = new Set<string>();
    const external = new Set<string>();
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const text = readFileSync(file, "utf8");
      // `import type` · `export type`은 런타임 그래프에 들지 않는다
      const runtime = text.replace(/^(?:import|export)\s+type\b[\s\S]*?;\s*$/gm, "");
      for (const name of importedModules(runtime)) {
        if (name.startsWith(".")) {
          const base = resolve(dirname(file), name);
          visit(existsSync(`${base}.ts`) ? `${base}.ts` : join(base, "index.ts"));
        } else external.add(name);
      }
    };
    visit(join(packageRoot, target ?? "missing"));
    expect([...seen].map(toPosix).some((file) => file.includes("schema"))).toBe(false);
    expect(
      [...external].filter(
        (name) => name === "zod" || name.startsWith("zod/") || name === "background-only",
      ),
    ).toEqual([]);
  });

  test("EC4. ./lines는 ./episode와 같은 EPISODE_SELF_SPEAKER · roleplayLinesOf 참조를 내보낸다", async () => {
    const episode = await import("./episode/index");
    const lines = (await import("./episode/lines")) as Record<string, unknown>;
    expect(Object.keys(lines).sort()).toEqual(["EPISODE_SELF_SPEAKER", "roleplayLinesOf"]);
    expect(lines["EPISODE_SELF_SPEAKER"]).toBe(episode.EPISODE_SELF_SPEAKER);
    expect(lines["roleplayLinesOf"]).toBe(episode.roleplayLinesOf);
  });

  test("EC4. 전역 NativeModules · lynx 참조가 없다(주석 제외)", () => {
    const code = (file: string) =>
      readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const offenders = sourceFiles()
      .filter((file) => /\bNativeModules\b|\blynx\./.test(code(file)))
      .map(toPosix);
    expect(offenders).toEqual([]);
  });
});

describe("package.json", () => {
  const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
    name: string;
    private: boolean;
    exports: Record<string, unknown>;
    dependencies: Record<string, string>;
  };

  test("EC5. exports 키는 subpath 다섯 + package.json이고 와일드카드가 없다", () => {
    expect(Object.keys(manifest.exports).sort()).toEqual(
      ["./content-url", "./episode", "./judge", "./lines", "./package.json", "./shuffle"].sort(),
    );
    expect(Object.keys(manifest.exports).some((key) => key.includes("*"))).toBe(false);
  });

  test("EC5. 각 subpath가 가리키는 파일이 있다", () => {
    for (const [key, target] of Object.entries(manifest.exports)) {
      const paths =
        typeof target === "string" ? [target] : Object.values(target as Record<string, string>);
      for (const path of paths) {
        expect(existsSync(join(packageRoot, path)), `${key} → ${path}`).toBe(true);
      }
    }
  });

  test("EC5. 이름 · private · zod 정확 버전", () => {
    expect(manifest.name).toBe("@libitums/episode-core");
    expect(manifest.private).toBe(true);
    expect(manifest.dependencies["zod"]).toBe("4.6.5");
    // 앱(apps/mobile)과 같은 정확 버전 — 웹 · node는 빈 기본값으로 풀린다
    expect(manifest.dependencies["background-only"]).toBe("0.0.1");
  });
});
