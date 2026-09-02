import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import house from "@libitums/icons/lynx/house";
import map from "@libitums/icons/lynx/map";
import userGroup from "@libitums/icons/lynx/user-group";
import settings from "@libitums/icons/lynx/settings";
import { color } from "@libitums/design-tokens";

import { BottomNavigator } from "./BottomNavigator";
import type { Tab } from "../app/navigation";

// `ui` 계층: 렌더 결과와 상호작용만 본다 (ADR-0006 D4). 계산된 스타일·레이아웃은
// jsdom이 계산하지 않으므로 여기서 단언하지 않는다 — `toHaveClass`·`toHaveStyle`을
// 쓰지 않는다 (docs/conventions/code.md).
//
// 선택 지시선(`.bottom-navigator-indicator`)은 testid가 없고 항상 렌더되므로
// 여기서 존재를 단언하지 않는다 — 실패할 수 없는 단언은 검증이 아니다
// (bottom-navigator.contract.ts 5번, testids.contract.ts).

test("탭 넷이 렌더되고 각자 라벨을 갖는다", () => {
  render(<BottomNavigator tab="home" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveTextContent("홈");
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveTextContent("여정");
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveTextContent("롤플레이");
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveTextContent("설정");
});

test("아이콘 넷이 자기 패키지 모듈 문자열을 content 속성으로 갖는다", () => {
  render(<BottomNavigator tab="home" onSelectTab={() => {}} />);

  // 뒤바뀐 결선(예: journey 탭에 house 아이콘)을 여기서 잡는다.
  expect(screen.getByTestId("bottom-navigator-icon-home")).toHaveAttribute("content", house);
  expect(screen.getByTestId("bottom-navigator-icon-journey")).toHaveAttribute("content", map);
  expect(screen.getByTestId("bottom-navigator-icon-roleplay")).toHaveAttribute(
    "content",
    userGroup,
  );
  expect(screen.getByTestId("bottom-navigator-icon-settings")).toHaveAttribute("content", settings);
});

test("선택 상태가 data-selected로 노출된다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "false");
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("탭을 tap하면 onSelectTab이 그 탭 이름으로 정확히 한 번 불린다", () => {
  const onSelectTab = vi.fn<(tab: Tab) => void>();
  render(<BottomNavigator tab="home" onSelectTab={onSelectTab} />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-home"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(1);
  expect(onSelectTab).toHaveBeenCalledWith("home");

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(2);
  expect(onSelectTab).toHaveBeenCalledWith("journey");

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(3);
  expect(onSelectTab).toHaveBeenCalledWith("roleplay");

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(4);
  expect(onSelectTab).toHaveBeenCalledWith("settings");
});

test("이미 선택된 탭을 tap해도 onSelectTab이 불린다 — 셸은 걸러내지 않는다", () => {
  const onSelectTab = vi.fn<(tab: Tab) => void>();
  render(<BottomNavigator tab="home" onSelectTab={onSelectTab} />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-home"), {});

  expect(onSelectTab).toHaveBeenCalledTimes(1);
  expect(onSelectTab).toHaveBeenCalledWith("home");
});

test("아이콘 색이 선택 상태에 따라 갈린다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  const selectedIcon = screen.getByTestId("bottom-navigator-icon-journey");
  expect(selectedIcon).toHaveAttribute("current-color", color.fg.brand);

  const home = screen.getByTestId("bottom-navigator-icon-home");
  const roleplay = screen.getByTestId("bottom-navigator-icon-roleplay");
  const settingsIcon = screen.getByTestId("bottom-navigator-icon-settings");
  expect(home).toHaveAttribute("current-color", color.fg["neutral-muted"]);
  expect(roleplay).toHaveAttribute("current-color", color.fg["neutral-muted"]);
  expect(settingsIcon).toHaveAttribute("current-color", color.fg["neutral-muted"]);
});

test("셸은 상태를 갖지 않는다 — 선택 표시는 tab prop에서만 파생된다", () => {
  render(<BottomNavigator tab="home" onSelectTab={() => {}} />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  // onSelectTab만 호출됐을 뿐, `tab` prop이 바뀌지 않았으므로 렌더 상태는 그대로다.
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "true");
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

// ---------------------------------------------------------------- 접근성 (재고정 2026-09-02)
// 수용 기준 8. `data-selected`·`current-color`와 같은 대우로 선택/비선택 두 상태
// 모두에서 본다 (bottom-navigator.contract.ts 6~9번, spec.md §6.3 7·8).

test("선택된 탭의 accessibility-label이 자기 라벨이다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "accessibility-label",
    "여정",
  );
});

test("비선택 탭들도 각자 자기 라벨을 accessibility-label로 갖는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute(
    "accessibility-label",
    "홈",
  );
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "accessibility-label",
    "롤플레이",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "accessibility-label",
    "설정",
  );
});

test("탭 넷 모두 accessibility-traits가 button이다 — 선택 여부로 갈리지 않는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute(
    "accessibility-traits",
    "button",
  );
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "accessibility-traits",
    "button",
  );
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "accessibility-traits",
    "button",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "accessibility-traits",
    "button",
  );
});

test("선택된 탭만 accessibility-value가 선택됨이고 나머지 셋은 그 속성이 아예 없다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "accessibility-value",
    "선택됨",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).not.toHaveAttribute(
    "accessibility-value",
  );
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).not.toHaveAttribute(
    "accessibility-value",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).not.toHaveAttribute(
    "accessibility-value",
  );
});

test("탭 넷 모두 accessibility-element가 true다 — 선택 여부로 갈리지 않는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute(
    "accessibility-element",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "accessibility-element",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "accessibility-element",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "accessibility-element",
    "true",
  );
});

test("아이콘 넷이 접근성 트리에서 빠진다 — 순수 장식이다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-icon-home")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-icon-journey")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-icon-roleplay")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-icon-settings")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
});
