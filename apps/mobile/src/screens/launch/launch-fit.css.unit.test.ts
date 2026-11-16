import { describe, expect, it } from "vitest";

import {
  cssDeclaration,
  cssRuleBody,
  readCssWithoutComments,
} from "../../lib/wcag-contrast.test-support";

// `unit` 계층: 큰 글자(최대 Dynamic Type)에서 출시 모달 상자가 화면보다 길어질 때의 규칙 — 내용은 상자 안 스크롤로, 버튼은 고정.

const css = readCssWithoutComments("src/screens/launch/launch.css");
const declaration = (selector: RegExp, property: string): string | undefined =>
  cssDeclaration(cssRuleBody(css, selector), property);

describe("launch.css — 큰 글자", () => {
  it("[LF1] 상자는 화면 높이를 넘지 않고 줄며, 내용 스크롤만 줄고 버튼은 줄지 않는다", () => {
    expect(declaration(/\.launch-box/, "max-height")).toBe("100%");
    expect(declaration(/\.launch-box/, "min-height")).toBe("0");
    expect(declaration(/\.launch-scroll/, "flex-shrink")).toBe("1");
    expect(declaration(/\.launch-scroll/, "min-height")).toBe("0");
    expect(declaration(/\.launch-scroll/, "overflow")).toBe("hidden");
    expect(declaration(/\.launch-actions/, "flex-shrink")).toBe("0");
  });
});
