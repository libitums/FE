import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { guideRoots, stubGuideStorage } from "../../lib/learning-item-guide.storage.test-support";
import type { JourneyStepId } from "../journey-map/journey-map";
import { SpeakingScreen } from "./SpeakingScreen";
import type { SpeakingQuestion } from "./speaking";

// `ui` 계층: 말하기 화면의 학습 문항 안내. 첫 문항이 optionalPractice일 때만 뜨고, 떠 있는 동안
// `Speak` · 파형 · `Skip`이 상태를 바꾸지 않으며 권한 요청 · 인식 시작이 없다.
// 문항은 대역이다 — 실물 표와의 일치는 unit의 TG가 본다.

const OPTIONAL: readonly SpeakingQuestion[] = [
  { sentence: "안녕하세요", romanization: "annyeonghaseyo", optionalPractice: true },
];
const PLAIN: readonly SpeakingQuestion[] = [
  { sentence: "이거 주세요", romanization: "[i.ɡʌ.ju.se.jo]" },
];

vi.mock("./speaking", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./speaking")>();
  return {
    ...actual,
    speakingQuestionsForStep: (id: JourneyStepId) =>
      id === "tutorial-speaking" ? OPTIONAL : id === "introduction" ? PLAIN : [],
  };
});

let host = { permissions: 0, start: 0, sounds: [] as string[] };

beforeEach(() => {
  host = { permissions: 0, start: 0, sounds: [] };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function stubStorage(options: Parameters<typeof stubGuideStorage>[0] = {}) {
  return stubGuideStorage({
    ...options,
    modules: {
      SoundEffectsModule: { play: (id: string) => host.sounds.push(id), stopRing: () => {} },
      SpeechRecognitionModule: {
        getStatus: () => {},
        requestPermissions: (callback: (payload: unknown) => void) => {
          host.permissions += 1;
          callback({
            microphone: "granted",
            speechRecognition: "granted",
            recognizerAvailable: true,
          });
        },
        start: () => {
          host.start += 1;
        },
        stop: () => {},
      },
    },
  });
}

function renderScreen(stepId: JourneyStepId = "tutorial-speaking") {
  const props = { onExit: vi.fn<() => void>(), onFinish: vi.fn() };
  render(<SpeakingScreen stepId={stepId} {...props} />);
  return props;
}

const guide = () => screen.queryByTestId("learning-item-guide-speaking");
const shellRoot = () => screen.getByTestId("learning-shell");
const actionLabel = () =>
  screen.queryByTestId("learning-shell-action")?.getAttribute("accessibility-label") ?? null;
const tapGuide = () =>
  fireEvent.tap(screen.getByTestId("learning-item-guide-speaking"), { eventType: "catchEvent" });
const tapSkip = () => {
  const button = screen
    .getByTestId("speaking-screen-skip")
    .querySelector('[data-testid="ui-lynx-button"]');
  expect(button).not.toBeNull();
  fireEvent.tap(button as Element, {});
};
const pressBack = (): boolean => {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
};

test("[SC1·SP] 안 본 저장소에서 optionalPractice 문항을 열면 안내가 하나 서고, 화면 루트가 가려지며, 안내는 루트의 자손이 아니다", () => {
  stubStorage();
  renderScreen();

  expect(guideRoots()).toHaveLength(1);
  expect(shellRoot()).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(shellRoot().contains(guide())).toBe(false);
});

test("[SC2·SP] 안내를 탭하면 사라지고, 루트의 가림은 false로 남으며, 그 종류가 저장된다", () => {
  const double = stubStorage();
  renderScreen();

  tapGuide();

  expect(guide()).toBeNull();
  expect(shellRoot()).toHaveAttribute("accessibility-elements-hidden", "false");
  expect(double.savedKinds()).toEqual(["speaking"]);
});

test("[SC3·SP] 뒤로가기 한 번은 안내만 닫고, 한 번 더는 화면의 닫기(나가기 확인창)다", () => {
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

test("[SC4·SP] 그 종류를 이미 봤으면 안내가 없고 루트가 가려지지 않는다", () => {
  stubStorage({ seen: ["speaking"] });
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
  expect(shellRoot().getAttribute("accessibility-elements-hidden")).not.toBe("true");
});

test("[SC5·SP] 저장소가 없으면 안내가 없다", () => {
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
});

test("[SP6] 떠 있는 동안 Speak · 파형 · Skip이 아무것도 시작하지 않고, 닫은 뒤 Skip이 완료 카드로 간다", () => {
  stubStorage();
  renderScreen();
  expect(guide()).not.toBeNull();

  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  fireEvent.tap(screen.getByTestId("speaking-screen-waves"), {});
  tapSkip();

  expect(host.permissions).toBe(0);
  expect(host.start).toBe(0);
  expect(host.sounds).not.toContain("button");
  expect(actionLabel()).toBe("Speak");
  expect(screen.queryByTestId("speaking-screen-complete")).not.toBeInTheDocument();

  tapGuide();
  tapSkip();
  expect(screen.getByTestId("speaking-screen-complete")).toBeInTheDocument();
  expect(actionLabel()).toBe("See results");
});

test("[SP7] 첫 문항이 optionalPractice가 아니면(introduction) 안내가 없고 안내 키에 쓰지 않는다", () => {
  const double = stubStorage();
  renderScreen("introduction");

  expect(guideRoots()).toHaveLength(0);
  expect(double.set).not.toHaveBeenCalled();
});

test("[SP8] 안내를 닫은 뒤 아래 버튼을 탭하면 버튼음이 정확히 1회 나고 권한 요청이 1회 돈다", () => {
  stubStorage();
  renderScreen();
  expect(guide()).not.toBeNull();

  tapGuide();
  // 닫기 전에 난 소리는 세지 않는다.
  host.sounds.length = 0;
  expect(actionLabel()).toBe("Speak");

  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(host.sounds.filter((id) => id === "button")).toHaveLength(1);
  expect(host.permissions).toBe(1);
});
