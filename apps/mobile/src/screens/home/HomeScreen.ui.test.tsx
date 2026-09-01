import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";
import house from "@libitums/icons/lynx/house";
import { color } from "@libitums/design-tokens";

import { HomeScreen } from "./HomeScreen.js";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 계산된 스타일과 레이아웃은 단언할 수 없다 — 환경이 jsdom 기반이라 여기서는
// 무엇이 있는가만 본다. 값이 실제로 칠해지는지는
// `docs/e2e/design-token-rendering.md`의 수동 확인 몫이다.
//
// 아이콘 XML은 스냅샷에 담지 않는다. 원본 SVG가 바뀌면 화면과 무관하게
// 스냅샷만 깨지고, 정작 고정하고 싶은 계약은 아래 세 줄이다.
test("홈 화면이 제목과 아이콘을 렌더한다", () => {
  render(<HomeScreen />);

  expect(screen.getByTestId("home-title")).toHaveTextContent("홈");

  const icon = screen.getByTestId("home-icon");
  // package가 준 문자열을 그대로 넘긴다. 화면에서 XML을 가공하지 않는다.
  expect(icon).toHaveAttribute("content", house);
  // 색은 token 값을 `current-color`로 넘긴다 (ADR-0014 D2).
  expect(icon).toHaveAttribute("current-color", color.fg.neutral);
  // `current-color`는 원본이 currentColor를 쓸 때만 효과가 있다. 아이콘이 색을
  // 박아 오는 형태로 바뀌면 위 속성이 조용히 무효가 되므로 여기서 잡는다.
  expect(house).toContain("currentColor");
});
