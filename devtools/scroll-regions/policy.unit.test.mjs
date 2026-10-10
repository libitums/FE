import assert from "node:assert/strict";
import test from "node:test";

import { scrollBarPolicy, scrollBarViolationsFrom } from "./policy.mjs";

const element = (overrides) => ({
  line: 1,
  tag: "scroll-view",
  scrollBar: "false",
  spread: false,
  spreadAfterSwitch: false,
  ...overrides,
});

// PO1 — 가드
test("PO1. scroll-bar-enable={false}이고 스프레드가 없으면 위반이 없다", () => {
  assert.deepEqual(scrollBarViolationsFrom([element({})]), []);
});

// PO2
test("PO2. missing은 missing 위반 1건이고 줄을 보존한다", () => {
  const found = scrollBarViolationsFrom([element({ line: 42, scrollBar: "missing" })]);

  assert.equal(found.length, 1);
  assert.equal(found[0].rule, "missing");
  assert.equal(found[0].line, 42);
});

// PO3
test("PO3. true는 enabled 위반이다", () => {
  const found = scrollBarViolationsFrom([element({ scrollBar: "true" })]);

  assert.equal(found.length, 1);
  assert.equal(found[0].rule, "enabled");
});

// PO4
test("PO4. not-literal은 not-literal 위반이다", () => {
  const found = scrollBarViolationsFrom([element({ scrollBar: "not-literal" })]);

  assert.equal(found.length, 1);
  assert.equal(found[0].rule, "not-literal");
});

// PO5
test("PO5. 값이 false여도 스위치 뒤에 스프레드가 있으면 spread 위반 1건이다", () => {
  const found = scrollBarViolationsFrom([element({ spread: true, spreadAfterSwitch: true })]);

  assert.equal(found.length, 1);
  assert.equal(found[0].rule, "spread");
});

// PO6
test("PO6. true이면서 뒤에 스프레드면 enabled와 spread를 함께 낸다", () => {
  const found = scrollBarViolationsFrom([
    element({ scrollBar: "true", spread: true, spreadAfterSwitch: true }),
  ]);

  assert.deepEqual(found.map((violation) => violation.rule).sort(), ["enabled", "spread"]);
});

// PO5b — 뒤에 적힌 속성이 이기므로 스프레드가 스위치보다 앞이면 값을 덮지 못합니다.
test("PO5b. 스프레드가 글자 그대로의 false 스위치보다 앞이면 위반이 없다", () => {
  assert.deepEqual(
    scrollBarViolationsFrom([element({ spread: true, spreadAfterSwitch: false })]),
    [],
  );
});

// PO5c — 스위치가 없으면 스프레드가 앞이어도 missing 위반이 남고, 스프레드 위반도 낸다.
test("PO5c. 스위치가 없고 스프레드만 있으면 missing과 spread를 함께 낸다", () => {
  const found = scrollBarViolationsFrom([
    element({ scrollBar: "missing", spread: true, spreadAfterSwitch: true }),
  ]);

  assert.deepEqual(found.map((violation) => violation.rule).sort(), ["missing", "spread"]);
});

// PO7
test("PO7. 결과는 줄 오름차순이다", () => {
  const found = scrollBarViolationsFrom([
    element({ line: 30, scrollBar: "true" }),
    element({ line: 10, scrollBar: "missing" }),
    element({ line: 20, scrollBar: "not-literal" }),
  ]);

  assert.deepEqual(
    found.map((violation) => violation.line),
    [10, 20, 30],
  );
});

// PO8
test("PO8. message는 고칠 글자 scroll-bar-enable={false}를 담는다", () => {
  for (const scrollBar of ["missing", "true", "not-literal"]) {
    const [violation] = scrollBarViolationsFrom([element({ scrollBar })]);

    assert.ok(violation, `${scrollBar}: 위반이 있어야 한다`);
    assert.ok(
      violation.message.includes("scroll-bar-enable={false}"),
      `${scrollBar}: ${violation.message}`,
    );
  }
});

// PO9 — 가드: 상수
test("PO9. 정책 루트는 셋이고 테스트 파일만 제외한다", () => {
  assert.deepEqual(scrollBarPolicy.roots, [
    "apps/mobile/src",
    "packages/ui-lynx/src",
    "apps/storybook-lynx/src",
  ]);
  assert.equal(scrollBarPolicy.excludedFile.test("X.ui.test.tsx"), true);
  assert.equal(scrollBarPolicy.excludedFile.test("X.tsx"), false);
  assert.equal(scrollBarPolicy.excludedFile.test("X.stories.tsx"), false);
});
