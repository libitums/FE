import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { guideRoots, stubGuideStorage } from "../../lib/learning-item-guide.storage.test-support";
import { writingPassCriterion } from "../../lib/writing-judge";
import type { WritingQuestion } from "../../lib/writing-session";
import type { JourneyStepId } from "../journey-map/journey-map";
import { WritingScreen } from "./WritingScreen";

// `ui` 계층: 쓰기 화면의 학습 문항 안내. 첫 문항이 optionalPractice일 때만 뜨고, 떠 있는 동안
// 획이 상태에 들어가지 않는다. ⟨2026-10-19⟩ 쓰기에는 `Skip`이 없다(사용자 결정) — 판정할 수 없을 때만
// `Next`로 넘어간다. 문항은 대역이다.

const OPTIONAL: readonly WritingQuestion[] = [
  {
    id: "optional",
    before: "내일 만",
    syllables: ["나"],
    after: "요",
    translation: "See you tomorrow.",
    optionalPractice: true,
    passCriterion: writingPassCriterion,
  },
];
const PLAIN: readonly WritingQuestion[] = [
  {
    id: "one",
    before: "앞 ",
    syllables: ["가", "나"],
    after: ".",
    translation: "First.",
    passCriterion: writingPassCriterion,
  },
  {
    id: "two",
    before: "",
    syllables: ["다"],
    after: "!",
    translation: "Second.",
    passCriterion: writingPassCriterion,
  },
];

vi.mock("./writing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./writing")>();
  return {
    ...actual,
    writingQuestionsForStep: (id: JourneyStepId) =>
      id === "tutorial-writing" ? OPTIONAL : id === "directions" ? PLAIN : [],
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function stubStorage(
  options: Parameters<typeof stubGuideStorage>[0] = {},
  compare: (_args: unknown, callback: (payload: unknown) => void) => void = () => {},
) {
  return stubGuideStorage({
    ...options,
    modules: {
      HandwritingTraceModule: {
        guide: (_args: unknown, callback: (payload: unknown) => void) =>
          callback({ status: "rendered", image: "aGVsbG8=", box: "0,0,1,1", font: "Stub" }),
        compare,
      },
    },
  });
}

function renderScreen(stepId: JourneyStepId = "tutorial-writing") {
  const props = { onExit: vi.fn<() => void>(), onFinish: vi.fn() };
  render(<WritingScreen stepId={stepId} {...props} />);
  return props;
}

function draw(): void {
  const surface = screen.getByTestId("drawing-surface");
  fireEvent.touchstart(surface, { touches: [{ x: 10, y: 10 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 30, y: 30 }] });
  fireEvent.touchend(surface, {});
}

const guide = () => screen.queryByTestId("learning-item-guide-writing");
const shellRoot = () => screen.getByTestId("learning-shell");
const phase = () => screen.getByTestId("writing-screen-content").getAttribute("data-phase");
const tapGuide = () =>
  fireEvent.tap(screen.getByTestId("learning-item-guide-writing"), { eventType: "catchEvent" });
const pressBack = (): boolean => {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
};

test("[SC1·WR] 안 본 저장소에서 optionalPractice 문항을 열면 안내가 하나 서고, 화면 루트가 가려지며, 안내는 루트의 자손이 아니다", () => {
  stubStorage();
  renderScreen();

  expect(guideRoots()).toHaveLength(1);
  expect(shellRoot()).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(shellRoot().contains(guide())).toBe(false);
});

test("[SC2·WR] 안내를 탭하면 사라지고, 루트의 가림은 false로 남으며, 그 종류가 저장된다", () => {
  const double = stubStorage();
  renderScreen();

  tapGuide();

  expect(guide()).toBeNull();
  expect(shellRoot()).toHaveAttribute("accessibility-elements-hidden", "false");
  expect(double.savedKinds()).toEqual(["writing"]);
});

test("[SC3·WR] 뒤로가기 한 번은 안내만 닫고, 한 번 더는 화면의 닫기(나가기 확인창)다", () => {
  stubStorage();
  const props = renderScreen();

  expect(pressBack()).toBe(true);
  expect(guide()).toBeNull();
  expect(props.onExit).not.toHaveBeenCalled();
  expect(screen.queryByTestId("ui-lynx-dialog")).not.toBeInTheDocument();

  expect(pressBack()).toBe(true);
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
  expect(props.onExit).not.toHaveBeenCalled();
});

test("[SC4·WR] 그 종류를 이미 봤으면 안내가 없고 루트가 가려지지 않는다", () => {
  stubStorage({ seen: ["writing"] });
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
  expect(shellRoot().getAttribute("accessibility-elements-hidden")).not.toBe("true");
});

test("[SC5·WR] 저장소가 없으면 안내가 없다", () => {
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
});

test("[WR6] 떠 있는 동안 획이 상태에 들어가지 않고, 닫은 뒤 획이 Check를 세운다", () => {
  stubStorage();
  renderScreen();
  expect(guide()).not.toBeNull();

  draw();
  expect(phase()).toBe("writing");
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();

  tapGuide();
  draw();
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "Check",
  );
});

test("[WR8] optionalPractice 쓰기에도 Skip이 없다 — 쓰는 중 · 빈 판 어디에도", () => {
  stubStorage({ seen: ["writing"] });
  renderScreen();

  expect(screen.queryByTestId("writing-screen-skip")).not.toBeInTheDocument();
  draw();
  expect(screen.queryByTestId("writing-screen-skip")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "Check",
  );
});

test("[WR9] 판정할 수 없으면 아래 버튼이 Next이고, 누르면 완료 카드로 가며 건너뜀으로 센다", () => {
  stubStorage({ seen: ["writing"] }, (_args, callback) => callback({ status: "failed" }));
  const props = renderScreen();

  draw();
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {}); // Check
  expect(phase()).toBe("unmeasurable");
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "Next",
  );
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  expect(screen.getByTestId("writing-screen-complete")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("learning-shell-action"), {}); // See results
  expect(props.onFinish).toHaveBeenCalledWith("tutorial-writing", [expect.anything()], 1);
});

test("[WR7] 첫 문항이 optionalPractice가 아니면(directions) 안내가 없고 안내 키에 쓰지 않는다", () => {
  const double = stubStorage();
  renderScreen("directions");

  expect(guideRoots()).toHaveLength(0);
  expect(double.set).not.toHaveBeenCalled();
});
