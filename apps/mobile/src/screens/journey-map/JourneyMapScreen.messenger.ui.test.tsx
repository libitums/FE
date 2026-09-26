import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";

it("C1: special 항목은 appointment와 directions 사이에 삽입된다", () => {
  const props = {
    completedStepCount: 2,
    onStartStep: vi.fn(),
    completedMessengerUnitIds: [] as const,
    onStartMessengerUnit: vi.fn(),
    completedPhoneCallUnitIds: [] as const,
    onStartPhoneCallUnit: vi.fn(),
    // onOpenNotifications도 필수 prop이라 채웁니다 — 이 테스트의 단언과는 무관합니다.
    onOpenNotifications: vi.fn(),
  };
  render(<JourneyMapScreen {...props} />);

  const map = screen.getByTestId("journey-map-screen-map");
  expect(
    [
      ...map.querySelectorAll(
        [
          "[data-testid=ui-lynx-learning-unit-greeting]",
          "[data-testid=ui-lynx-learning-unit-introduction]",
          "[data-testid=ui-lynx-learning-unit-ordering]",
          "[data-testid=ui-lynx-learning-unit-appointment]",
          "[data-testid=ui-lynx-learning-unit-appointment-confirmation]",
          "[data-testid=ui-lynx-learning-unit-directions]",
        ].join(","),
      ),
    ].map((node) => node.getAttribute("data-testid")),
  ).toEqual([
    "ui-lynx-learning-unit-greeting",
    "ui-lynx-learning-unit-introduction",
    "ui-lynx-learning-unit-ordering",
    "ui-lynx-learning-unit-appointment",
    "ui-lynx-learning-unit-appointment-confirmation",
    "ui-lynx-learning-unit-directions",
  ]);
});

it("C2: special 뒤 directions는 자기 스텝 서수의 기존 상태와 조작 가능성을 유지한다", () => {
  const onStartStep = vi.fn();
  const onStartMessengerUnit = vi.fn();
  const fixture = {
    completedStepCount: 2,
    onStartStep,
    completedMessengerUnitIds: [] as const,
    onStartMessengerUnit,
    completedPhoneCallUnitIds: [] as const,
    onStartPhoneCallUnit: vi.fn(),
    onOpenNotifications: vi.fn(),
  };
  render(<JourneyMapScreen {...fixture} />);
  const directions = screen.getByTestId("ui-lynx-learning-unit-directions");
  expect(directions).toHaveAttribute("data-status", "default");
  const special = screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation");
  expect(special).toHaveAttribute("data-status", "available");
  fireEvent.tap(special, {});
  expect(onStartMessengerUnit).toHaveBeenCalledWith("appointment-confirmation");
  fireEvent.tap(directions, {});
  expect(onStartStep).not.toHaveBeenCalled();
});

it("C3: directions의 실제 접근성 이름과 조작 불가 trait를 리터럴로 낸다", () => {
  const fixture = {
    completedStepCount: 2,
    onStartStep: vi.fn(),
    completedMessengerUnitIds: [] as const,
    onStartMessengerUnit: vi.fn(),
    completedPhoneCallUnitIds: [] as const,
    onStartPhoneCallUnit: vi.fn(),
    onOpenNotifications: vi.fn(),
  };
  render(<JourneyMapScreen {...fixture} />);
  const directions = screen.getByTestId("ui-lynx-learning-unit-directions");
  expect(directions).toHaveAttribute("accessibility-label", "길 묻기, 잠김");
  expect(directions).toHaveAttribute("accessibility-traits", "disabled");
});
