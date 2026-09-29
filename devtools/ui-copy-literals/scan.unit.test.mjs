import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { koreanLiteralsIn } from "./scan.mjs";

// typescript는 루트에 없어 apps/mobile의 것을 받아 인자로 넘깁니다(scan은 순수).
const require = createRequire(new URL("../../apps/mobile/package.json", import.meta.url));
const ts = require("typescript");

const scan = (source, fileName = "sample.tsx") => koreanLiteralsIn(source, fileName, ts);

// SC1 — 주석은 AST에 없으므로 잡히지 않아야 합니다.
test("SC1. 줄 주석 · 블록 주석 · JSDoc의 한글은 잡지 않는다", () => {
  const source = [
    "// 한글 주석",
    "/* 한글 블록 */",
    "/** 한글 JSDoc */",
    "export const a = 1;",
    "",
  ].join("\n");

  assert.deepEqual(scan(source), []);
});

// SC2 — 한글이 리터럴로 서는 다섯 자리가 각각 한 건, 줄 번호가 정확해야 합니다.
test("SC2. 문자열 리터럴이 1건이고 줄이 정확하다", () => {
  const found = scan('\nexport const a = "안녕";\n');

  assert.equal(found.length, 1);
  assert.equal(found[0].line, 2);
  assert.ok(found[0].text.includes("안녕"));
});

test("SC2. 템플릿 리터럴은 통째로 1건이다", () => {
  const found = scan("export const f = (n: number) => `연속 ${n}일`;\n");

  assert.equal(found.length, 1);
  assert.equal(found[0].line, 1);
  assert.ok(found[0].text.includes("연속"));
});

test("SC2. JSX 텍스트가 1건이고 줄이 정확하다", () => {
  const found = scan("export function A() {\n  return <text>다음</text>;\n}\n");

  assert.equal(found.length, 1);
  assert.equal(found[0].line, 2);
  assert.ok(found[0].text.includes("다음"));
});

test("SC2. JSX 속성 문자열이 1건이다", () => {
  const found = scan('export function A() {\n  return <view accessibility-label="닫기" />;\n}\n');

  assert.equal(found.length, 1);
  assert.equal(found[0].line, 2);
  assert.ok(found[0].text.includes("닫기"));
});

test("SC2. 타입 리터럴이 1건이다", () => {
  const found = scan('\n\ntype L = "맵으로";\n');

  assert.equal(found.length, 1);
  assert.equal(found[0].line, 3);
  assert.ok(found[0].text.includes("맵으로"));
});

test("SC2. 한글이 없는 리터럴은 잡지 않는다", () => {
  assert.deepEqual(scan('export const a = "hello";\nexport const b = `n ${1}`;\n'), []);
});

// SC3 — declaration은 가장 가까운 최상위 선언 이름입니다.
test("SC3. 객체 안의 한글은 최상위 const 이름을 declaration으로 싣는다", () => {
  const found = scan('const table = { a: "가" };\n');

  assert.equal(found.length, 1);
  assert.equal(found[0].declaration, "table");
});

test("SC3. 함수 안의 JSX는 함수 이름을 싣는다", () => {
  const found = scan("export function Screen() {\n  return <text>다음</text>;\n}\n");

  assert.equal(found.length, 1);
  assert.equal(found[0].declaration, "Screen");
});

test("SC3. 타입 별칭은 별칭 이름을 싣는다", () => {
  const found = scan('export type Label = "맵으로" | "닫기";\n');

  assert.equal(found.length, 2);
  for (const literal of found) {
    assert.equal(literal.declaration, "Label");
  }
});

test("SC3. 중첩된 안쪽 선언이 아니라 최상위 선언 이름을 싣는다", () => {
  const found = scan(
    'export function outer() {\n  const inner = { a: "가" };\n  return inner;\n}\n',
  );

  assert.equal(found.length, 1);
  assert.equal(found[0].declaration, "outer");
});

// SC4 — new Error 인자만 개발자 메시지입니다.
test("SC4. throw new Error 안의 한글은 inErrorConstructor가 true다", () => {
  const found = scan("export function f(x: string) {\n  throw new Error(`없음: ${x}`);\n}\n");

  assert.equal(found.length, 1);
  assert.equal(found[0].inErrorConstructor, true);
});

test("SC4. new TypeError 안의 한글은 false다(Error만 허용)", () => {
  const found = scan('export function f() {\n  throw new TypeError("가");\n}\n');

  assert.equal(found.length, 1);
  assert.equal(found[0].inErrorConstructor, false);
});

test("SC4. Error 밖의 일반 리터럴은 false다", () => {
  const found = scan('export const a = "가";\n');

  assert.equal(found[0].inErrorConstructor, false);
});
