import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import flag from "@libitums/icons/lynx/flag-03";
import friends from "@libitums/icons/lynx/friends";
import settings from "@libitums/icons/lynx/settings";
import { color } from "@libitums/design-tokens";

import { BottomNavigator } from "./BottomNavigator";
import type { Tab } from "../app/navigation";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다(ADR-0006 D4). 계산된 스타일·레이아웃은
// jsdom이 계산하지 않으므로 여기서 단언하지 않습니다 — `toHaveClass`·`toHaveStyle`을
// 쓰지 않습니다(docs/conventions/code.md).
//
// 이 컴포넌트는 ui-lynx `BottomNavigator`의 어댑터입니다. 시각·접근성 속성·포커스
// 순서는 그 패키지의 테스트가 보고, 여기서는 **결선**만 봅니다 — 어느 탭에 어느
// 아이콘·이름·timing flag가 실리는지, 그리고 선택이 `Tab`으로 되돌아오는지.
// 그래서 testid도 ui-lynx가 찍는 이름을 그대로 씁니다.
//
// 이 파일은 `"home"` 리터럴을 한 곳도 남기지 않습니다 — `Tab`에 `"home"`이 있을
// 때도 없을 때도 tsc를 통과해야 합니다.

// ui-lynx는 아이콘 XML의 `currentColor`를 상태별 색으로 치환해 넘깁니다. 원본 문자열과
// 그대로 견주면 언제나 어긋나므로, 같은 치환을 거친 값과 견줍니다.
const unselected = (icon: string) => icon.replace(/currentColor/g, color.gray["500"]);
const selected = (icon: string) => icon.replace(/currentColor/g, color.fg["neutral-inverted"]);

test("탭 셋에 각자 제 아이콘이 실린다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  // 뒤바뀐 결선(예: settings 탭에 flag 아이콘)을 여기서 잡습니다.
  expect(screen.getByTestId("ui-lynx-bottom-navigator-icon-journey-default")).toHaveAttribute(
    "content",
    selected(flag),
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-icon-roleplay-default")).toHaveAttribute(
    "content",
    unselected(friends),
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-icon-settings-default")).toHaveAttribute(
    "content",
    unselected(settings),
  );
});

test("선택 상태가 data-selected로 노출된다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

// 성능 수집은 이 flag가 달린 update pipeline 뒤에서만 지표를 걷습니다(ADR-0019).
// 어댑터가 flag를 넘기지 않으면 측정이 조용히 아무것도 잡지 못하므로 여기서 답니다.
test("선택된 탭만 안정적인 성능 timing flag를 갖는다", () => {
  const { rerender } = render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "__lynx_timing_flag",
    "libitum:navigation:journey",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).not.toHaveAttribute(
    "__lynx_timing_flag",
  );

  rerender(<BottomNavigator tab="settings" onSelectTab={() => {}} />);

  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).not.toHaveAttribute(
    "__lynx_timing_flag",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "__lynx_timing_flag",
    "libitum:navigation:settings",
  );
});

test("탭을 tap하면 onSelectTab이 그 탭 이름으로 정확히 한 번 불린다", () => {
  const onSelectTab = vi.fn<(tab: Tab) => void>();
  render(<BottomNavigator tab="journey" onSelectTab={onSelectTab} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(1);
  expect(onSelectTab).toHaveBeenCalledWith("journey");

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(2);
  expect(onSelectTab).toHaveBeenCalledWith("roleplay");

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  expect(onSelectTab).toHaveBeenCalledTimes(3);
  expect(onSelectTab).toHaveBeenCalledWith("settings");
});

test("이미 선택된 탭을 tap해도 onSelectTab이 불린다 — 셸은 걸러내지 않는다", () => {
  const onSelectTab = vi.fn<(tab: Tab) => void>();
  render(<BottomNavigator tab="journey" onSelectTab={onSelectTab} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  expect(onSelectTab).toHaveBeenCalledTimes(1);
  expect(onSelectTab).toHaveBeenCalledWith("journey");
});

test("셸은 상태를 갖지 않는다 — 선택 표시는 tab prop에서만 파생된다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});

  // onSelectTab만 호출됐을 뿐, `tab` prop이 바뀌지 않았으므로 렌더 상태는 그대로입니다.
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

// ---------------------------------------------------------------------- 접근성
// 디자인이 라벨을 걷어 아이콘만 남겼으므로, 탭을 구분하는 이름은 전부
// `accessibility-label`에만 있습니다. 이 이름이 흐려지면 바는 스크린리더에서 구분할
// 수 없는 그림 셋이 됩니다.
//
// 선택 상태는 `accessibility-value`가 아니라 `accessibility-label`의 접미사
// (`", 선택됨"`)로 실립니다 — iOS 실기에서 `accessibility-value`가 낭독되지 않아
// 뒤집혔습니다(ADR-0016 D3과 정정 기록).

test("탭에 보이는 글자가 없다 — 이름은 accessibility-label만 진다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveTextContent("");
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveTextContent("");
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveTextContent("");
});

test("선택된 탭의 accessibility-label은 라벨 뒤에 선택됨 접미사가 붙는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "accessibility-label",
    "여정, 선택됨",
  );
});

test("비선택 탭들도 각자 자기 라벨을 accessibility-label로 갖는다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "accessibility-label",
    "롤플레이",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "accessibility-label",
    "설정",
  );
});

test("[BN1] 탭 루트 testid가 DOM 순서로 정확히 여정·롤플레이·설정이다", () => {
  const { container } = render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  const tabs = Array.from(
    container.querySelectorAll('[data-testid^="ui-lynx-bottom-navigator-item-"]'),
  ).map((el) => el.getAttribute("data-testid"));

  expect(tabs).toEqual([
    "ui-lynx-bottom-navigator-item-journey",
    "ui-lynx-bottom-navigator-item-roleplay",
    "ui-lynx-bottom-navigator-item-settings",
  ]);
});

test("[BN2] 홈 탭·아이콘이 없다", () => {
  render(<BottomNavigator tab="journey" onSelectTab={() => {}} />);

  expect(screen.queryByTestId("ui-lynx-bottom-navigator-item-home")).not.toBeInTheDocument();
  expect(
    screen.queryByTestId("ui-lynx-bottom-navigator-icon-home-default"),
  ).not.toBeInTheDocument();
});
