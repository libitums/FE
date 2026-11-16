import { describe, expect, it } from "vitest";

import {
  cssDeclaration,
  cssRuleBody,
  readCssWithoutComments,
} from "../../lib/wcag-contrast.test-support";

// `unit` 계층: 큰 글자에서 스트릭 모달의 큰 숫자 영역이 화면을 다 차지해 Collect · Continue가 밀리던 것.

const css = readCssWithoutComments("src/screens/journey-map/journey-stat-modal.css");
const declaration = (selector: RegExp, property: string): string | undefined =>
  cssDeclaration(cssRuleBody(css, selector), property);

describe("journey-stat-modal.css — 큰 글자", () => {
  it("[JF1] 큰 숫자 영역만 줄고 잘리며, 진행 줄 · 아래 버튼 묶음은 줄지 않는다", () => {
    expect(declaration(/\.journey-stat-modal-hero/, "flex-shrink")).toBe("1");
    expect(declaration(/\.journey-stat-modal-hero/, "min-height")).toBe("0");
    expect(declaration(/\.journey-stat-modal-hero/, "overflow")).toBe("hidden");
    // 잘라도 위로 올라간 불꽃(-69) · 트로피(-52.5)는 영역 안에 둡니다.
    expect(declaration(/\.journey-stat-modal-hero/, "padding-top")).toBe("69px");
    expect(declaration(/\.journey-stat-modal-track/, "flex-shrink")).toBe("0");
    // 큰 숫자 위 여백이 큰 숫자보다 먼저 줍니다.
    expect(declaration(/\.journey-stat-modal-hero-gap/, "min-height")).toBe("0");
    expect(Number(declaration(/\.journey-stat-modal-hero-gap/, "flex-shrink"))).toBeGreaterThan(
      Number(declaration(/\.journey-stat-modal-hero/, "flex-shrink")),
    );
    expect(declaration(/\.journey-stat-modal-footer/, "flex-shrink")).toBe("0");
  });
});
