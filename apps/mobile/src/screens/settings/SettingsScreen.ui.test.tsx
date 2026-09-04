import { expect, test } from "vitest";
import { render, screen, within } from "@lynx-js/react/testing-library";

import { SettingsScreen } from "./SettingsScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 이 화면은 제목 텍스트 하나만 그린다 (screens.contract.ts).
test("설정 화면이 제목을 렌더한다", () => {
  render(<SettingsScreen />);

  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("설정");
});

// 재고정 2026-09-02: 제목 다섯이 같은 방식으로 heading이 된다 (screens.contract.ts).
test("설정 화면 제목이 accessibility-traits header를 갖는다", () => {
  render(<SettingsScreen />);

  expect(screen.getByTestId("settings-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// ---------------------------------------------------------------- 스크롤 영역 (LIB-226 계약 §3.2 U1·U3)
//
// 설정은 흐름 자식이 없다(계약 §1.7 — 지금 비어 있다). 고정은 제목 <text> 하나다.

// U1: 스크롤 컨테이너가 존재한다.
test("[U1] settings-screen-scroll이 존재한다", () => {
  render(<SettingsScreen />);

  expect(screen.getByTestId("settings-screen-scroll")).toBeInTheDocument();
});

// U3: 고정 자식(제목)이 스크롤 컨테이너 밖에 있다.
test("[U3] settings-screen-title이 스크롤 컨테이너 밖에 있다", () => {
  render(<SettingsScreen />);

  const scroll = screen.getByTestId("settings-screen-scroll");
  expect(within(scroll).queryByTestId("settings-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
});
