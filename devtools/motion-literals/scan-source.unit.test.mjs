import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { inlineMotionDeclarationsIn, motionPropertyNames } from "./scan-source.mjs";

// check.mjs와 같은 방식으로 typescript를 apps/mobile에서 해석합니다(루트 의존 추가 0).
const ts = createRequire(new URL("../../apps/mobile/package.json", import.meta.url))("typescript");

test("SS1. 객체 스타일의 transition 문자열을 object 출처로 잡는다", () => {
  const source = [
    "export const A = () => (",
    '  <view style={{ transition: "opacity 150ms ease", width: "1px" }} />',
    ");",
  ].join("\n");
  const found = inlineMotionDeclarationsIn(source, "a.tsx", ts);
  assert.equal(found.length, 1);
  assert.equal(found[0].property, "transition");
  assert.equal(found[0].value, "opacity 150ms ease");
  assert.equal(found[0].origin, "object");
  assert.equal(found[0].line, 2);
});

test("SS2. camelCase는 kebab으로 바꾸고 템플릿 리터럴은 리터럴 조각만 잇는다", () => {
  const source =
    "const s = { transitionDuration: `${x} 300ms`, animationTimingFunction: 'ease-in' } as const;";
  const found = inlineMotionDeclarationsIn(source, "a.ts", ts);
  assert.equal(found.length, 2);
  assert.deepEqual(
    found.map(({ property }) => property),
    ["transition-duration", "animation-timing-function"],
  );
  assert.ok(found[0].value.includes("300ms"));
  assert.ok(found[1].value.includes("ease-in"));
});

test("SS3. style 문자열 속성은 style-string 출처로 선언마다 잡는다", () => {
  const source = '<view style="transition: opacity 150ms; color: red" />;';
  const found = inlineMotionDeclarationsIn(source, "a.tsx", ts);
  assert.equal(found.length, 1);
  assert.equal(found[0].origin, "style-string");
  assert.equal(found[0].property, "transition");
  assert.equal(found[0].value, "opacity 150ms");
});

test("SS4. 문자열 키 kebab 이름도 잡는다", () => {
  const found = inlineMotionDeclarationsIn('const s = { "animation-delay": "0s" };', "a.tsx", ts);
  assert.equal(found.length, 1);
  assert.equal(found[0].property, "animation-delay");
});

test("SS5. 비리터럴 값은 빠지고 리터럴만 남는다", () => {
  const source = [
    "const a = <view style={{ transition: dur, animation: fn() }} />;",
    'const b = { transition: "imagination" };',
  ].join("\n");
  const found = inlineMotionDeclarationsIn(source, "a.tsx", ts);
  assert.equal(found.length, 1);
  assert.equal(found[0].property, "transition");
  assert.equal(found[0].value, "imagination");
});

test("SS6. as const · 괄호로 감싼 문자열도 잡는다", () => {
  const source = [
    'const a = { transition: "opacity 150ms" as const };',
    'const b = <view style={{ animation: ("spin 1s linear") }} />;',
  ].join("\n");
  const found = inlineMotionDeclarationsIn(source, "a.tsx", ts);
  assert.equal(found.length, 2);
  assert.equal(found[0].value, "opacity 150ms");
  assert.equal(found[1].property, "animation");
  assert.equal(found[1].value, "spin 1s linear");
});

test("SS-names. motionPropertyNames는 camelCase와 kebab 여덟 쌍이다", () => {
  assert.equal(motionPropertyNames.length, 8);
  assert.ok(
    motionPropertyNames.some(
      ({ camel, kebab }) => camel === "transitionDuration" && kebab === "transition-duration",
    ),
  );
});
