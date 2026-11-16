import { describe, expect, it } from "vitest";

import {
  cssDeclaration,
  cssRuleBody,
  readCssWithoutComments,
} from "../../lib/wcag-contrast.test-support";

// `unit` 계층: 롤플레이 대화 화면의 아래 묶음이 화면보다 길어질 때의 규칙(CSS 텍스트를 읽어 봅니다).

const css = readCssWithoutComments("src/screens/roleplay-story/roleplay-story-screen.css");
const declaration = (selector: RegExp, property: string): string | undefined =>
  cssDeclaration(cssRuleBody(css, selector), property);

describe("roleplay-story-screen.css", () => {
  it("[RSC1] 대화 화면의 아래 묶음과 대사 스크롤은 줄고, 버튼 · 말하기 묶음은 줄지 않는다", () => {
    expect(declaration(/\.roleplay-story-screen-bottom-fit/, "flex-shrink")).toBe("1");
    expect(declaration(/\.roleplay-story-screen-bottom-fit/, "min-height")).toBe("0");
    expect(declaration(/\.roleplay-story-bottom-scroll/, "flex-shrink")).toBe("1");
    expect(declaration(/\.roleplay-story-bottom-scroll/, "min-height")).toBe("0");
    // 대화창이 z-index를 가져 스크롤을 독립 레이어로 만들어야 경계에서 잘립니다.
    expect(declaration(/\.roleplay-story-bottom-scroll/, "overflow")).toBe("hidden");
    expect(declaration(/\.roleplay-story-bottom-scroll/, "z-index")).toBe(
      "var(--libitum-elevation-z-default)",
    );
    expect(declaration(/\.roleplay-story-actions/, "flex-shrink")).toBe("0");
    expect(declaration(/\.roleplay-story-speak/, "flex-shrink")).toBe("0");
    expect(declaration(/\.roleplay-story-screen-header/, "flex-shrink")).toBe("0");
  });
});
