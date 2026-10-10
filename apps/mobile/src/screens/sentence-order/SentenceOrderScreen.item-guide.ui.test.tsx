import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { guideRoots, stubGuideStorage } from "../../lib/learning-item-guide.storage.test-support";
import type { JourneyStepId } from "../journey-map/journey-map";
import { SentenceOrderScreen } from "./SentenceOrderScreen";

// `ui` 계층: 문장 만들기 화면의 학습 문항 안내. 문항은 제품 표의 실물이다(대상 판정이 제품 데이터와
// 맞는지는 unit의 TG가 본다) — greeting은 조각 하나, ordering · appointment · directions는 둘 이상.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function renderScreen(stepId: JourneyStepId = "greeting") {
  const props = { onExit: vi.fn<() => void>(), onFinish: vi.fn() };
  render(<SentenceOrderScreen stepId={stepId} {...props} />);
  return props;
}

const guide = () => screen.queryByTestId("learning-item-guide-sentence-order");
const shellRoot = () => screen.getByTestId("learning-shell");
const tapGuide = () =>
  fireEvent.tap(screen.getByTestId("learning-item-guide-sentence-order"), {
    eventType: "catchEvent",
  });
const pressBack = (): boolean => {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
};

test("[SC1·SO] 안 본 저장소에서 greeting을 열면 안내가 하나 서고, 화면 루트가 가려지며, 안내는 루트의 자손이 아니다", () => {
  stubGuideStorage();
  renderScreen();

  expect(guideRoots()).toHaveLength(1);
  expect(guide()).not.toBeNull();
  expect(shellRoot()).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(shellRoot().contains(guide())).toBe(false);
});

test("[SC2·SO] 안내를 탭하면 사라지고, 루트의 가림은 false로 남으며, 그 종류가 저장된다", () => {
  const double = stubGuideStorage();
  renderScreen();

  tapGuide();

  expect(guide()).toBeNull();
  expect(shellRoot()).toHaveAttribute("accessibility-elements-hidden", "false");
  expect(double.savedKinds()).toEqual(["sentence-order"]);
});

test("[SC3·SO] 뒤로가기 한 번은 안내만 닫고, 한 번 더는 화면의 닫기(나가기 확인창)다", () => {
  stubGuideStorage();
  const props = renderScreen();

  expect(pressBack()).toBe(true);

  expect(guide()).toBeNull();
  expect(props.onExit).not.toHaveBeenCalled();
  expect(screen.queryByTestId("ui-lynx-dialog")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();

  expect(pressBack()).toBe(true);
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
  expect(props.onExit).not.toHaveBeenCalled();
});

test("[SC4·SO] 그 종류를 이미 봤으면 안내가 없고 루트가 가려지지 않는다", () => {
  stubGuideStorage({ seen: ["sentence-order"] });
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
  expect(shellRoot().getAttribute("accessibility-elements-hidden")).not.toBe("true");
});

test("[SC5·SO] 저장소가 없으면 안내가 없다", () => {
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
  expect(screen.getByTestId("sentence-order-chip-0")).toBeInTheDocument();
});

test("[SO6] 떠 있는 동안 조각을 탭해도 답 칸이 비고 아래 버튼이 없으며, 닫은 뒤에는 끝까지 풀 수 있다", () => {
  stubGuideStorage();
  const props = renderScreen();

  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});

  expect(screen.getByTestId("sentence-order-screen-sentence").children).toHaveLength(0);
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();

  tapGuide();
  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});
  expect(
    within(screen.getByTestId("sentence-order-screen-sentence")).getByTestId(
      "sentence-order-chip-0",
    ),
  ).toBeInTheDocument();
  for (const label of ["Check", "Next", "See results"]) {
    const action = screen.getByTestId("learning-shell-action");
    expect(action).toHaveAttribute("accessibility-label", label);
    fireEvent.tap(action, {});
  }
  expect(props.onFinish).toHaveBeenCalledTimes(1);
});

test.each(["ordering", "appointment", "directions"] as const)(
  "[SO7] %s(조각이 둘 이상)는 안내가 없고 안내 키에 쓰지 않는다",
  (stepId) => {
    const double = stubGuideStorage();
    renderScreen(stepId);

    expect(guideRoots()).toHaveLength(0);
    expect(double.guideWrites()).toHaveLength(0);
    expect(double.set).not.toHaveBeenCalled();
  },
);
