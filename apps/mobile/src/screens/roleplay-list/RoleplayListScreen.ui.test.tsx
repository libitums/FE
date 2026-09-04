import { expect, test } from "vitest";
import { render, screen, within } from "@lynx-js/react/testing-library";

import { RoleplayListScreen } from "./RoleplayListScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 이 화면은 제목 텍스트 하나만 그린다 (screens.contract.ts).
test("롤플레이 화면이 제목을 렌더한다", () => {
  render(<RoleplayListScreen />);

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveTextContent("롤플레이");
});

// 재고정 2026-09-02: 제목 다섯이 같은 방식으로 heading이 된다 (screens.contract.ts).
test("롤플레이 화면 제목이 accessibility-traits header를 갖는다", () => {
  render(<RoleplayListScreen />);

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// ---------------------------------------------------------------- 스크롤 영역 (LIB-226 계약 §3.2 U1·U3)
//
// 롤플레이는 흐름 자식이 없다(계약 §1.6 — 지금 비어 있다). 고정은 제목 <text> 하나다.

// U1: 스크롤 컨테이너가 존재한다.
test("[U1] roleplay-list-screen-scroll이 존재한다", () => {
  render(<RoleplayListScreen />);

  expect(screen.getByTestId("roleplay-list-screen-scroll")).toBeInTheDocument();
});

// U3: 고정 자식(제목)이 스크롤 컨테이너 밖에 있다.
test("[U3] roleplay-list-screen-title이 스크롤 컨테이너 밖에 있다", () => {
  render(<RoleplayListScreen />);

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(within(scroll).queryByTestId("roleplay-list-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재 (LIB-226 계약 §3.2.1 U8)
//
// R6·R6.1의 「없음」을 지키는 회귀 그물이다(계약 §2.3 · §3.2.1). 오늘의 구현은 이
// 넷을 하나도 붙이지 않는다 — **red가 없는 것이 이 케이스의 성질이다.** 다음 편집이
// 넷 중 하나라도 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가
// 아니라 계약(§8.3)으로 되돌아가라는 신호다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  render(<RoleplayListScreen />);

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});
