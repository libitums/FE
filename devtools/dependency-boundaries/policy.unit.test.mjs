// `unit` 계층(DB-U1 ~ U7): 의존 방향 규칙의 순수 판정과 소스 훑기.

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  globalViolations,
  importViolations,
  isTestPath,
  layerOf,
  manifestViolations,
} from "./policy.mjs";
import { astroImports, scanSource } from "./scan-source.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ts = createRequire(path.join(repoRoot, "apps/mobile/package.json"))("typescript");

const workspaces = new Map([
  ["@libitums/episode-core", "packages/episode-core"],
  ["@libitums/ui-lynx", "packages/ui-lynx"],
  ["@libitums/mobile", "apps/mobile"],
  ["@libitums/landing", "apps/landing"],
]);
const rules = (list) => list.map((v) => v.rule);

test("DB-U1 층 — core 둘 · ui · apps는 app", () => {
  assert.equal(layerOf("packages/episode-core"), "core");
  assert.equal(layerOf("packages/companion-contract"), "core");
  assert.equal(layerOf("packages/ui-lynx"), "ui");
  assert.equal(layerOf("apps/landing"), "app");
});

test("DB-U2 package.json — 앱 의존 · core → ui · core → UI/어댑터 외부 패키지는 위반, core → core · 앱 → 패키지는 통과", () => {
  assert.deepEqual(
    rules(manifestViolations("packages/ui-lynx", ["@libitums/mobile"], workspaces)),
    ["D1"],
  );
  assert.deepEqual(rules(manifestViolations("apps/landing", ["@libitums/mobile"], workspaces)), [
    "D1",
  ]);
  assert.deepEqual(
    rules(
      manifestViolations(
        "packages/episode-core",
        ["@libitums/ui-lynx", "react", "@lynx-js/react"],
        workspaces,
      ),
    ),
    ["D1", "D1", "D1"],
  );
  assert.deepEqual(manifestViolations("packages/episode-core", ["zod"], workspaces), []);
  assert.deepEqual(
    manifestViolations(
      "apps/mobile",
      ["@libitums/episode-core", "@libitums/ui-lynx", "@lynx-js/react"],
      workspaces,
    ),
    [],
  );
});

test("DB-U3 import — 다른 workspace 상대 경로 · 앱 패키지 import는 어디서든 위반(테스트 포함)", () => {
  const base = { workspaceDir: "apps/landing", isTest: true, workspaces };
  const v = importViolations({
    ...base,
    imports: [
      { name: "../../mobile/src/lib/x", line: 3 },
      { name: "@libitums/mobile/whatever", line: 4 },
      { name: "./ok", line: 5 },
    ],
    resolveRelative: (name) => (name.startsWith("../../mobile") ? "apps/mobile" : "apps/landing"),
  });
  assert.deepEqual(
    v.map((x) => [x.rule, x.line]),
    [
      ["D2", 3],
      ["D2", 4],
    ],
  );
});

test("DB-U4 core import — Lynx · UI · 토큰 · 아이콘 · react · astro · supabase · node는 위반, 테스트 파일은 면제", () => {
  const names = [
    "@lynx-js/react",
    "@libitums/ui-lynx/button",
    "@libitums/design-tokens",
    "@libitums/icons/lynx/fire",
    "react",
    "astro:content",
    "@supabase/supabase-js",
    "node:fs",
    "zod/mini",
  ];
  const imports = names.map((name, i) => ({ name, line: i + 1 }));
  const base = { workspaceDir: "packages/episode-core", workspaces, resolveRelative: () => null };
  const v = importViolations({ ...base, isTest: false, imports });
  // astro:content는 "astro/" 접두가 아니라 통과 — 바깥 이름 규칙은 실제 패키지 이름 기준입니다.
  assert.deepEqual(
    v.map((x) => x.line),
    [1, 2, 3, 4, 5, 7, 8],
  );
  assert.deepEqual(importViolations({ ...base, isTest: true, imports }), []);
});

test("DB-U5 core 전역 — window · document · fetch · lynx 등은 위반, 테스트 · core 밖은 면제", () => {
  const globals = [
    { name: "window", line: 1 },
    { name: "fetch", line: 2 },
    { name: "lynx", line: 3 },
    { name: "Math", line: 4 },
  ];
  assert.deepEqual(
    globalViolations({ workspaceDir: "packages/companion-contract", isTest: false, globals }).map(
      (v) => v.line,
    ),
    [1, 2, 3],
  );
  assert.deepEqual(
    globalViolations({ workspaceDir: "packages/companion-contract", isTest: true, globals }),
    [],
  );
  assert.deepEqual(globalViolations({ workspaceDir: "apps/mobile", isTest: false, globals }), []);
});

test("DB-U6 소스 훑기 — 정적 · 동적 · re-export · require import, 전역 참조만(속성 이름 · 지역 선언 · 주석 · 문자열 제외)", () => {
  const text = [
    'import a from "x";',
    'export { b } from "y";',
    'const c = await import("z");',
    'const d = require("w");',
    "// window.alert(1)",
    'const s = "document.title";',
    "const obj = { window: 1 }; obj.window;",
    "function f(location) { return location; }",
    "navigator.language;",
    "typeof window;",
  ].join("\n");
  const { imports, globals } = scanSource(ts, "f.ts", text);
  assert.deepEqual(
    imports.map((i) => i.name),
    ["x", "y", "z", "w"],
  );
  const flagged = globals
    .map((g) => g.name)
    .filter((n) => ["window", "document", "location", "navigator"].includes(n));
  assert.deepEqual(flagged, ["navigator", "window"]);
});

test("DB-U7 테스트 경로 · astro import", () => {
  assert.equal(isTestPath("packages/episode-core/src/a.unit.test.ts"), true);
  assert.equal(isTestPath("apps/mobile/src/app/test-helpers/boot.tsx"), true);
  assert.equal(isTestPath("packages/episode-core/src/a.ts"), false);
  assert.deepEqual(
    astroImports(
      '---\nimport X from "../../mobile/src/a";\n---\n<script>import "@libitums/mobile";</script>',
    ).map((i) => i.name),
    ["../../mobile/src/a", "@libitums/mobile"],
  );
});
