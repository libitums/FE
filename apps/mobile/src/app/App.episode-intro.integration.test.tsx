import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { EpisodePrologue } from "../screens/episode-intro/episode-intro.contract";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";

// App · navReducer · 여정 맵 · 에피소드 서사 표지 · 유닛 화면의 실제 결선을 봅니다
// (ADR-0006 D4). 제품의 씨앗(표지를 본 에피소드 없음)으로 부팅합니다.

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

function startOrdering(): void {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

// `Skip`은 확인 모달을 거칩니다 — 건너뛰기로 확인까지 누르고, 누른 유닛이 열립니다.
// `Next`는 서사 통화 → 학습 완료 → 맵으로 이어지므로 Check까지 누릅니다. 그 끝은 맵이고
// 유닛은 열리지 않습니다(그 흐름 자체는 아래 [EP*]가 봅니다).
function tapIntro(testId: "episode-intro-screen-skip" | "episode-intro-screen-next"): void {
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});
  if (testId === "episode-intro-screen-next") {
    fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});
    fireEvent.tap(screen.getByTestId("prologue-call-screen-complete"), {});
    tapLessonCompleteCheck();
  }
  if (testId === "episode-intro-screen-skip") {
    fireEvent.tap(
      within(screen.getByTestId("ui-lynx-dialog-action-skip")).getByTestId("ui-lynx-button"),
      {},
    );
  }
}

function tapLessonCompleteCheck(): void {
  fireEvent.tap(
    within(screen.getByTestId("lesson-complete-screen-exit")).getByTestId("ui-lynx-button"),
    {},
  );
}

function tapIntroBack(): void {
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
}

test("[EI1] 에피소드의 유닛을 처음 시작하면 유닛 대신 그 에피소드의 표지가 선다", () => {
  renderApp(<App />);

  startOrdering();

  expect(screen.getByTestId("episode-intro-screen-label")).toHaveTextContent("Episode 0.");
  expect(screen.getByTestId("episode-intro-screen-title")).toHaveTextContent("Tutorial.");
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
});

test("[EI2] Next로 서사 통화와 학습 완료를 지나면 맵으로 돌아오고, 유닛은 다시 눌러야 열린다", () => {
  renderApp(<App />);
  startOrdering();

  tapIntro("episode-intro-screen-next");

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});

test("[EI3] Skip을 누르면 누른 유닛이 열린다", () => {
  renderApp(<App />);
  startOrdering();

  tapIntro("episode-intro-screen-skip");

  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});

test("[EI4] 표지를 넘긴 뒤에는 같은 에피소드의 유닛을 열어도 표지가 서지 않는다", () => {
  renderApp(<App />);
  startOrdering();
  tapIntro("episode-intro-screen-skip");
  // ⟨2026-09-28⟩ 학습 나가기는 두 걸음입니다 — `×`는 묻기만 하고 실제로 떠나는 것은
  // 모달의 `그만두기`입니다. 진행이 저장되지 않아 되돌릴 수단이 없는 자리라 묻습니다.
  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});
  const leave = [...document.querySelectorAll('[data-testid="ui-lynx-button"]')].find(
    (el) => el.getAttribute("accessibility-label") === "그만두기",
  );
  if (leave === undefined) throw new Error("나가기 확인 모달에 `그만두기`가 없습니다");
  fireEvent.tap(leave, {});

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});

  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
});

test("[EI5] 유닛에서 나가면 표지가 아니라 맵으로 돌아온다", () => {
  renderApp(<App />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  tapIntro("episode-intro-screen-skip");
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
});

test("[EI6] 표지의 뒤로는 맵으로 돌아가고, 본 것으로 적지 않아 다음에 다시 선다", () => {
  renderApp(<App />);
  startOrdering();

  tapIntroBack();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
});

test("[EI7] 특별 유닛의 열림 이벤트는 표지를 넘긴 뒤에 한 번만 난다", () => {
  const messengerEventSink = vi.fn<NonNullable<MessengerEventSink>>();
  renderApp(<App messengerEventSink={messengerEventSink} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  expect(messengerEventSink).not.toHaveBeenCalled();

  tapIntro("episode-intro-screen-skip");
  expect(messengerEventSink.mock.calls.map(([event]) => event.name)).toEqual([
    "messenger_unit_opened",
  ]);
});

test("[EI8] 알림에서 여는 유닛도 표지를 지난다", () => {
  renderApp(<App />);
  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});

  fireEvent.tap(screen.getByTestId("notification-list-item-notification-messenger"), {});

  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  tapIntro("episode-intro-screen-skip");
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
});

test("[EI9] 표지를 본 에피소드로 부팅하면 표지 없이 유닛이 열린다", () => {
  renderApp(<App seenEpisodeIntroIds={["tutorial"]} />);

  startOrdering();

  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});

test("[EI10] Skip 뒤 모달에서 계속 보기를 고르면 표지에 남고 본 것으로 적지 않는다", () => {
  renderApp(<App />);
  startOrdering();

  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-skip")).getByTestId("ui-lynx-button"),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-stay")).getByTestId("ui-lynx-button"),
    {},
  );

  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
  tapIntroBack();
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
});

// ------------------------------------------------------------------ 서사 통화

function tapNextOnly(): void {
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
}

test("[EP1] Next를 누르면 표지 대신 서사 통화가 선다", () => {
  renderApp(<App />);
  startOrdering();

  tapNextOnly();

  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("prologue-call-screen-title")).toHaveTextContent("Episode 0.");
  expect(screen.getByTestId("prologue-call-screen-caller")).toHaveAttribute(
    "accessibility-label",
    "음성 통화, 지민, 0:00",
  );
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
});

test("[EP2] 대사가 흐른 뒤 통화가 끝나면 화면에 남아 Continue를 기다린다", () => {
  vi.useFakeTimers();
  renderApp(<App />);
  vi.useFakeTimers();
  startOrdering();
  tapNextOnly();

  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  vi.useRealTimers();

  expect(screen.getByTestId("prologue-call-screen")).toBeInTheDocument();
  expect(screen.getByTestId("prologue-call-screen-complete")).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
});

test("[EP2b] Continue를 누르면 PERFECT LESSON 화면이 선다", () => {
  renderApp(<App />);
  startOrdering();
  tapNextOnly();
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});

  fireEvent.tap(screen.getByTestId("prologue-call-screen-complete"), {});

  expect(screen.queryByTestId("prologue-call-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
});

test("[EP2c] 학습 완료의 Check를 누르면 유닛을 열지 않고 여정 맵으로 돌아온다", () => {
  renderApp(<App />);
  startOrdering();
  tapNextOnly();
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});
  fireEvent.tap(screen.getByTestId("prologue-call-screen-complete"), {});

  tapLessonCompleteCheck();

  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
});

test("[EP3] 통화에서 뒤로 가면 표지가 아니라 맵이고, 본 것으로 적지 않는다", () => {
  renderApp(<App />);
  startOrdering();
  tapNextOnly();

  fireEvent.tap(
    within(screen.getByTestId("prologue-call-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
});

test("[EP4] 통화를 끝낸 뒤에는 같은 에피소드의 유닛에 표지도 통화도 서지 않는다", () => {
  renderApp(<App />);
  startOrdering();
  tapIntro("episode-intro-screen-next");

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});

  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("prologue-call-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
});

// ------------------------------------------------------------------ 서사 메신저
//
// 오늘 튜토리얼의 서사는 통화입니다. 메신저 형식을 앱 안에서 보려고 대본을 바꿔 끼웁니다
// (`App`의 `episodePrologueFor`).

const messengerPrologue: EpisodePrologue = {
  kind: "messenger",
  chat: {
    partnerName: "유나",
    messages: [
      { id: "m1", sender: "other", text: "잘 도착했어?", translation: "Did you arrive?" },
      { id: "m2", sender: "self", text: "잘 도착했어요!", translation: "I made it!" },
    ],
  },
};

test("[EM1] 서사가 메신저인 에피소드는 Next 뒤에 메신저가 서고, 끝까지 가면 PERFECT LESSON → 맵이다", () => {
  vi.useFakeTimers();
  renderApp(<App episodePrologueFor={() => messengerPrologue} />);
  vi.useFakeTimers();
  startOrdering();
  tapNextOnly();

  expect(screen.getByTestId("prologue-chat-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("prologue-call-screen")).not.toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1500);
  });
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-send"), {});
  vi.useRealTimers();
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-complete"), {});

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  tapLessonCompleteCheck();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

test("[EM2] 서사가 없는 에피소드는 Next가 곧장 누른 유닛을 연다", () => {
  renderApp(<App episodePrologueFor={() => undefined} />);
  startOrdering();

  tapNextOnly();

  expect(screen.queryByTestId("prologue-chat-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("prologue-call-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});
