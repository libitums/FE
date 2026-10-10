import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { scrollBarReport } from "./tree.mjs";

// typescript는 루트에 없어 apps/mobile의 것을 받아 인자로 넘깁니다.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(repoRoot, "apps/mobile/package.json"));
const ts = require("typescript");

const roots = ["apps/mobile/src", "packages/ui-lynx/src", "apps/storybook-lynx/src"];
const sandboxes = [];

after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

// 세 루트를 가진 임시 저장소를 만들고 `apps/mobile/src` 아래에 파일을 놓습니다.
function sandbox(files = {}, { skipRoots = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "scroll-regions-"));
  sandboxes.push(dir);
  for (const root of roots) {
    if (!skipRoots.includes(root)) mkdirSync(path.join(dir, root), { recursive: true });
  }
  for (const [relative, text] of Object.entries(files)) {
    const target = path.join(dir, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
  return dir;
}

// 스크롤 요소가 3째 줄에서 시작하는 한 파일입니다.
const screenWith = (attributes) =>
  [
    "export const A = () => (",
    "  <view>",
    `    <scroll-view scroll-orientation="vertical"${attributes} />`,
    "  </view>",
    ");",
    "",
  ].join("\n");

const compliant = screenWith(" scroll-bar-enable={false}");
const FILE = "apps/mobile/src/A.tsx";

// SI1 — 실제 저장소는 위반 0건이고, 빈 스캔이 아니어야 합니다.
test("SI1. 실제 저장소: failures가 비고 스크롤 요소가 28개 이상이다", () => {
  const report = scrollBarReport(repoRoot, ts);

  assert.deepEqual(report.failures, []);
  assert.ok(report.elements >= 28, `스크롤 요소 ${report.elements}개 — 28개 이상이어야 한다`);
});

// SI2
test("SI2. 규칙을 지킨 파일 하나: failures가 비고 elements 1", () => {
  const report = scrollBarReport(sandbox({ [FILE]: compliant }), ts);

  assert.deepEqual(report.failures, []);
  assert.equal(report.elements, 1);
});

// SI3~SI6 — 변이 넷: 임시 사본에서 한 곳을 어긴다.
for (const [id, label, attributes] of [
  ["SI3", "변이 ① 속성을 지운다", ""],
  ["SI4", "변이 ② {true}로 바꾼다", " scroll-bar-enable={true}"],
  ["SI5", "변이 ③ {flag}로 바꾼다", " scroll-bar-enable={flag}"],
  ["SI6", "변이 ④ {...rest}를 더한다", " scroll-bar-enable={false} {...rest}"],
]) {
  test(`${id}. ${label}: failures 1줄이 ${FILE}:3으로 시작한다`, () => {
    const report = scrollBarReport(sandbox({ [FILE]: screenWith(attributes) }), ts);

    assert.equal(report.failures.length, 1, JSON.stringify(report.failures));
    assert.ok(report.failures[0].startsWith(`${FILE}:3 `), report.failures[0]);
  });
}

// SI6b — 스프레드가 글자 그대로의 false 스위치 앞이면 통과하고, 스위치가 없는 스프레드만 있으면 실패한다.
test("SI6b. {...rest}가 scroll-bar-enable={false} 앞에 있으면 failures가 비다", () => {
  const report = scrollBarReport(
    sandbox({ [FILE]: screenWith(" {...rest} scroll-bar-enable={false}") }),
    ts,
  );

  assert.deepEqual(report.failures, []);
  assert.equal(report.elements, 1);
});

test("SI6c. 스프레드만 있고 scroll-bar-enable이 없으면 failures가 있다", () => {
  const report = scrollBarReport(sandbox({ [FILE]: screenWith(" {...rest}") }), ts);

  assert.ok(report.failures.length >= 1, JSON.stringify(report.failures));
  assert.ok(report.failures.every((line) => line.startsWith(`${FILE}:3 `)));
});

// SI7
test("SI7. 세 루트가 있어도 스크롤 요소가 0이면 빈 스캔을 알리는 1줄이 난다", () => {
  const report = scrollBarReport(
    sandbox({ "apps/mobile/src/B.tsx": "export const B = () => <view><text /></view>;\n" }),
    ts,
  );

  assert.equal(report.elements, 0);
  assert.equal(report.failures.length, 1, JSON.stringify(report.failures));
  assert.ok(report.failures[0].includes("empty-scan"), report.failures[0]);
});

// SI8
test("SI8. 테스트 파일의 {true}는 세지 않는다", () => {
  const report = scrollBarReport(
    sandbox({
      [FILE]: compliant,
      "apps/mobile/src/A.ui.test.tsx": screenWith(" scroll-bar-enable={true}"),
    }),
    ts,
  );

  assert.deepEqual(report.failures, []);
  assert.equal(report.elements, 1);
});

// SI9
test("SI9. 루트 폴더 하나가 없으면 던지지 않고 그 루트 이름을 담은 1줄이 난다", () => {
  const missingRoot = "packages/ui-lynx/src";
  const dir = sandbox({ [FILE]: compliant }, { skipRoots: [missingRoot] });

  let report;
  assert.doesNotThrow(() => {
    report = scrollBarReport(dir, ts);
  });
  assert.equal(report.failures.length, 1, JSON.stringify(report.failures));
  assert.ok(report.failures[0].includes(missingRoot), report.failures[0]);
});

// SI10
test("SI10. check.mjs를 실제 저장소에 돌리면 exit 0이고 stderr가 빈다", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "devtools/scroll-regions/check.mjs")],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
});

// SI11 — 결선
test("SI11. package.json: lint:scroll-bars가 check.mjs를 부르고 lint · test가 이를 부른다", () => {
  const { scripts } = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

  assert.ok(scripts["lint:scroll-bars"]?.includes("devtools/scroll-regions/check.mjs"));
  assert.ok(scripts.lint.includes("pnpm lint:scroll-bars"));
  assert.ok(scripts.test.includes("pnpm test:scroll-regions"));
});
