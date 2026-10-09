import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import {
  allowlistProblems,
  loadAllowlist,
  stripTokenReferences,
  violationsIn,
  violationsInSource,
} from "./policy.mjs";

const ts = createRequire(new URL("../../apps/mobile/package.json", import.meta.url))("typescript");

const rules = (css) => violationsIn(css).map(({ rule }) => rule);

test("PO1. 시간 리터럴을 time-literal로 잡는다", () => {
  const found = violationsIn(
    ".a { transition: opacity 150ms var(--libitum-motion-easing-easing); }",
  );
  assert.equal(found.length, 1);
  assert.equal(found[0].rule, "time-literal");
  assert.equal(found[0].text, "150ms");
});

test("PO2. cubic-bezier()는 easing-function 한 건이다", () => {
  const found = violationsIn(
    ".a { animation: x var(--libitum-motion-duration-d2) cubic-bezier(0.35, 0, 0.35, 1) both; }",
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
  assert.deepEqual(violationsIn(css), []);
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
  assert.deepEqual(violationsIn(css), []);
});

test("PO7′. allowlistProblems: 정상이면 비고, 파일이 없거나 위반이 0이면 한 건씩 돌려준다", () => {
  const violation = { line: 1, rule: "time-literal", text: "150ms" };
  assert.deepEqual(
    allowlistProblems([{ path: "x.css" }], new Set(["x.css"]), new Map([["x.css", [violation]]])),
    [],
  );
  assert.equal(allowlistProblems([{ path: "x.css" }], new Set(), new Map()).length, 1);
  assert.equal(
    allowlistProblems([{ path: "x.css" }], new Set(["x.css"]), new Map([["x.css", []]])).length,
    1,
  );
});

test("PO7′. loadAllowlist는 모양이 틀리면 던진다", () => {
  assert.throws(() => loadAllowlist([{}]));
});

test("PO8′. 실제 allowlist.json은 검증을 통과하고 항목이 하나다, 문자열 입력은 던진다", () => {
  assert.throws(() => loadAllowlist("[]"));
  const json = readFileSync(new URL("./allowlist.json", import.meta.url), "utf8");
  const entries = loadAllowlist(JSON.parse(json));
  assert.equal(entries.length, 1);
  assert.ok(entries[0].path.endsWith("narrative-background.css"));
  assert.ok(entries[0].reason.trim().length > 0);
});

test("PO9. 비항등 scale 리터럴은 scale-literal 한 건이다", () => {
  assert.deepEqual(violationsIn(".a { transform: scale(0.95); }"), [
    { line: 1, rule: "scale-literal", text: "scale(0.95)" },
  ]);
});

test("PO10. 항등값 · 토큰 참조 · scale 없는 transform은 위반이 아니다", () => {
  const css = [
    ".a { transform: scale(1); }",
    ".b { transform: scale(1, 1); }",
    ".c { transform: scale(var(--libitum-motion-scale-pressed)); }",
    ".d { transform: translateX(16px); }",
  ].join("\n");
  assert.deepEqual(violationsIn(css), []);
});

test("PO11. scale3d · scaleX · keyframe 안 scale도 호출 전체를 text로 잡는다", () => {
  const css = [
    ".a { transform: scale3d(1, 0.9, 1) rotate(1deg); }",
    ".b { transform: scaleX(0.5); }",
    "@keyframes k { from { transform: scale(0.8); } }",
  ].join("\n");
  const found = violationsIn(css);
  assert.deepEqual(
    found.map(({ rule }) => rule),
    ["scale-literal", "scale-literal", "scale-literal"],
  );
  assert.deepEqual(
    found.map(({ text }) => text),
    ["scale3d(1, 0.9, 1)", "scaleX(0.5)", "scale(0.8)"],
  );
});

test("PO12. violationsIn은 인자를 하나만 받는다", () => {
  assert.equal(violationsIn.length, 1);
});

test("PS1. 소스 inline 시간 리터럴을 time-literal로 잡는다", () => {
  const source =
    '<view style={{ transition: "opacity 150ms var(--libitum-motion-easing-easing)" }} />;';
  assert.deepEqual(violationsInSource(source, "a.tsx", ts), [
    { line: 1, rule: "time-literal", text: "150ms" },
  ]);
});

test("PS2. 소스 inline easing 키워드와 함수를 각각 잡는다", () => {
  const keyword = violationsInSource(
    '<view style={{ animation: "spin var(--libitum-motion-duration-spinner) linear infinite" }} />;',
    "a.tsx",
    ts,
  );
  assert.deepEqual(
    keyword.map(({ rule }) => rule),
    ["easing-keyword"],
  );
  const fn = violationsInSource(
    'const s = { transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)" };',
    "a.ts",
    ts,
  );
  assert.deepEqual(
    fn.map(({ rule }) => rule),
    ["easing-function"],
  );
});

test("PS3. 토큰만 쓴 inline · imagination · none은 위반이 아니다", () => {
  const source = [
    'const a = { transition: "opacity var(--libitum-motion-duration-d2) var(--libitum-motion-easing-linear)" };',
    'const b = { transition: "imagination" };',
    'const c = { transition: "none" };',
  ].join("\n");
  assert.deepEqual(violationsInSource(source, "a.ts", ts), []);
});
