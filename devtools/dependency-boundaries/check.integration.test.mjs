// `integration` 계층(DB-I1 · I2): 가짜 저장소(임시 폴더)에 규칙마다 위반을 하나씩 심고 check.mjs가 모두 잡아 종료 코드 1인지,
// 깨끗한 저장소는 0인지 봅니다. 실제 저장소 통과만으로는 「잡지 못해서 통과」와 구별되지 않기 때문입니다.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const checkPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "check.mjs");

function repo(files) {
  const root = mkdtempSync(path.join(tmpdir(), "boundaries-"));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), typeof body === "string" ? body : JSON.stringify(body));
  }
  return root;
}
const run = (root) =>
  spawnSync(process.execPath, [checkPath], {
    env: { ...process.env, BOUNDARIES_ROOT: root },
    encoding: "utf8",
  });

const clean = {
  "packages/episode-core/package.json": {
    name: "@libitums/episode-core",
    dependencies: { zod: "4" },
  },
  "packages/episode-core/src/a.ts":
    'import { z } from "zod/mini";\nexport const n = Math.max(1, 2);\n',
  "packages/episode-core/src/a.unit.test.ts": 'import { readFileSync } from "node:fs";\nwindow;\n',
  "packages/ui-lynx/package.json": {
    name: "@libitums/ui-lynx",
    dependencies: { "@lynx-js/react": "1" },
  },
  "packages/ui-lynx/src/b.tsx": 'import "@lynx-js/react";\n',
  "apps/mobile/package.json": {
    name: "@libitums/mobile",
    dependencies: { "@libitums/episode-core": "workspace:*" },
  },
  "apps/mobile/src/c.ts": 'import "@libitums/episode-core/episode";\nlocalStorage;\n',
  "apps/landing/package.json": { name: "@libitums/landing" },
  "apps/landing/src/d.astro": '---\nimport "@libitums/episode-core";\n---\n',
};

test("DB-I1 깨끗한 저장소는 통과(종료 0) — core 테스트 파일의 node · window, 앱의 localStorage는 허용", () => {
  const root = repo(clean);
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DB-I2 규칙마다 위반 하나씩 — 모두 잡고 종료 1", () => {
  const root = repo({
    ...clean,
    "packages/episode-core/package.json": {
      name: "@libitums/episode-core",
      dependencies: { zod: "4", "@libitums/ui-lynx": "workspace:*" },
    },
    "packages/episode-core/src/ui.ts":
      'import { Button } from "@libitums/ui-lynx/button";\nexport { Button };\n',
    "packages/episode-core/src/browser.ts": "export const lang = () => navigator.language;\n",
    "packages/episode-core/src/host.ts": "export const ping = () => fetch('/x');\n",
    "apps/landing/src/e.ts": 'import { x } from "../../mobile/src/c";\nexport { x };\n',
    "packages/ui-lynx/src/f.ts": 'import "@libitums/mobile";\n',
  });
  try {
    const result = run(root);
    assert.equal(result.status, 1);
    const out = result.stderr;
    assert.match(out, /packages\/episode-core\/package\.json D1 .*ui-lynx/);
    assert.match(out, /packages\/episode-core\/src\/ui\.ts:1 D3 /);
    assert.match(out, /packages\/episode-core\/src\/browser\.ts:1 D4 .*navigator/);
    assert.match(out, /packages\/episode-core\/src\/host\.ts:1 D4 .*fetch/);
    assert.match(out, /apps\/landing\/src\/e\.ts:1 D2 .*apps\/mobile/);
    assert.match(out, /packages\/ui-lynx\/src\/f\.ts:1 D2 .*@libitums\/mobile/);
    assert.match(out, /위반 6건/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
