import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";
import house from "@libitums/icons/lynx/house";
import { color } from "@libitums/design-tokens";

import { HomeScreen } from "./HomeScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 계산된 스타일과 레이아웃은 단언할 수 없다 — 환경이 jsdom 기반이라 여기서는
// 무엇이 있는가만 본다. 값이 실제로 칠해지는지는
// `docs/e2e/design-token-rendering.md`의 수동 확인 몫이다.
//
// 아이콘 XML은 스냅샷에 담지 않는다. 원본 SVG가 바뀌면 화면과 무관하게
// 스냅샷만 깨지고, 정작 고정하고 싶은 계약은 아래 세 줄이다.
test("홈 화면이 제목과 아이콘을 렌더한다", () => {
  render(<HomeScreen />);

  expect(screen.getByTestId("home-screen-title")).toHaveTextContent("홈");

  const icon = screen.getByTestId("home-screen-icon");
  // package가 준 문자열을 그대로 넘긴다. 화면에서 XML을 가공하지 않는다.
  expect(icon).toHaveAttribute("content", house);
  // 색은 token 값을 `current-color`로 넘긴다 (ADR-0014 D2).
  expect(icon).toHaveAttribute("current-color", color.fg.neutral);
  // `current-color`는 원본이 currentColor를 쓸 때만 효과가 있다. 아이콘이 색을
  // 박아 오는 형태로 바뀌면 위 속성이 조용히 무효가 되므로 여기서 잡는다.
  expect(house).toContain("currentColor");
});

// 재고정 2026-09-02: 제목 다섯이 같은 방식으로 heading이 된다 (screens.contract.ts).
// 첫 고정의 "홈은 고치지 않는다"가 뒤집혔다 — 렌더 출력이 바뀌므로 여기서 잡는다.
test("홈 화면 제목이 accessibility-traits header를 갖는다", () => {
  render(<HomeScreen />);

  expect(screen.getByTestId("home-screen-title")).toHaveAttribute("accessibility-traits", "header");
});

// 보정 2026-09-02: 접근성 감사 F8이 장식 아이콘 두 곳(탭·홈)을 한 지적으로 묶었다.
// 탭 쪽은 BottomNavigator.ui.test.tsx "아이콘 넷이 접근성 트리에서 빠진다"에서 이미
// 닫혔다 — 이 테스트가 홈 쪽을 같은 매처·같은 형태로 닫는다 (screens.contract.ts,
// spec.md §6.3 C-3). 옆 제목 <text>가 "홈"이라는 같은 뜻을 이미 글자로 전달하므로
// 이 아이콘은 순수 장식이다.
test("홈 화면 아이콘이 접근성 트리에서 빠진다 — 순수 장식이다", () => {
  render(<HomeScreen />);

  expect(screen.getByTestId("home-screen-icon")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
});
