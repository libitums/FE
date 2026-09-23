import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import map from "@libitums/icons/lynx/map";
import userGroup from "@libitums/icons/lynx/user-group";
import settings from "@libitums/icons/lynx/settings";
import { color } from "@libitums/design-tokens";

import { BottomNavigator } from "./BottomNavigator";
import type { Tab } from "../app/navigation";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다(ADR-0006 D4). 계산된 스타일·레이아웃은
// jsdom이 계산하지 않으므로 여기서 단언하지 않습니다 — `toHaveClass`·`toHaveStyle`을
// 쓰지 않습니다(docs/conventions/code.md).
//
// 선택 지시선(`.bottom-navigator-indicator`)은 testid가 없고 항상 렌더되므로
// 존재 자체는 여기서 단언하지 않습니다 — 실패할 수 없는 단언은 검증이 아닙니다.
// 다만 그 위에 붙는 `accessibility-elements-hidden`의 재부착 여부는 아래에서 클래스
// 셀렉터로 찾아 봅니다.
//
// 이 파일은 `"home"` 리터럴을 한 곳도 남기지 않습니다 — `Tab`에 `"home"`이 있을
// 때도 없을 때도 tsc를 통과해야 합니다.

test("탭 셋이 렌더되고 각자 라벨을 갖는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveTextContent("여정");
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveTextContent("롤플레이");
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveTextContent("설정");
});

test("아이콘 셋이 자기 패키지 모듈 문자열을 content 속성으로 갖는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  // 뒤바뀐 결선(예: settings 탭에 map 아이콘)을 여기서 잡습니다.
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
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("선택된 탭만 안정적인 성능 timing flag를 갖는다", () => {
  const { rerender } = render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "__lynx_timing_flag",
    "libitum:navigation:journey",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).not.toHaveAttribute(
    "__lynx_timing_flag",
  );

  rerender(<BottomNavigator tab="settings" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-journey")).not.toHaveAttribute(
    "__lynx_timing_flag",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "__lynx_timing_flag",
    "libitum:navigation:settings",
  );
});

test("탭을 tap하면 onSelectTab이 그 탭 이름으로 정확히 한 번 불린다", () => {
  const onSelectTab = vi.fn<(tab: Tab) => void>();
  render(<BottomNavigator tab="journey" onSelectTab={onSelectTab} />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(1);
  expect(onSelectTab).toHaveBeenCalledWith("journey");

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(2);
  expect(onSelectTab).toHaveBeenCalledWith("roleplay");

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(3);
  expect(onSelectTab).toHaveBeenCalledWith("settings");
});

test("이미 선택된 탭을 tap해도 onSelectTab이 불린다 — 셸은 걸러내지 않는다", () => {
  const onSelectTab = vi.fn<(tab: Tab) => void>();
  render(<BottomNavigator tab="journey" onSelectTab={onSelectTab} />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(onSelectTab).toHaveBeenCalledTimes(1);
  expect(onSelectTab).toHaveBeenCalledWith("journey");
});

test("아이콘 색이 선택 상태에 따라 갈린다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  const selectedIcon = screen.getByTestId("bottom-navigator-icon-journey");
  expect(selectedIcon).toHaveAttribute("current-color", color.fg.brand);

  const roleplay = screen.getByTestId("bottom-navigator-icon-roleplay");
  const settingsIcon = screen.getByTestId("bottom-navigator-icon-settings");
  expect(roleplay).toHaveAttribute("current-color", color.fg["neutral-muted"]);
  expect(settingsIcon).toHaveAttribute("current-color", color.fg["neutral-muted"]);
});

test("셸은 상태를 갖지 않는다 — 선택 표시는 tab prop에서만 파생된다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});

  // onSelectTab만 호출됐을 뿐, `tab` prop이 바뀌지 않았으므로 렌더 상태는 그대로입니다.
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

// ---------------------------------------------------------------------- 접근성 (2026-09-02)
// `data-selected`·`current-color`와 같은 대우로 선택/비선택 두 상태 모두에서 봅니다.
//
// 선택 상태는 `accessibility-value`가 아니라 `accessibility-label`의 접미사
// (`", 선택됨"`)로 실립니다 — iOS 실기에서 `accessibility-value`가 낭독되지 않아
// 뒤집혔습니다(ADR-0016 D3과 정정 기록). `accessibility-value`는 어느 상태에서도
// 붙지 않으므로 부재 단언도 두지 않습니다.

test("선택된 탭의 accessibility-label은 라벨 뒤에 선택됨 접미사가 붙는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "accessibility-label",
    "여정, 선택됨",
  );
});

test("비선택 탭들도 각자 자기 라벨을 accessibility-label로 갖는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "accessibility-label",
    "롤플레이",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "accessibility-label",
    "설정",
  );
});

test("탭 셋 모두 accessibility-traits가 button이다 — 선택 여부로 갈리지 않는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

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

test("탭 셋 모두 accessibility-element가 true다 — 선택 여부로 갈리지 않는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

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

// accessibility-elements-hidden의 iOS 세터는 view.accessibilityElementsHidden이라
// 가리는 대상이 자손입니다. 탭 아이콘 셋은 자손 없는 잎 `<svg>`이므로 이 속성을
// 붙여도 아무것도 가리지 못합니다 — 붙이지 않는 것이 계약입니다(E-A1, E-A2).
// 지시선 `<view>`는 이 표적 밖입니다 — 아래 별도 테스트가 봅니다.
test("아이콘 셋에 accessibility-elements-hidden이 붙지 않는다 — 잎이다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("bottom-navigator-icon-journey")).not.toHaveAttribute(
    "accessibility-elements-hidden",
  );
  expect(screen.getByTestId("bottom-navigator-icon-roleplay")).not.toHaveAttribute(
    "accessibility-elements-hidden",
  );
  expect(screen.getByTestId("bottom-navigator-icon-settings")).not.toHaveAttribute(
    "accessibility-elements-hidden",
  );
});

// 선택 지시선 `<view>`도 자식이 0개인 잎입니다 — 자손 기준으로 가릴 것이 없습니다.
// `enableAccessibilityByDefault`가 iOS에서 기본 NO이고 `accessibility-element`
// prop이 없어 자기 자신 기준으로도 켜질 경로가 없습니다(LynxUIView.m:116,
// LynxUI.m:2580~2587). 위 아이콘 잎 셋과 같은 종류의 죽은 선언이므로 여기서 붙지
// 않는다고 단언합니다. testid가 없어 클래스 셀렉터로 찾습니다 —
// ListeningChoice.ui.test.tsx의 `.listening-choice-mark` 선례와 같은 형태입니다.
test("지시선에 accessibility-elements-hidden이 붙지 않는다 — 잎이다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  const tab = screen.getByTestId("bottom-navigator-tab-journey");
  const indicator = tab.querySelector<HTMLElement>(".bottom-navigator-indicator");

  expect(tab).toContainElement(indicator);
  expect(indicator).not.toHaveAttribute("accessibility-elements-hidden");
});

test("[BN1] 탭 루트 testid가 DOM 순서로 정확히 여정·롤플레이·설정이다", () => {
  const { container } = render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  const tabs = Array.from(container.querySelectorAll('[data-testid^="bottom-navigator-tab-"]')).map(
    (el) => el.getAttribute("data-testid"),
  );

  expect(tabs).toEqual([
    "bottom-navigator-tab-journey",
    "bottom-navigator-tab-roleplay",
    "bottom-navigator-tab-settings",
  ]);
});

test("[BN2] 홈 탭·아이콘이 없다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.queryByTestId("bottom-navigator-tab-home")).not.toBeInTheDocument();
  expect(screen.queryByTestId("bottom-navigator-icon-home")).not.toBeInTheDocument();
});
