// 테스트 지원 — 다른 탭 루트에 있는 동안 여정맵이 숨겨져 있는지(ADR-0106: 지우지 않고 숨김 상자에 남김) 봅니다.
// 제품 코드는 import하지 않습니다.

import { expect } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

/** 여정맵이 보이지 않는다 — 숨김 상자 안에 남아 있거나(탭 루트) 아예 없다(그 밖 화면). */
export function expectJourneyMapHidden(): void {
  const box = screen.queryByTestId("app-tab-map");
  if (box === null) {
    expect(screen.queryByTestId("journey-map-screen") === null).toBe(true);
    return;
  }
  expect(box.getAttribute("class") ?? "").toContain("app-tab-map-hidden");
  expect(box.getAttribute("accessibility-elements-hidden")).toBe("true");
}
