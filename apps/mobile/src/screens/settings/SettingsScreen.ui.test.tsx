import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { SettingsScreen } from "./SettingsScreen";
import { settingsNavTargets } from "./settings";
import {
  initialSessionOptions,
  sessionOptionKeys,
  sessionOptionStateLabel,
} from "../../lib/session-options";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 이 화면은 제목 텍스트 하나와 흐름 영역의 목록 상자를 그립니다 (screens.contract.ts).
//
// `SettingsScreenProps`가 필수 prop 셋을 요구합니다. 기존 8케이스는 단언을 한 글자도
// 안 바꾸고 `render(<SettingsScreen />)`에 `defaultSettingsScreenProps`(초기값·
// no-op 콜백 둘)만 채웁니다.
const defaultSettingsScreenProps = {
  sessionOptions: initialSessionOptions,
  onSelectNavTarget: () => undefined,
  onToggleSessionOption: () => undefined,
};

test("설정 화면이 제목을 렌더한다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("설정");
});

// 재고정 2026-09-02: 제목 다섯이 같은 방식으로 heading이 됩니다 (screens.contract.ts).
test("설정 화면 제목이 accessibility-traits header를 갖는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// ---------------------------------------------------------------- 스크롤 영역
//
// 설정의 흐름 자식은 목록 상자 하나입니다. 고정은 제목 <text> 하나입니다.

test("[U1] settings-screen-scroll이 존재한다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-scroll")).toBeInTheDocument();
});

test("[U3] settings-screen-title이 스크롤 컨테이너 밖에 있다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const scroll = screen.getByTestId("settings-screen-scroll");
  expect(within(scroll).queryByTestId("settings-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재
//
// 「없음」을 지키는 회귀 그물입니다. 오늘의 구현은 이 넷을 하나도 붙이지 않습니다
// — **red가 없는 것이 이 케이스의 성질입니다.** 다음 편집이 넷 중 하나라도
// 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가 아니라 계약으로
// 되돌아가라는 신호입니다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const scroll = screen.getByTestId("settings-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 세로 동작
//
// `<scroll-view>`는 `scroll-orientation` prop이 없으면 `_enableScrollY` 초기값이
// NO라 세로 스크롤이 원리적으로 불가능합니다. jsdom은 레이아웃이 없어 실제로
// 스크롤되는지는 이 계층이 원리적으로 못 봅니다(실기가 답합니다).
//
// U11의 기댓값이 문자열 "true"인 이유: `@lynx-js/testing-environment`의
// `__SetAttribute`(ElementPAPI.js:87~89)가 boolean을 `JSON.stringify`로
// 직렬화합니다.

test("[U9] settings-screen-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

test("[U11] settings-screen-scroll에 scroll-bar-enable='true'가 붙는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-scroll")).toHaveAttribute("scroll-bar-enable", "true");
});

// U10 — 목록 상자 하나(`settings-screen-list`)를 그 자리에 세워도 **직계 자식은
// 하나**이므로 이 케이스는 계속 green입니다(ADR-0022 D4).
test("[U10] 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

// ---------------------------------------------------------------- 이동 항목 둘 · 토글 항목 둘
//
// 기대값은 `settingsNavLabel`·`sessionOptionStateLabel` 등 실제 순수 함수의
// 결과로 비교합니다 — 문구 리터럴을 이 파일이 다시 짓지 않습니다.

test("[ST1] settings-screen-list가 스크롤의 유일한 직계 요소 자식이다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const scroll = screen.getByTestId("settings-screen-scroll");
  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toHaveAttribute("data-testid", "settings-screen-list");
});

test("[ST2] 목록 상자 안 DOM 순서가 이동 둘 → 토글 둘이다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const list = screen.getByTestId("settings-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual([
    ...settingsNavTargets.map((target) => `settings-nav-item-${target}`),
    ...sessionOptionKeys.map((key) => `settings-toggle-item-${key}`),
  ]);
});

test("[ST3] 이동 항목 tap → onSelectNavTarget 1회 · 토글 tap → onToggleSessionOption 1회, 서로 침범하지 않는다", () => {
  const onSelectNavTarget = vi.fn();
  const onToggleSessionOption = vi.fn();
  render(
    <SettingsScreen
      sessionOptions={initialSessionOptions}
      onSelectNavTarget={onSelectNavTarget}
      onToggleSessionOption={onToggleSessionOption}
    />,
  );

  fireEvent.tap(screen.getByTestId(`settings-nav-item-${settingsNavTargets[0]}`), {});
  expect(onSelectNavTarget).toHaveBeenCalledTimes(1);
  expect(onSelectNavTarget).toHaveBeenCalledWith(settingsNavTargets[0]);
  expect(onToggleSessionOption).not.toHaveBeenCalled();

  fireEvent.tap(screen.getByTestId(`settings-toggle-item-${sessionOptionKeys[0]}`), {});
  expect(onToggleSessionOption).toHaveBeenCalledTimes(1);
  expect(onToggleSessionOption).toHaveBeenCalledWith(sessionOptionKeys[0]);
  expect(onSelectNavTarget).toHaveBeenCalledTimes(1);
});

// ST4 (가드) — 이동·토글 항목은 제목이 아닙니다. 목록 상자가 서기 전에도 제목
// 하나는 이미 있어 green입니다.
test("[ST4] 화면 안 header trait 요소가 settings-screen-title 하나다", () => {
  const { container } = render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const headers = container.querySelectorAll('[accessibility-traits="header"]');
  expect(headers).toHaveLength(1);
  expect(headers[0]).toBe(screen.getByTestId("settings-screen-title"));
});

// ST5 — 섞인 fixture입니다. 둘 다 켜짐이 아닌 값으로 상태가 실제로 내려가는지를
// 봅니다(⚠ 둘 다 켜짐 fixture로는 옳은 배선과 「값을 안 읽고 상수를 그린다」가
// 구별되지 않습니다).
test("[ST5] 섞인 fixture에서 토글 값이 실제로 내려간다", () => {
  render(
    <SettingsScreen
      sessionOptions={{ "auto-play-audio": false, "show-transcript": true }}
      onSelectNavTarget={() => undefined}
      onToggleSessionOption={() => undefined}
    />,
  );

  const autoPlay = screen.getByTestId("settings-toggle-item-auto-play-audio");
  expect(autoPlay).toHaveAttribute("data-checked", "false");
  expect(screen.getByTestId("settings-toggle-item-state-auto-play-audio")).toHaveTextContent(
    sessionOptionStateLabel(false),
  );

  const transcript = screen.getByTestId("settings-toggle-item-show-transcript");
  expect(transcript).toHaveAttribute("data-checked", "true");
  expect(screen.getByTestId("settings-toggle-item-state-show-transcript")).toHaveTextContent(
    sessionOptionStateLabel(true),
  );
});
