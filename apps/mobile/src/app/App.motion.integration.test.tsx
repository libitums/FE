import { journeySeedBefore } from "./test-helpers/journey-seed";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { systemBackEventName } from "../lib/system-back";

// 호스트가 넘기는 globalProps `reducedMotion`이 App의 MotionProvider를 거쳐 트리 안 컴포넌트의
// `data-motion`으로 이어지는지 봅니다(motion-reduced-motion IM1~IM4). 앱은 `@libitums/ui-lynx`를
// dist로, 컴포넌트는 같은 패키지에서 불러오므로 Context가 둘로 갈라지면 여기서 드러납니다.

type HostProps = {
  readonly safeAreaInsets: { top: number; bottom: number; left: number; right: number };
  readonly reducedMotion?: boolean;
};

const iosInsets = { top: 59, bottom: 34, left: 0, right: 0 };
const completedIntros = ["tutorial-intro"] as const;

function setGlobalProps(value: HostProps | undefined): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function boot(host: HostProps, unitId = "ordering"): Promise<void> {
  setGlobalProps(host);
  vi.stubGlobal("NativeModules", {
    SystemBackModule: {
      ready: vi.fn<() => void>(),
      respond: vi.fn<(token: string, outcome: string) => void>(),
    },
  });
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore(unitId)} completedEpisodeIntroIds={completedIntros} />,
  );
}

const tap = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});

// 학습 화면에서 시스템 뒤로가기를 누르면 나가기 확인 Dialog가 섭니다(App.system-back IB5).
function openExitDialog(): void {
  tap("ui-lynx-learning-unit-ordering");
  tap("step-sheet-start");
  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, ["1"]);
  });
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
}

function dialogMotion(): string | null {
  return screen.getByTestId("ui-lynx-dialog").getAttribute("data-motion");
}

test("[IM1] reducedMotion: true면 Dialog와 같은 화면의 RoundButton이 reduced다", async () => {
  await boot({ safeAreaInsets: iosInsets, reducedMotion: true });
  openExitDialog();

  expect(dialogMotion()).toBe("reduced");
  for (const button of screen.queryAllByTestId("ui-lynx-round-button")) {
    expect(button.getAttribute("data-motion")).toBe("reduced");
  }
});

test("[IM2] reducedMotion: false이거나 키가 없으면 standard이고 RoundButton에 data-motion이 없다", async () => {
  for (const host of [
    { safeAreaInsets: iosInsets, reducedMotion: false },
    { safeAreaInsets: iosInsets },
  ] satisfies HostProps[]) {
    await boot(host);
    openExitDialog();

    expect(dialogMotion()).toBe("standard");
    for (const button of screen.queryAllByTestId("ui-lynx-round-button")) {
      expect(button.hasAttribute("data-motion")).toBe(false);
    }
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

test("[IM3] reducedMotion: true가 iOS inset을 건드리지 않는다", async () => {
  await boot({ safeAreaInsets: iosInsets, reducedMotion: true });

  // App.system-insets II4: iOS(키 없음) 탭 루트는 0px입니다.
  expect(screen.getByTestId("app-shell").style.paddingBottom).toBe("0px");
  expect(screen.queryByTestId("app-navigator-floor")).not.toBeInTheDocument();

  tap("top-bar-notifications");
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("app-shell").style.paddingBottom).toBe("34px");
});

// 듣기 유닛을 보기 tap(정답) → 넘김 층 tap까지 몰고 간 뒤, 무대의 전환 속성과 완료 배지를 봅니다
// (motion-tokens-stage3 IT2 · IT3). 같은 `MotionProvider` Context가 앱 훅 `useQuestionTransition`과
// LessonCompleteScreen까지 한 줄로 이어지는지가 경계입니다.
async function playListeningUnit(host: HostProps): Promise<void> {
  await boot(host, "tutorial-listening");
  tap("ui-lynx-learning-unit-tutorial-listening");
  tap("step-sheet-start");
  tap("listening-choice-0");
  tap("learning-shell-advance");
}

function rewardBadge(): Element {
  const found = document.querySelector(".lesson-complete-screen-badge");
  if (found === null) throw new Error("lesson-complete badge not found");
  return found;
}

test("[IT2] reducedMotion: true면 문항 전환 무대는 reduced이고 통과 배지는 fade다", async () => {
  await playListeningUnit({ safeAreaInsets: iosInsets, reducedMotion: true });
  const stage = screen.getByTestId("learning-shell-stage");
  expect(stage.getAttribute("data-page")).toBe("primed");
  expect(stage.getAttribute("data-motion")).toBe("reduced");

  tap("learning-shell-action");
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  expect(rewardBadge().getAttribute("data-reward")).toBe("fade");
});

test("[IT3] reducedMotion이 없으면 무대에 data-motion이 없고 배지는 expressive이며 Back to map은 즉시 맵을 연다", async () => {
  await playListeningUnit({ safeAreaInsets: iosInsets });
  const stage = screen.getByTestId("learning-shell-stage");
  expect(stage.getAttribute("data-page")).toBe("primed");
  expect(stage.hasAttribute("data-motion")).toBe(false);

  tap("learning-shell-action");
  expect(rewardBadge().getAttribute("data-reward")).toBe("expressive");

  const exit = screen.getByTestId("lesson-complete-screen-exit");
  fireEvent.tap(exit.querySelector('[data-testid="ui-lynx-button"]')!, {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

// IM4(실행 중 true → false 갱신)는 쓰지 않습니다 — 해당 없음. 이 하네스는 호스트의 globalProps 갱신
// (`updateGlobalProps`의 강제 전체 재렌더)를 흉내 낼 수 없습니다(`GlobalEventEmitter`가 없고, 억지로 이어도
// 트리가 처음부터 다시 서서 Dialog가 사라집니다). e2e M-I2 · M-A2에서 실제 호스트로 봅니다.
