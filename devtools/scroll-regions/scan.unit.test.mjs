import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { scrollElementsIn } from "./scan.mjs";

// typescript는 루트에 없어 apps/mobile의 것을 받아 인자로 넘깁니다(scan은 순수).
const require = createRequire(new URL("../../apps/mobile/package.json", import.meta.url));
const ts = require("typescript");

const scan = (source, fileName = "sample.tsx") => scrollElementsIn(source, fileName, ts);

// SC1 — 규칙을 지킨 요소는 false로 읽힙니다.
test("SC1. scroll-bar-enable={false}는 scrollBar false · spread false · 1줄로 읽는다", () => {
  const found = scan('<scroll-view scroll-orientation="vertical" scroll-bar-enable={false} />\n');

  assert.equal(found.length, 1);
  assert.equal(found[0].tag, "scroll-view");
  assert.equal(found[0].scrollBar, "false");
  assert.equal(found[0].spread, false);
  assert.equal(found[0].line, 1);
});

// SC2
test("SC2. scroll-bar-enable={true}는 true로 읽는다", () => {
  const found = scan("<scroll-view scroll-bar-enable={true} />\n");

  assert.equal(found.length, 1);
  assert.equal(found[0].scrollBar, "true");
});

// SC3 — 값 없는 속성은 JSX에서 true입니다.
test("SC3. 값 없는 scroll-bar-enable은 true로 읽는다", () => {
  const found = scan("<scroll-view scroll-bar-enable />\n");

  assert.equal(found.length, 1);
  assert.equal(found[0].scrollBar, "true");
});

// SC4
test("SC4. 속성이 없으면 missing으로 읽는다", () => {
  const found = scan('<scroll-view scroll-orientation="vertical" />\n');

  assert.equal(found.length, 1);
  assert.equal(found[0].scrollBar, "missing");
});

// SC5 — 글자 그대로 false가 아닌 모든 식은 not-literal입니다.
test("SC5. 변수 · 삼항 · 문자열 · 식 안의 문자열은 모두 not-literal로 읽는다", () => {
  for (const attribute of [
    "scroll-bar-enable={flag}",
    "scroll-bar-enable={a ? true : false}",
    'scroll-bar-enable="false"',
    'scroll-bar-enable={"false"}',
  ]) {
    const found = scan(`<scroll-view ${attribute} />\n`);

    assert.equal(found.length, 1, attribute);
    assert.equal(found[0].scrollBar, "not-literal", attribute);
  }
});

// SC6
test("SC6. 스프레드 속성이 있으면 spread true이고 값은 따로 읽는다", () => {
  const found = scan("<scroll-view {...rest} scroll-bar-enable={false}>\n</scroll-view>\n");

  assert.equal(found.length, 1);
  assert.equal(found[0].spread, true);
  assert.equal(found[0].scrollBar, "false");
});

// SC6b — 뒤에 적힌 속성이 이기므로, 스프레드가 스위치 뒤에 있을 때만 덮을 수 있습니다.
test("SC6b. spreadAfterSwitch는 스프레드가 마지막 scroll-bar-enable 뒤에 있을 때만 true다", () => {
  const read = (attributes) => scan(`<scroll-view ${attributes} />\n`)[0];

  assert.equal(read("{...rest} scroll-bar-enable={false}").spreadAfterSwitch, false);
  assert.equal(read("scroll-bar-enable={false} {...rest}").spreadAfterSwitch, true);
  assert.equal(read("{...a} scroll-bar-enable={false} {...b}").spreadAfterSwitch, true);
  assert.equal(read("scroll-bar-enable={false}").spreadAfterSwitch, false);
  // 스위치가 없으면 스프레드는 어느 쪽이든 덮을 수 있는 것으로 읽습니다.
  assert.equal(read("{...rest}").spreadAfterSwitch, true);
});

// SC7
test("SC7. <list>도 센다", () => {
  const found = scan("<list scroll-bar-enable={true}>\n</list>\n");

  assert.equal(found.length, 1);
  assert.equal(found[0].tag, "list");
  assert.equal(found[0].scrollBar, "true");
});

// SC8 — 여는 태그의 `<`가 있는 줄, 소스 순서.
test("SC8. 여러 줄에 걸친 요소의 line은 < 가 있는 줄이고 소스 순서로 나온다", () => {
  const source = [
    "const a = (",
    "  <view>",
    "    <scroll-view",
    '      scroll-orientation="vertical"',
    "      scroll-bar-enable={false}",
    "    />",
    "  </view>",
    ");",
    "const b = <list",
    "  scroll-bar-enable={true}",
    ">",
    "</list>;",
    "",
  ].join("\n");

  const found = scan(source);

  assert.deepEqual(
    found.map((element) => element.line),
    [3, 9],
  );
  assert.deepEqual(
    found.map((element) => element.tag),
    ["scroll-view", "list"],
  );
});

// SC9 — 가드: 구현이 넓게 잡는 것을 막습니다.
test("SC9. 스크롤 요소 없는 파일 · 주석과 문자열 안의 태그 · 대문자 컴포넌트 · 비슷한 이름은 세지 않는다", () => {
  assert.deepEqual(scan("export const a = <view><text /></view>;\n"), []);

  const commented = [
    "// <scroll-view scroll-bar-enable={true} />",
    "/* <scroll-view /> */",
    'export const a = "<scroll-view scroll-bar-enable={true} />";',
    "export const b = `<list />`;",
    "",
  ].join("\n");
  assert.deepEqual(scan(commented), []);

  const lookalikes = [
    "export const a = <ScrollView scroll-bar-enable={true} />;",
    "export const b = <listing />;",
    "export const c = <scroll-view-extra />;",
    "",
  ].join("\n");
  assert.deepEqual(scan(lookalikes), []);
});

// SC10 — 가드
test("SC10. JSX 없는 .ts 소스는 빈 목록이고 던지지 않는다", () => {
  assert.deepEqual(
    scan("export const a = 1;\nexport const f = (x: number) => x + 1;\n", "a.ts"),
    [],
  );
});
