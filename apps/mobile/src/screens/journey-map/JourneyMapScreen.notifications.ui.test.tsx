import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). `toHaveClass`·`toHaveStyle`을
// 쓰지 않습니다. 텍스트 질의(`getByText`)를 쓰지 않습니다 — testid로 질의합니다.
//
// fixture는 기존 여정 맵 테스트의 공통 props + onOpenNotifications입니다.

function fixture(overrides: { onOpenNotifications?: () => void } = {}) {
  return {
    completedStepCount: 2,
    onStartStep: vi.fn(),
    completedMessengerUnitIds: [] as const,
    onStartMessengerUnit: vi.fn(),
    completedPhoneCallUnitIds: [] as const,
    onStartPhoneCallUnit: vi.fn(),
    onOpenNotifications: overrides.onOpenNotifications ?? vi.fn(),
  };
}

test("[JN1] journey-map-screen-notifications의 접근성 채널이 정확하다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  const button = screen.getByTestId("journey-map-screen-notifications");
  expect(button).toHaveAttribute("accessibility-element", "true");
  expect(button).toHaveAttribute("accessibility-traits", "button");
  expect(button).toHaveAttribute("accessibility-label", "알림");
});

test("[JN2] 버튼 tap → onOpenNotifications 정확히 1회, onStartStep·onStartMessengerUnit 0회", () => {
  const onOpenNotifications = vi.fn();
  const onStartStep = vi.fn();
  const onStartMessengerUnit = vi.fn();
  render(
    <JourneyMapScreen
      completedStepCount={2}
      onStartStep={onStartStep}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={onStartMessengerUnit}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={vi.fn()}
      onOpenNotifications={onOpenNotifications}
    />,
  );

  fireEvent.tap(screen.getByTestId("journey-map-screen-notifications"), {});

  expect(onOpenNotifications).toHaveBeenCalledTimes(1);
  expect(onStartStep).not.toHaveBeenCalled();
  expect(onStartMessengerUnit).not.toHaveBeenCalled();
});

test("[JN3] 버튼이 스크롤 밖 머리 상자 안에 있다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  const scroll = screen.getByTestId("journey-map-screen-scroll");
  const actions = screen.getByTestId("journey-map-screen-actions");
  const button = screen.getByTestId("journey-map-screen-notifications");

  expect(within(scroll).queryByTestId("journey-map-screen-actions")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("journey-map-screen-notifications")).not.toBeInTheDocument();

  // 가림(ADR-0016 D9)이 이 상자에 걸리므로 버튼이 그 자손이어야 실제로 가려집니다.
  expect(actions).toContainElement(button);
});

// JN4 — 버튼이 아이콘 하나뿐입니다(2026-09-27 상단 바 디자인). 보이는 낱말이 없으므로
// 이름은 `accessibility-label`이 혼자 집니다 — 그래서 아이콘이 이름을 가로채지 않는지,
// 즉 자기 접근성 속성을 하나도 걸치지 않았는지를 답니다.
test("[JN4] 버튼 자손이 svg 하나뿐이고, 그 아이콘이 접근성 속성을 걸치지 않는다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  const button = screen.getByTestId("journey-map-screen-notifications");
  const buttonChildren = Array.from(button.children);
  expect(buttonChildren).toHaveLength(1);
  expect(buttonChildren[0].tagName.toLowerCase()).toBe("svg");

  // 보이는 낱말이 없습니다 — 있으면 이름이 둘로 갈립니다.
  expect(button.textContent).toBe("");

  expect(buttonChildren[0]).not.toHaveAttribute("accessibility-element");
  expect(buttonChildren[0]).not.toHaveAttribute("accessibility-traits");
  expect(buttonChildren[0]).not.toHaveAttribute("accessibility-label");
  expect(buttonChildren[0]).not.toHaveAttribute("accessibility-elements-hidden");
});

test("[JN5] 시트가 닫혀 있을 때 journey-map-screen-actions의 accessibility-elements-hidden이 false다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  expect(screen.getByTestId("journey-map-screen-actions")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

test("[JN6] 스텝을 tap해 시트를 열면 journey-map-screen-actions가 true가 되고, 버튼은 여전히 문서에 있다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});

  expect(screen.getByTestId("journey-map-screen-actions")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("journey-map-screen-notifications")).toBeInTheDocument();
});

test("[JN7] 시트 닫기 → journey-map-screen-actions가 다시 false다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  expect(screen.getByTestId("journey-map-screen-actions")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(screen.getByTestId("journey-map-screen-actions")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

// JN8 (가드) — 버튼은 제목이 아닙니다. 스캐폴드에서도 green이어야 합니다.
//
// header가 화면 제목 하나였는데 에피소드 헤더가 늘었습니다(2026-09-26). 에피소드
// 헤더는 실제로 그 구획의 제목이라 trait가 맞습니다 — 이 가드가 지키려던 것은
// 「제목이 하나」가 아니라 **「버튼이 제목 행세를 하지 않는다」** 였으므로, 세는 대신
// 알림 버튼이 그 목록에 없다는 것을 답니다.
test("[JN8] header trait를 가진 요소에 알림 버튼이 없다", () => {
  const { container } = render(<JourneyMapScreen {...fixture()} />);

  const headers = [...container.querySelectorAll('[accessibility-traits="header"]')];

  expect(headers).toContain(screen.getAllByTestId("ui-lynx-episode-header")[0]);
  expect(headers).not.toContain(screen.getByTestId("journey-map-screen-notifications"));
});

test("[JN9] DOM 순서 — 머리 → 스크롤", () => {
  render(<JourneyMapScreen {...fixture()} />);

  const actions = screen.getByTestId("journey-map-screen-actions");
  const button = screen.getByTestId("journey-map-screen-notifications");
  const scroll = screen.getByTestId("journey-map-screen-scroll");

  expect(actions).toContainElement(button);
  expect(button.compareDocumentPosition(scroll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
