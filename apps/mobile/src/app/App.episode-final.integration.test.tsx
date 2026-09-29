import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./App";
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";
import type { EpisodeFinalCallTest } from "../screens/episode-final/episode-final.contract";
import {
  episodeFinalAdvanceDelayMs,
  episodeFinalLineMs,
} from "../screens/episode-final/episode-final";
import { episodeFinalTestFor } from "../screens/episode-final/episode-final-tests";
import { journeySteps } from "../screens/journey-map/journey-map";

// App · navReducer · 여정 맵 · 최종 테스트 · 학습 완료의 실제 결선을 봅니다(ADR-0006 D4).
// 말하기 문항은 `Can't speak`로 지납니다 — 건너뛴 문항은 결과에 싣지 않습니다.
// 판정 뒤에는 누를 것 없이 잠시 뒤 넘어가므로 가짜 시계를 씁니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

// 다른 integration 파일들의 `renderApp`과 같은 헬퍼입니다 — 토큰이 있는 상태로 진입
// 스플래시를 건너뜁니다.
function renderApp(ui: Parameters<typeof render>[0]) {
  const tokenStore = new Map<string, string>([[authTokenStorageKey, "existing-token"]]);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => tokenStore.get(key) ?? null,
      set: (key: string, value: string) => void tokenStore.set(key, value),
      remove: (key: string) => void tokenStore.delete(key),
    },
  });
  vi.useFakeTimers();
  const result = render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  vi.useRealTimers();
  return result;
}

// 최종 테스트 앞의 항목을 모두 끝낸 진행입니다.
const readyForFinal: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: [],
};

const finalUnit = () => screen.getByTestId("ui-lynx-learning-unit-tutorial-final-test");

function tapButtonIn(testId: string): void {
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});
}

// 문항을 끝까지 풉니다. 낱말 고르기는 정답을 고르고 넘어갈 때까지 기다리고, 말하기는
// `Can't speak`를 누릅니다.
function solveAll(): void {
  vi.useFakeTimers();
  const test = episodeFinalTestFor("tutorial-final-test");
  if (test.format !== "visual-novel") {
    throw new Error("튜토리얼 최종 테스트는 비주얼 노벨 형식이어야 합니다");
  }
  for (const question of test.questions) {
    if (question.kind === "word-choice") {
      fireEvent.tap(screen.getByTestId(`episode-final-screen-option-${question.answerIndex}`), {});
      act(() => {
        vi.advanceTimersByTime(episodeFinalAdvanceDelayMs);
      });
    } else {
      tapButtonIn("episode-final-screen-not-now");
    }
  }
  vi.useRealTimers();
}

test("[EFA1] 제품의 씨앗에서는 최종 테스트가 잠겨 있고 눌러도 열리지 않는다", () => {
  renderApp(<App completedEpisodeIntroIds={["tutorial-intro"]} />);

  expect(finalUnit()).toHaveAttribute("data-status", "default");
  fireEvent.tap(finalUnit(), {});

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-final-screen")).toBeNull();
});

test("[EFA2] 앞 항목을 모두 끝내면 열리고, 문항을 다 풀면 학습 완료를 거쳐 맵에서 완료로 선다", () => {
  renderApp(<App journeySeed={readyForFinal} completedEpisodeIntroIds={["tutorial-intro"]} />);

  fireEvent.tap(finalUnit(), {});
  expect(screen.getByTestId("episode-final-screen-title")).toHaveTextContent("Episode 0.");
  // 서사 화면처럼 셸이 여백을 잡지 않습니다 — 바텀 네비게이션도 서지 않습니다.
  expect(screen.queryByTestId("ui-lynx-bottom-navigator-item-journey")).toBeNull();

  solveAll();

  expect(screen.getByTestId("lesson-complete-screen")).toBeInTheDocument();
  tapButtonIn("lesson-complete-screen-exit");

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(finalUnit()).toHaveAttribute("data-status", "clear");
});

test("[EFA3] 최종 테스트를 끝내야 롤플레이 에피소드가 열린다", () => {
  renderApp(<App journeySeed={readyForFinal} completedEpisodeIntroIds={["tutorial-intro"]} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  expect(screen.getByTestId("roleplay-list-section-tutorial")).toHaveAttribute(
    "data-unlocked",
    "false",
  );

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(finalUnit(), {});
  solveAll();
  tapButtonIn("lesson-complete-screen-exit");
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});

  expect(screen.getByTestId("roleplay-list-section-tutorial")).toHaveAttribute(
    "data-unlocked",
    "true",
  );
});

test("[EFA4] 풀던 도중 뒤로 가면 맵으로 돌아가고 완료로 적지 않는다", () => {
  renderApp(<App journeySeed={readyForFinal} completedEpisodeIntroIds={["tutorial-intro"]} />);

  fireEvent.tap(finalUnit(), {});
  fireEvent.tap(screen.getByTestId("episode-final-screen-option-0"), {});
  fireEvent.tap(
    within(screen.getByTestId("episode-final-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(finalUnit()).toHaveAttribute("data-status", "available");
});

// 통화 서사를 가진 에피소드의 최종 테스트입니다. 제품에는 아직 없어 prop으로 끼웁니다.
const callFinal: EpisodeFinalCallTest = {
  format: "call",
  unitId: "tutorial-final-test",
  callerName: "유나",
  turns: [
    { kind: "line", id: "hello", text: "여보세요?", translation: "Hello?" },
    { kind: "speaking", id: "hi", sentence: "안녕", romanization: "[an.nyeong]" },
  ],
};

test("[EFA5] 통화 형식의 최종 테스트는 통화 화면 위에서 풀고, 학습 완료를 거쳐 맵에서 완료로 선다", () => {
  renderApp(
    <App
      journeySeed={readyForFinal}
      completedEpisodeIntroIds={["tutorial-intro"]}
      episodeFinalTestFor={() => callFinal}
    />,
  );

  // 대사는 시간으로 흐릅니다 — 화면이 서기 전에 가짜 시계를 켜야 그 타이머를 돌릴 수 있습니다.
  vi.useFakeTimers();
  fireEvent.tap(finalUnit(), {});
  expect(screen.getByTestId("episode-final-call-screen")).toBeInTheDocument();
  expect(screen.getByTestId("episode-final-call-screen-line-text")).toHaveTextContent("여보세요?");

  act(() => {
    vi.advanceTimersByTime(episodeFinalLineMs);
  });
  tapButtonIn("episode-final-screen-not-now");
  vi.useRealTimers();

  expect(screen.getByTestId("lesson-complete-screen")).toBeInTheDocument();
  tapButtonIn("lesson-complete-screen-exit");
  expect(finalUnit()).toHaveAttribute("data-status", "clear");
});
