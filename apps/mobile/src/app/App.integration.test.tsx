import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";

// `integration` 계층: 여러 실제 모듈의 협력 (ADR-0006 D4).
// 여기서는 App · navReducer · BottomNavigator · 화면 넷 · ErrorBoundary가 맞물린다.
// 목킹하지 않는다 — 외부 IO가 생기면 그 경계에서만 대체한다.
//
// 텍스트 질의(`getByText`)는 쓰지 않는다 — 화면 제목과 탭 라벨이 같은 문자열을
// 공유하는 조합이 있어(`홈`, `설정`) 모호하다. 전부 `data-testid`로 질의한다
// (testids.contract.ts).

test("루트가 현재 탭 스택의 최상단 화면을 렌더한다", () => {
  render(<App />);

  expect(screen.getByTestId("home-screen-title")).toHaveTextContent("홈");
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "true");
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("여정 탭으로 전환하면 여정 맵 화면이 나오고 홈 화면은 사라진다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.queryByTestId("home-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "false");
});

test("롤플레이 탭으로 전환하면 롤플레이 화면이 나오고 홈 화면은 사라진다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveTextContent("롤플레이");
  expect(screen.queryByTestId("home-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "false");
});

test("설정 탭으로 전환하면 설정 화면이 나오고 홈 화면은 사라진다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});

  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("설정");
  expect(screen.queryByTestId("home-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "false");
});

test("홈 → 여정 → 홈으로 왕복하면 홈의 루트 화면이 그대로 다시 나온다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-home"), {});

  expect(screen.getByTestId("home-screen-title")).toHaveTextContent("홈");
  expect(screen.queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "true");
});

// -------------------------------------------------------------------------
// LIB-222 — 여정 맵 + 스텝 시트. 계약 §3.3의 경계 1~5를 여기서 검증한다.
// `App` · `navReducer` · `BottomNavigator` · `JourneyMapScreen` · `JourneyStepNode` ·
// `StepSheet`가 실제로 맞물리는지를 본다. 목킹하지 않는다 — 외부 IO가 없다.

test("여정 탭으로 전환하면 스텝 다섯이 전부 렌더된다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.getByTestId("journey-step-node-greeting")).toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-introduction")).toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-ordering")).toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-appointment")).toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-directions")).toBeInTheDocument();
});

// 계약 §3.3-2 · 수용 기준 5(스택 깊이 불변)의 **대리 관찰**이다. `Nav` 스택 깊이는 밖으로
// 노출되지 않으므로 직접 셀 수 없다 — 시트가 열려도 셸(탭 넷 · 여정 탭의 선택 상태)이
// 그대로라는 것으로 대신 본다. 셸이 사라지거나 선택이 바뀌면 스택이 깊어졌다는 신호다.
test("스텝을 누르면 시트가 열리고 셸이 그대로다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toBeInTheDocument();
});

test("시트를 닫으면 시트만 사라지고 화면 제목과 셸은 그대로다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.getByTestId("bottom-navigator-tab-home")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toBeInTheDocument();
});

// 시트 상태는 `Nav`가 아니라 화면 로컬 상태다(ADR-0007 D1) — 탭을 떠나면 `JourneyMapScreen`이
// 언마운트되며 `useReducer` 상태가 버려진다. 그래서 되돌아왔을 때 시트는 닫혀 있는 것이
// 정상이다. 기대를 뒤집지 않는다(계약 §3.3-4).
test("시트를 연 채 다른 탭으로 갔다 여정 탭으로 돌아오면 시트가 닫혀 있다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-home"), {});
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
});

test("시트가 열린 동안에도 탭 전환이 동작한다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveTextContent("롤플레이");
  expect(screen.queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );
});
