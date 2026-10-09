// `lint:motion` 명령 자체가 통합 경계입니다 — check.mjs를 자식 프로세스로 돌려 종료 코드와 출력을 봅니다.
// check.mjs는 대상 루트를 `이 파일 위치 ../..`로 정하므로, 위반을 만드는 케이스는 임시 디렉터리에
// check/policy/scan을 복사해 거기를 루트로 삼습니다. 저장소 파일은 건드리지 않습니다.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const roots = ["apps/mobile/src", "packages/ui-lynx/src", "apps/storybook-lynx/src"];
const narrativeBackground = "apps/mobile/src/screens/episode-narrative/narrative-background.css";

function runCheck(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/** 임시 루트에 도구 셋을 복사하고 allowlist를 주어진 JSON으로 둡니다. */
function makeSandbox(allowlist) {
  const sandbox = mkdtempSync(path.join(tmpdir(), "motion-literals-"));
  const toolDir = path.join(sandbox, "devtools/motion-literals");
  mkdirSync(toolDir, { recursive: true });
  for (const file of ["check.mjs", "policy.mjs", "scan.mjs", "scan-source.mjs"]) {
    copyFileSync(path.join(here, file), path.join(toolDir, file));
  }
  writeFileSync(path.join(toolDir, "allowlist.json"), JSON.stringify(allowlist));
  // check.mjs는 apps/mobile 아래 의존성에서 typescript를 풀므로 샌드박스에도 같은 자리를 이어 둡니다.
  mkdirSync(path.join(sandbox, "apps/mobile"), { recursive: true });
  symlinkSync(
    path.join(repoRoot, "apps/mobile/node_modules"),
    path.join(sandbox, "apps/mobile/node_modules"),
  );
  return { sandbox, script: path.join(toolDir, "check.mjs") };
}

function makeEmptyRoots(sandbox) {
  for (const root of roots) {
    mkdirSync(path.join(sandbox, root), { recursive: true });
  }
}

test("[LM1] 저장소 전체에 lint:motion을 돌리면 exit 0이다", () => {
  const { status, output } = runCheck(path.join(here, "check.mjs"));
  assert.equal(status, 0, output);
});

test("[LM1] allowlist는 narrative-background.css 한 건이고 그 파일은 실제로 존재한다", () => {
  const allowlist = JSON.parse(readFileSync(path.join(here, "allowlist.json"), "utf8"));
  assert.deepEqual(
    allowlist.map((entry) => entry.path),
    [narrativeBackground],
  );
  assert.ok(readFileSync(path.join(repoRoot, narrativeBackground), "utf8").length > 0);
});

test("[LM2] 리터럴 duration · cubic-bezier · easing 키워드 · @media 각각이 exit 1과 규칙 이름을 낸다", () => {
  const cases = [
    { css: ".a { transition: opacity 150ms; }", rule: "time-literal" },
    {
      css: ".a { transition: opacity var(--libitum-x) cubic-bezier(0.2, 0, 0, 1); }",
      rule: "easing-function",
    },
    { css: ".a { animation: spin var(--libitum-x) ease-out; }", rule: "easing-keyword" },
    { css: "@media (prefers-reduced-motion: reduce) { .a { color: red; } }", rule: "media-query" },
  ];
  for (const { css, rule } of cases) {
    const { sandbox, script } = makeSandbox([]);
    try {
      makeEmptyRoots(sandbox);
      writeFileSync(path.join(sandbox, "packages/ui-lynx/src/probe.css"), css);
      const { status, output } = runCheck(script);
      assert.equal(status, 1, `${rule}: ${output}`);
      assert.match(output, new RegExp(`packages/ui-lynx/src/probe\\.css:1 ${rule} — `), output);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }
});

test("[LM2] 모션 토큰 참조만 쓴 CSS는 통과한다(오탐 없음)", () => {
  const { sandbox, script } = makeSandbox([]);
  try {
    makeEmptyRoots(sandbox);
    writeFileSync(
      path.join(sandbox, "packages/ui-lynx/src/probe.css"),
      ".a { transition: opacity var(--libitum-motion-duration-d3) var(--libitum-motion-easing-standard); }",
    );
    const { status, output } = runCheck(script);
    assert.equal(status, 0, output);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("[LM3] allowlist에서 narrative-background.css를 빼면 그 파일의 선언 10개의 위반으로 exit 1이다", () => {
  const { sandbox, script } = makeSandbox([]);
  try {
    for (const root of roots) {
      const target = path.join(sandbox, root);
      mkdirSync(path.dirname(target), { recursive: true });
      symlinkSync(path.join(repoRoot, root), target);
    }
    const { status, output } = runCheck(script);
    assert.equal(status, 1, output);
    const lines = output.split("\n").filter((line) => line.startsWith("- "));
    for (const line of lines) {
      assert.ok(line.startsWith(`- ${narrativeBackground}:`), line);
    }
    // 선언 10개(줄 10개)에서 time-literal · easing-keyword가 한 줄에 둘씩 나올 수 있다.
    const declarationLines = new Set(lines.map((line) => line.match(/css:(\d+) /)?.[1]));
    assert.equal(declarationLines.size, 10, output);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("[LM4] lint 사슬은 lint:motion을, test 사슬은 test:motion-literals를 부른다", () => {
  const { scripts } = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const chain = (name) => scripts[name].split("&&").map((part) => part.trim());
  assert.ok(chain("lint").includes("pnpm lint:motion"));
  assert.ok(chain("test").includes("pnpm test:motion-literals"));
  assert.equal(scripts["lint:motion"], "node devtools/motion-literals/check.mjs");
  assert.match(scripts["test:motion-literals"], /devtools\/motion-literals\/\*\.test\.mjs/);
});
