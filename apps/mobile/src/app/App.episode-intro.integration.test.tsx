import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type {
  EpisodePrologue,
  PrologueCall,
} from "../screens/episode-intro/episode-intro.contract";
import { episodeNarrativeFor } from "../screens/episode-narrative/episode-narrative";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// App · navReducer · 여정 맵 · 에피소드 서사 표지 · 유닛 화면의 실제 결선을 봅니다
// (ADR-0006 D4). 제품의 씨앗(표지를 본 에피소드 없음)으로 부팅합니다.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function startOrdering(): void {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

// `Skip`은 확인 모달을 거칩니다 — 건너뛰기로 확인까지 누르고, 누른 유닛이 열립니다.
// `Next`는 튜토리얼의 서사(비주얼 노벨) → 학습 완료 → 맵으로 이어지므로 Check까지
// 누릅니다. 그 끝은 맵이고 유닛은 열리지 않습니다(그 흐름 자체는 아래 [EN*]가 봅니다).
function tapIntro(testId: "episode-intro-screen-skip" | "episode-intro-screen-next"): void {
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});
  if (testId === "episode-intro-screen-next") {
    readNarrative();
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

// `Next` 뒤의 서사(비주얼 노벨)를 끝까지 넘깁니다 — 장면 수만큼 넘기면 학습 완료로 갑니다.
function readNarrative(): void {
  const beats = episodeNarrativeFor("tutorial").beats.length;
  for (let index = 0; index < beats; index += 1) {
    fireEvent.tap(screen.getByTestId("episode-narrative-screen-advance"), {});
  }
}

function tapIntroBack(): void {
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
}

test("[EI1] 에피소드의 유닛을 처음 시작하면 유닛 대신 그 에피소드의 표지가 선다", async () => {
  await renderSignedInApp(<App />);

  startOrdering();

  expect(screen.getByTestId("episode-intro-screen-label")).toHaveTextContent("Episode 0.");
  expect(screen.getByTestId("episode-intro-screen-title")).toHaveTextContent("Tutorial.");
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
});

test("[EI2] Next로 서사 · 학습 완료를 지나면 맵으로 돌아오고, 유닛은 다시 눌러야 열린다", async () => {
  await renderSignedInApp(<App />);
  startOrdering();

  tapIntro("episode-intro-screen-next");

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});

test("[EN1] 튜토리얼은 Next를 누르면 서사(비주얼 노벨)가 서고, 끝까지 넘기면 PERFECT LESSON이다", async () => {
  await renderSignedInApp(<App />);
  startOrdering();
  tapNextOnly();

  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("episode-narrative-screen-title")).toHaveTextContent("Episode 0.");
  expect(screen.queryByTestId("prologue-call-screen")).not.toBeInTheDocument();

  readNarrative();

  expect(screen.queryByTestId("episode-narrative-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("prologue-call-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
});

test("[EN2] 서사 중간에 뒤로 나가면 맵으로 가고, 본 것으로 적지 않아 다음에 표지가 다시 선다", async () => {
  await renderSignedInApp(<App />);
  startOrdering();
  tapNextOnly();

  fireEvent.tap(
    within(screen.getByTestId("episode-narrative-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
});

test("[EI3] Skip을 누르면 누른 유닛이 열린다", async () => {
  await renderSignedInApp(<App />);
  startOrdering();

  tapIntro("episode-intro-screen-skip");

  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});

test("[EI4] 표지를 넘긴 뒤에는 같은 에피소드의 유닛을 열어도 표지가 서지 않는다", async () => {
  await renderSignedInApp(<App />);
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

test("[EI5] 유닛에서 나가면 표지가 아니라 맵으로 돌아온다", async () => {
  await renderSignedInApp(<App />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  tapIntro("episode-intro-screen-skip");
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
});

test("[EI6] 표지의 뒤로는 맵으로 돌아가고, 본 것으로 적지 않아 다음에 다시 선다", async () => {
  await renderSignedInApp(<App />);
  startOrdering();

  tapIntroBack();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
});

test("[EI7] 특별 유닛의 열림 이벤트는 표지를 넘긴 뒤에 한 번만 난다", async () => {
  const messengerEventSink = vi.fn<NonNullable<MessengerEventSink>>();
  await renderSignedInApp(<App messengerEventSink={messengerEventSink} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  expect(messengerEventSink).not.toHaveBeenCalled();

  tapIntro("episode-intro-screen-skip");
  expect(messengerEventSink.mock.calls.map(([event]) => event.name)).toEqual([
    "messenger_unit_opened",
  ]);
});

test("[EI8] 알림에서 여는 유닛도 표지를 지난다", async () => {
  await renderSignedInApp(<App />);
  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});

  fireEvent.tap(screen.getByTestId("notification-list-item-notification-messenger"), {});

  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  tapIntro("episode-intro-screen-skip");
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
});

test("[EI9] 표지를 본 에피소드로 부팅하면 표지 없이 유닛이 열린다", async () => {
  await renderSignedInApp(<App seenEpisodeIntroIds={["tutorial"]} />);

  startOrdering();

  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});

test("[EI10] Skip 뒤 모달에서 계속 보기를 고르면 표지에 남고 본 것으로 적지 않는다", async () => {
  await renderSignedInApp(<App />);
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

// ------------------------------------------------------------------ 서사 통화 · 메신저
//
// 에피소드마다 서사 형식이 하나입니다. 튜토리얼은 비주얼 노벨이라, 통화 · 메신저 형식은
// 대본을 바꿔 끼워 봅니다(`App`의 `episodePrologueFor`).

function tapNextOnly(): void {
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
}

const call: PrologueCall = {
  callerName: "지민",
  lines: [
    { text: "여보세요?", translation: "Hello?" },
    { text: "이따 봐!", translation: "See you later!" },
  ],
};
const callPrologue: EpisodePrologue = { kind: "call", call };
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

async function renderWithCall(): Promise<void> {
  await renderSignedInApp(<App episodePrologueFor={() => callPrologue} />);
}

test("[EP1] 서사가 통화인 에피소드는 Next 뒤에 비주얼 노벨 없이 통화가 곧장 선다", async () => {
  await renderWithCall();
  startOrdering();

  tapNextOnly();

  expect(screen.queryByTestId("episode-narrative-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("prologue-call-screen-title")).toHaveTextContent("Episode 0.");
  expect(screen.getByTestId("prologue-call-screen-caller")).toHaveAttribute(
    "accessibility-label",
    "음성 통화, 지민",
  );
});

test("[EP2] 대사가 흐른 뒤 통화가 끝나면 화면에 남아 Continue를 기다린다", async () => {
  vi.useFakeTimers();
  await renderWithCall();
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

test("[EP2b] 통화의 Continue → PERFECT LESSON → Check → 맵이다", async () => {
  await renderWithCall();
  startOrdering();
  tapNextOnly();
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});

  fireEvent.tap(screen.getByTestId("prologue-call-screen-complete"), {});
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");

  tapLessonCompleteCheck();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
});

test("[EP3] 통화에서 뒤로 가면 표지가 아니라 맵이고, 본 것으로 적지 않는다", async () => {
  await renderWithCall();
  startOrdering();
  tapNextOnly();

  fireEvent.tap(
    within(screen.getByTestId("prologue-call-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
});

test("[EP4] 서사를 마친 뒤에는 같은 에피소드의 유닛에 표지도 서사도 서지 않는다", async () => {
  await renderSignedInApp(<App />);
  startOrdering();
  tapIntro("episode-intro-screen-next");

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});

  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("episode-narrative-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
});

test("[EM1] 서사가 메신저인 에피소드는 Next 뒤에 메신저가 서고, 끝까지 가면 PERFECT LESSON → 맵이다", async () => {
  vi.useFakeTimers();
  await renderSignedInApp(<App episodePrologueFor={() => messengerPrologue} />);
  vi.useFakeTimers();
  startOrdering();
  tapNextOnly();

  expect(screen.getByTestId("prologue-chat-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-narrative-screen")).not.toBeInTheDocument();

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

test("[EM2] 서사가 없는 에피소드는 Next가 곧장 누른 유닛을 연다", async () => {
  await renderSignedInApp(<App episodePrologueFor={() => undefined} />);
  startOrdering();

  tapNextOnly();

  expect(screen.queryByTestId("episode-narrative-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});
