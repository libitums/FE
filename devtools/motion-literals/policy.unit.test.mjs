import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { allowlistProblems, loadAllowlist, stripTokenReferences, violationsIn } from "./policy.mjs";

const file = "x.css";
const rules = (css) => violationsIn(css, file).map(({ rule }) => rule);

test("PO1. 시간 리터럴을 time-literal로 잡는다", () => {
  const found = violationsIn(
    ".a { transition: opacity 150ms var(--libitum-motion-easing-easing); }",
    file,
  );
  assert.equal(found.length, 1);
  assert.equal(found[0].rule, "time-literal");
  assert.equal(found[0].text, "150ms");
});

test("PO2. cubic-bezier()는 easing-function 한 건이다", () => {
  const found = violationsIn(
    ".a { animation: x var(--libitum-motion-duration-d2) cubic-bezier(0.35, 0, 0.35, 1) both; }",
    file,
  );
  assert.deepEqual(
    found.map(({ rule }) => rule),
    ["easing-function"],
  );
});

for (const keyword of ["ease", "ease-in", "ease-out", "ease-in-out", "linear"]) {
  test(`PO3. 키워드 ${keyword}는 easing-keyword 한 건이다`, () => {
    assert.deepEqual(
      rules(`.a { transition: opacity var(--libitum-motion-duration-d2) ${keyword}; }`),
      ["easing-keyword"],
    );
  });
}

test("PO3. 토큰 참조 안의 linear와 animation-name 안의 linear는 대상 밖이다", () => {
  assert.deepEqual(
    rules(
      ".a { transition: opacity var(--libitum-motion-duration-d2) var(--libitum-motion-easing-linear); }",
    ),
    [],
  );
  assert.deepEqual(rules(".a { animation-name: fade-linear-x; }"), []);
});

test("PO4. @media는 media-query 한 건이다", () => {
  assert.deepEqual(rules("@media (prefers-reduced-motion: reduce) { .a { color: red; } }"), [
    "media-query",
  ]);
});

test("PO5. none · fallback 있는 참조 · 대상 밖 속성은 위반이 아니다", () => {
  const css = [
    ".a { transition: none; }",
    ".b { transition: opacity var(--libitum-motion-duration-d2, 100ms) var(--libitum-motion-easing-linear); }",
    ".c { animation-fill-mode: both; }",
    ".d { display: linear; }",
    ".e { background-image: linear-gradient(red, blue); }",
  ].join("\n");
  assert.deepEqual(violationsIn(css, file), []);
});

test("PO5. stripTokenReferences는 fallback 포함 참조를 지운다", () => {
  const stripped = stripTokenReferences("opacity var(--libitum-motion-duration-d2, 100ms) 5ms");
  assert.ok(!stripped.includes("100ms"));
  assert.ok(!stripped.includes("var("));
  assert.ok(stripped.includes("5ms"));
});

test("PO6. 주석 안의 리터럴과 @media는 위반이 아니다", () => {
  const css =
    "/* 150ms ease @media prefers-reduced-motion */ .a { transition: opacity var(--libitum-motion-duration-d2) var(--libitum-motion-easing-easing); }";
  assert.deepEqual(violationsIn(css, file), []);
});

test("PO7. allowlistProblems: 정상이면 비고, 파일이 없거나 위반이 0이면 한 건씩 돌려준다", () => {
  const violation = { line: 1, rule: "time-literal", text: "150ms" };
  assert.deepEqual(
    allowlistProblems([{ path: "x.css" }], new Set(["x.css"]), { "x.css": [violation] }),
    [],
  );
  assert.equal(allowlistProblems([{ path: "x.css" }], new Set(), {}).length, 1);
  assert.equal(
    allowlistProblems([{ path: "x.css" }], new Set(["x.css"]), { "x.css": [] }).length,
    1,
  );
});

test("PO7. loadAllowlist는 모양이 틀리면 던진다", () => {
  assert.throws(() => loadAllowlist("[{}]"));
});

test("PO8. 실제 allowlist.json은 검증을 통과하고 항목이 하나다", () => {
  const json = readFileSync(new URL("./allowlist.json", import.meta.url), "utf8");
  const entries = loadAllowlist(json);
  assert.equal(entries.length, 1);
  assert.ok(entries[0].path.endsWith("narrative-background.css"));
  assert.ok(entries[0].reason.trim().length > 0);
});
