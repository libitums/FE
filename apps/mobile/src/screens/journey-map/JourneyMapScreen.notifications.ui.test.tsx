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

test("[JN3] 버튼과 제목이 스크롤 밖이고, 제목의 부모가 버튼을 품는다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  const scroll = screen.getByTestId("journey-map-screen-scroll");
  const title = screen.getByTestId("journey-map-screen-title");
  const button = screen.getByTestId("journey-map-screen-notifications");

  expect(within(scroll).queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("journey-map-screen-notifications")).not.toBeInTheDocument();

  expect(title.parentElement).not.toBeNull();
  expect(title.parentElement).toContainElement(button);
});

// JN4 — 배지 0건, 보이는 낱말은 정확히 「알림」입니다.
test("[JN4] 버튼 자손이 내용 줄 하나 · svg 하나 · text 하나(그 순서)뿐이고, 가림 없음", () => {
  render(<JourneyMapScreen {...fixture()} />);

  const button = screen.getByTestId("journey-map-screen-notifications");
  const buttonChildren = Array.from(button.children);
  expect(buttonChildren).toHaveLength(1);

  const contentRow = buttonChildren[0];
  const contentChildren = Array.from(contentRow.children);
  expect(contentChildren).toHaveLength(2);
  expect(contentChildren[0].tagName.toLowerCase()).toBe("svg");
  expect(contentChildren[1].tagName.toLowerCase()).toBe("text");

  expect(button.textContent).toBe("알림");

  for (const el of [contentRow, contentChildren[0], contentChildren[1]]) {
    expect(el).not.toHaveAttribute("accessibility-element");
    expect(el).not.toHaveAttribute("accessibility-traits");
    expect(el).not.toHaveAttribute("accessibility-label");
    expect(el).not.toHaveAttribute("accessibility-elements-hidden");
  }
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

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});

  expect(screen.getByTestId("journey-map-screen-actions")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("journey-map-screen-notifications")).toBeInTheDocument();
});

test("[JN7] 시트 닫기 → journey-map-screen-actions가 다시 false다", () => {
  render(<JourneyMapScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
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
test("[JN8] header trait를 가진 요소가 journey-map-screen-title 하나다", () => {
  const { container } = render(<JourneyMapScreen {...fixture()} />);

  const headers = container.querySelectorAll('[accessibility-traits="header"]');
  expect(headers).toHaveLength(1);
  expect(headers[0]).toBe(screen.getByTestId("journey-map-screen-title"));
});

test("[JN9] DOM 순서 — 제목 → 버튼 → 스크롤", () => {
  render(<JourneyMapScreen {...fixture()} />);

  const title = screen.getByTestId("journey-map-screen-title");
  const button = screen.getByTestId("journey-map-screen-notifications");
  const scroll = screen.getByTestId("journey-map-screen-scroll");

  expect(title.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(button.compareDocumentPosition(scroll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
