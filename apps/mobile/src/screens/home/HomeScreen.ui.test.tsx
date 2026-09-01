import { expect, test } from "vitest";
import { render } from "@lynx-js/react/testing-library";
import house from "@libitums/icons/lynx/house";
import { color } from "@libitums/design-tokens";

import { HomeScreen } from "./HomeScreen.js";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 계산된 스타일과 레이아웃은 단언할 수 없다 — 환경이 jsdom 기반이라
// `style` 속성은 선언한 문자열로만 남는다.
//
// 아이콘 XML은 스냅샷에 담지 않는다. 원본 SVG가 바뀌면 화면과 무관하게
// 스냅샷만 깨지고, 정작 고정하고 싶은 계약은 아래 두 줄이다.
test("홈 화면이 제목과 아이콘을 렌더한다", () => {
  const { container } = render(<HomeScreen />);

  expect(container.querySelector(".home-screen-title")?.textContent).toBe("홈");

  const icon = container.querySelector(".home-screen-icon");
  expect(icon).not.toBeNull();
  // package가 준 문자열을 그대로 넘긴다. 화면에서 XML을 가공하지 않는다.
  expect(icon?.getAttribute("content")).toBe(house);
  // 원본의 currentColor는 그대로 두고 색은 속성으로 넘긴다 (ADR-0014 D2).
  expect(house).toContain('fill="currentColor"');
  expect(icon?.getAttribute("current-color")).toBe(color.fg.neutral);
  // 색 값은 token에서 온다. 화면에 raw hex를 적지 않는다.
  expect(color.fg.neutral).toMatch(/^#[0-9A-Fa-f]{6}$/);
});
