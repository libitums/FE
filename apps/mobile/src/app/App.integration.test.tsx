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
