import { expect, test } from "vitest";
import { render, screen, within } from "@lynx-js/react/testing-library";
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

// ---------------------------------------------------------------- 스크롤 영역 (LIB-226 계약 §3.2 U1·U3)
//
// 홈은 흐름 자식이 없다(계약 §1.5 — 지금 비어 있다). 고정은 머리(아이콘+제목)뿐이다.

// U1: 스크롤 컨테이너가 존재한다.
test("[U1] home-screen-scroll이 존재한다", () => {
  render(<HomeScreen />);

  expect(screen.getByTestId("home-screen-scroll")).toBeInTheDocument();
});

// U3: 고정 자식(제목·아이콘)이 스크롤 컨테이너 밖에 있다.
test("[U3] 제목·아이콘이 스크롤 컨테이너 밖에 있다", () => {
  render(<HomeScreen />);

  const scroll = screen.getByTestId("home-screen-scroll");
  expect(within(scroll).queryByTestId("home-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("home-screen-icon")).not.toBeInTheDocument();

  expect(screen.getByTestId("home-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("home-screen-icon")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재 (LIB-226 계약 §3.2.1 U8)
//
// R6·R6.1의 「없음」을 지키는 회귀 그물이다(계약 §2.3 · §3.2.1). 오늘의 구현은 이
// 넷을 하나도 붙이지 않는다 — **red가 없는 것이 이 케이스의 성질이다.** 다음 편집이
// 넷 중 하나라도 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가
// 아니라 계약(§8.3)으로 되돌아가라는 신호다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  render(<HomeScreen />);

  const scroll = screen.getByTestId("home-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 세로 동작 (LIB-226 계약 §3.2.2 U9·U10·U11, r4)
//
// R5 폐기 → R5.1~R5.3. `<scroll-view>`는 `scroll-orientation` prop이 없으면
// `_enableScrollY` 초기값이 NO라 세로 스크롤이 원리적으로 불가능하다(design §8.2).
// jsdom은 레이아웃이 없어 실제로 스크롤되는지는 이 계층이 원리적으로 못 본다
// (§3.2.2 말미, 실기가 답한다).
//
// U11의 기댓값이 문자열 "true"인 이유: `@lynx-js/testing-environment`의
// `__SetAttribute`(ElementPAPI.js:87~89)가 boolean을 `JSON.stringify`로 직렬화한다.

// U9: scroll-orientation이 "vertical"로 붙어 있다.
test("[U9] home-screen-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  render(<HomeScreen />);

  expect(screen.getByTestId("home-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

// U11: scroll-bar-enable이 (JSON.stringify를 거친) 문자열 "true"로 붙어 있다.
test("[U11] home-screen-scroll에 scroll-bar-enable='true'가 붙는다", () => {
  render(<HomeScreen />);

  expect(screen.getByTestId("home-screen-scroll")).toHaveAttribute("scroll-bar-enable", "true");
});

// U10: 스크롤 컨테이너의 직계 요소 자식이 하나를 넘지 않는다. HomeScreen은 흐름 자식이
// 없어(비어 있다) 오늘도 자식이 0개라 green이다(R7.1의 「나머지 넷은 안 샌다」 표).
test("[U10] 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  render(<HomeScreen />);

  expect(screen.getByTestId("home-screen-scroll").children.length).toBeLessThanOrEqual(1);
});
