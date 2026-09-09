import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";

it("C1: special 항목은 appointment와 directions 사이에 삽입된다", () => {
  const props = {
    completedStepCount: 2,
    onStartStep: vi.fn(),
    completedMessengerUnitIds: [] as const,
    onStartMessengerUnit: vi.fn(),
  };
  render(<JourneyMapScreen {...props} />);

  const map = screen.getByTestId("journey-map-screen-map");
  expect(
    [
      ...map.querySelectorAll(
        [
          "[data-testid=journey-step-node-greeting]",
          "[data-testid=journey-step-node-introduction]",
          "[data-testid=journey-step-node-ordering]",
          "[data-testid=journey-step-node-appointment]",
          "[data-testid=journey-messenger-item-appointment-confirmation]",
          "[data-testid=journey-step-node-directions]",
        ].join(","),
      ),
    ].map((node) => node.getAttribute("data-testid")),
  ).toEqual([
    "journey-step-node-greeting",
    "journey-step-node-introduction",
    "journey-step-node-ordering",
    "journey-step-node-appointment",
    "journey-messenger-item-appointment-confirmation",
    "journey-step-node-directions",
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
  };
  render(<JourneyMapScreen {...fixture} />);
  const directions = screen.getByTestId("journey-step-node-directions");
  expect(directions).toHaveAttribute("data-status", "locked");
  const special = screen.getByTestId("journey-messenger-item-appointment-confirmation");
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
  };
  render(<JourneyMapScreen {...fixture} />);
  const directions = screen.getByTestId("journey-step-node-directions");
  expect(directions).toHaveAttribute("accessibility-label", "길 묻기, 잠김");
  expect(directions).toHaveAttribute("accessibility-traits", "disabled");
});
