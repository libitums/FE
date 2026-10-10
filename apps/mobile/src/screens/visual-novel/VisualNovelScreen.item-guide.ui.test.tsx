import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { guideRoots, stubGuideStorage } from "../../lib/learning-item-guide.storage.test-support";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { VisualNovelScreen } from "./VisualNovelScreen";
import { visualNovelStoryFor } from "./visual-novel";
import type { VisualNovelScreenProps } from "./visual-novel.contract";

// `ui` 계층: 비주얼 노벨 화면의 학습 문항 안내. 비주얼 노벨은 늘 대상이다 — 떠 있는 동안
// `Next`가 장면을 넘기지 않는다. 화면 루트는 원래 상태바 표지를 갖고 있어 표지가 둘이 된다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

const story = visualNovelStoryFor("cafe-arrival-visual-novel");

function renderScreen() {
  const props = {
    story,
    progress: { status: "active", beatIndex: 0 } as const,
    onAdvance: vi.fn<VisualNovelScreenProps["onAdvance"]>(),
    onExit: vi.fn<VisualNovelScreenProps["onExit"]>(),
    onFinish: vi.fn<VisualNovelScreenProps["onFinish"]>(),
  };
  render(<VisualNovelScreen {...props} />);
  return props;
}

const guide = () => screen.queryByTestId("learning-item-guide-visual-novel");
const screenRoot = () => screen.getByTestId("visual-novel-screen");
const markerCount = () =>
  document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`).length;
const tapGuide = () =>
  fireEvent.tap(screen.getByTestId("learning-item-guide-visual-novel"), {
    eventType: "catchEvent",
  });
const pressBack = (): boolean => {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
};

test("[SC1·VN] 안 본 저장소에서 비주얼 노벨을 열면 안내가 하나 서고, 화면 루트가 가려지며, 안내는 루트의 자손이 아니다", () => {
  stubGuideStorage();
  renderScreen();

  expect(guideRoots()).toHaveLength(1);
  expect(screenRoot()).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(screenRoot().contains(guide())).toBe(false);
});

test("[SC2·VN] 안내를 탭하면 사라지고, 루트의 가림은 false로 남으며, 그 종류가 저장된다", () => {
  const double = stubGuideStorage();
  renderScreen();

  tapGuide();

  expect(guide()).toBeNull();
  expect(screenRoot()).toHaveAttribute("accessibility-elements-hidden", "false");
  expect(double.savedKinds()).toEqual(["visual-novel"]);
});

test("[SC3·VN] 뒤로가기 한 번은 안내만 닫고, 한 번 더는 화면의 닫기(onExit)다", () => {
  stubGuideStorage();
  const props = renderScreen();

  expect(pressBack()).toBe(true);
  expect(guide()).toBeNull();
  expect(props.onExit).not.toHaveBeenCalled();
  expect(screen.getByTestId("visual-novel-screen")).toBeInTheDocument();

  expect(pressBack()).toBe(true);
  expect(props.onExit).toHaveBeenCalledTimes(1);
});

test("[SC4·VN] 그 종류를 이미 봤으면 안내가 없고 루트가 가려지지 않는다", () => {
  stubGuideStorage({ seen: ["visual-novel"] });
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
  expect(screenRoot().getAttribute("accessibility-elements-hidden")).not.toBe("true");
});

test("[SC5·VN] 저장소가 없으면 안내가 없다", () => {
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
});

test("[VN6] 떠 있는 동안 Next가 장면을 넘기지 않고 표지는 둘이며, 닫으면 Next가 내 대사를 열고 표지는 하나다", () => {
  stubGuideStorage();
  const props = renderScreen();
  expect(guide()).not.toBeNull();

  expect(markerCount()).toBe(2);
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-dialogue-arrive")).toHaveTextContent("안녕하세요");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).not.toHaveTextContent("Me");
  expect(props.onAdvance).not.toHaveBeenCalled();

  tapGuide();
  expect(markerCount()).toBe(1);
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent("Me");
  expect(props.onAdvance).not.toHaveBeenCalled();
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(props.onAdvance).toHaveBeenCalledTimes(1);
});
