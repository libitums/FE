import assert from "node:assert/strict";
import test from "node:test";

import { mediaQueriesIn, motionDeclarationsIn, stripComments } from "./scan.mjs";

const newlines = (text) => text.split("\n").length - 1;

test("SN1. stripComments는 길이와 개행 수를 지키고 주석 안 내용을 지운다", () => {
  const css = "a /* 150ms\n@media */ b";
  const stripped = stripComments(css);
  assert.equal(stripped.length, css.length);
  assert.equal(newlines(stripped), newlines(css));
  assert.ok(!stripped.includes("150ms"));
  assert.ok(!stripped.includes("@media"));
  assert.ok(stripped.startsWith("a "));
  assert.ok(stripped.endsWith(" b"));
});

test("SN2. 여러 줄 transition 값을 한 선언으로 합치고 시작 줄을 돌려준다", () => {
  const css = [
    ".a {",
    "  transition:",
    "    width var(--a) var(--b),",
    "    color 150ms ease;",
    "}",
  ].join("\n");
  const found = motionDeclarationsIn(css);
  assert.equal(found.length, 1);
  assert.equal(found[0].property, "transition");
  assert.equal(found[0].line, 2);
  assert.match(found[0].value, /width var\(--a\) var\(--b\)/);
  assert.match(found[0].value, /color 150ms ease/);
});

test("SN3. keyframes 안의 animation-timing-function은 잡고 transform은 잡지 않는다", () => {
  const css = "@keyframes k { 50% { animation-timing-function: ease; transform: scale(1); } }";
  const found = motionDeclarationsIn(css);
  assert.equal(found.length, 1);
  assert.equal(found[0].property, "animation-timing-function");
  assert.equal(found[0].value.trim(), "ease");
  assert.ok(!found.some((declaration) => declaration.property === "transform"));
});

test("SN4. @media는 줄 번호와 함께 잡고 주석 안은 잡지 않는다", () => {
  const css =
    ".b { color: red; }\n@media (prefers-reduced-motion: reduce) { .a { transition: none } }";
  assert.deepEqual(mediaQueriesIn(css), [{ line: 2 }]);
  assert.deepEqual(mediaQueriesIn("/* @media (x) { } */ .a { color: red; }"), []);
});
