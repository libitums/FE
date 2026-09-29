import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./App";
import type {
  EpisodeIntroEvent,
  EpisodeIntroEventSink,
  EpisodePrologue,
  PrologueCall,
} from "../screens/episode-intro/episode-intro.contract";
import { episodeNarrativeFor } from "../screens/episode-narrative/episode-narrative";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import { journeySteps } from "../screens/journey-map/journey-map";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// App · navReducer · 여정 맵 · 에피소드 표지 유닛 · 유닛 화면의 실제 결선을 봅니다
// (ADR-0006 D4). 제품의 씨앗(끝낸 표지 없음)으로 부팅합니다.
//
// ⚠ **이 파일이 보는 것이 통째로 옮겨 갔습니다**(spec §2.5 · §2.7의 관찰 델타 표).
// 전에는 표지가 **유닛 진입을 가로채는 층**이었고, 이 파일의 케이스 대부분이 「유닛을
// 눌렀더니 표지가 떴다」를 봤습니다. 이제 표지는 **맵의 첫 항목**이고, 순서를 지는
// 자리가 가로채기에서 **잠김 파생**으로 옮겨 갔습니다(D6). 그래서 진입은 전부
// `openIntro()`(표지 항목 탭)이고, 표지 전에 다른 유닛을 누르면 **아무 화면도 열리지
// 않습니다** — 표지조차 뜨지 않습니다.
//
// `Skip`도 갈렸습니다(D5) — 누른 유닛이 아니라 **`PERFECT LESSON` 결과 화면**으로
// 갑니다. 완료를 적는 자리는 그 결과 화면의 `Check` 하나뿐입니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

const introUnitTestId = "ui-lynx-learning-unit-tutorial-intro";
const finalUnitTestId = "ui-lynx-learning-unit-tutorial-final-test";

// 표지 뒤에 서는 유닛들입니다 — 표지를 끝내기 전에는 전부 잠깁니다(D6). 스텝 하나와
// 특별 유닛 셋을 함께 둡니다: 잠김이 **종류를 가리지 않는다**는 것이 관찰이라,
// 한 종류만 보면 나머지 셋이 조용히 열려 있어도 통과합니다.
const gatedUnits = [
  { testId: "ui-lynx-learning-unit-ordering", screenTestId: "step-sheet-panel" },
  { testId: "ui-lynx-learning-unit-appointment-confirmation", screenTestId: "messenger-screen" },
  {
    testId: "ui-lynx-learning-unit-appointment-confirmation-phone-call",
    screenTestId: "phone-call-screen",
  },
  {
    testId: "ui-lynx-learning-unit-cafe-arrival-visual-novel",
    screenTestId: "visual-novel-screen",
  },
] as const;

function introUnit(): HTMLElement {
  return screen.getByTestId(introUnitTestId);
}

/** 맵의 **표지 항목**을 눌러 표지를 엽니다 — 이제 표지로 들어가는 길은 이것 하나입니다. */
function openIntro(): void {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(introUnit(), {});
}

function tapButtonIn(testId: string): void {
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});
}

/** `Skip`은 확인 모달을 거칩니다 — 건너뛰기로 확인까지 누릅니다. */
function skipIntro(): void {
  tapButtonIn("episode-intro-screen-skip");
  tapButtonIn("ui-lynx-dialog-action-skip");
}

function nextIntro(): void {
  tapButtonIn("episode-intro-screen-next");
}

function tapLessonCompleteCheck(): void {
  tapButtonIn("lesson-complete-screen-exit");
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

/** 표지를 끝내는 가장 짧은 길입니다 — `Skip` → 결과 화면 → `Check`. */
function finishIntroBySkip(): void {
  openIntro();
  skipIntro();
  tapLessonCompleteCheck();
}

/** 주문하기 스텝을 엽니다. **표지를 끝낸 뒤에만 됩니다** — 전에는 시트가 열리지 않습니다. */
function startOrdering(): void {
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

test("[IN-I1] 맵의 표지 항목을 누르면 그 에피소드의 표지 화면이 선다", async () => {
  await renderSignedInApp(<App />);

  openIntro();

  expect(screen.getByTestId("episode-intro-screen-label")).toHaveTextContent("Episode 0.");
  expect(screen.getByTestId("episode-intro-screen-title")).toHaveTextContent("Tutorial.");
  // 표지는 이제 유닛을 대신하지 않습니다 — 누른 것이 표지이므로 학습 화면이 따라오지
  // 않습니다.
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
});

// [EI1]의 **반전**입니다. 전에는 「유닛을 누르면 표지가 뜬다」였고, 이제는 「유닛이
// 아예 눌리지 않는다」입니다(AC1 후반 + D6). 사용자가 보는 것이 「눌렀더니 다른 화면이
// 떴다」에서 「아직 열리지 않았다」로 바뀐 자리이고, spec §2.7 델타 표의 그 줄입니다.
test("[IN-I2] 표지 전에는 스텝도 특별 유닛 셋도 눌리지 않고 표지도 뜨지 않는다", async () => {
  await renderSignedInApp(<App />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  gatedUnits.forEach(({ testId, screenTestId }) => {
    const unit = screen.getByTestId(testId);
    expect(unit).toHaveAttribute("data-status", "default");
    fireEvent.tap(unit, {});

    // 맵에 그대로 남습니다 — 유닛도, 그 앞에 끼던 표지도 서지 않습니다.
    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    expect(screen.queryByTestId(screenTestId)).not.toBeInTheDocument();
    expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  });

  // 잠긴 것은 표지 **뒤**입니다 — 표지 자신은 구획의 첫 항목이라 열려 있습니다.
  expect(introUnit()).toHaveAttribute("data-status", "available");
});

// 옛 [EI3]은 「`Skip`을 누르면 누른 유닛이 열린다」였습니다. D5가 그것을 바꿉니다 —
// 건너뛴 서사도 **결과 화면**을 지납니다. 채점할 것이 없어 만점인 것이지 「건너뛰면
// 만점」이 규칙인 것이 아닙니다(spec §2.8).
test("[IN-I3] Skip → 확인 모달 → 건너뛰기면 맵이 아니라 결과 화면이 선다", async () => {
  await renderSignedInApp(<App />);
  openIntro();

  skipIntro();

  expect(screen.getByTestId("lesson-complete-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  // 누른 유닛이 열리지 않습니다 — 그 개념 자체가 없어졌습니다.
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
});

test("[IN-K1] 건너뛰고 온 결과 화면의 제목이 PERFECT LESSON!이다", async () => {
  await renderSignedInApp(<App />);
  openIntro();

  skipIntro();

  // `results`가 비어 실수가 0입니다 — 서사에는 잴 것이 없습니다.
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  // 미통과가 아니므로 `Try again`이 서지 않습니다.
  expect(screen.queryByTestId("lesson-complete-screen-retry")).not.toBeInTheDocument();
});

// **완료를 적는 자리가 여기 하나입니다**(spec §2.5) — 전에는 `Skip`과 `Check` 둘이
// 각자 적었습니다. 결과 화면에 닿는 것이 곧 완료이고, 그 완료가 곧 잠김 해제입니다.
test("[IN-K2] 결과 화면의 Check로 맵에 돌아오면 표지가 clear이고 잠김이 풀린다", async () => {
  await renderSignedInApp(<App />);
  openIntro();
  skipIntro();

  tapLessonCompleteCheck();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(introUnit()).toHaveAttribute("data-status", "clear");
  // 가려져 있던 진행(`initialCompletedStepCount` = 2)이 그대로 드러납니다 — 잠김은
  // 완료를 지우는 것이 아니라 가리는 것입니다(spec §2.9).
  expect(screen.getByTestId("ui-lynx-learning-unit-ordering")).toHaveAttribute(
    "data-status",
    "active",
  );

  startOrdering();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});

// `renderPrologueCompleteScreen`이 두 경로에서 옵니다 — 끝까지 본 경우와 건너뛴
// 경우입니다. **화면은 그 둘을 구별하지 않습니다**(spec §2.5). 구별하려면 route에 필드가
// 하나 늘어야 하고 그것을 읽을 곳이 오늘 0건입니다. 건너뛴 것과 본 것이 같은 결과를
// 내는 것이 D5가 고른 바로 그 동작입니다.
test("[IN-K3] Skip으로 온 결과 화면과 Next로 온 결과 화면이 구별되지 않는다", async () => {
  function completeScreenShape() {
    const pick = (testId: string) => screen.getByTestId(testId).textContent ?? "";
    return {
      title: pick("lesson-complete-screen-title"),
      subtitle: pick("lesson-complete-screen-subtitle"),
      diamond: pick("lesson-complete-screen-reward-diamond"),
      grade: pick("lesson-complete-screen-reward-grade"),
      hasRetry: screen.queryByTestId("lesson-complete-screen-retry") !== null,
    };
  }

  const skipped = await renderSignedInApp(<App />);
  openIntro();
  skipIntro();
  const skippedShape = completeScreenShape();
  skipped.unmount();

  await renderSignedInApp(<App />);
  openIntro();
  nextIntro();
  readNarrative();
  const watchedShape = completeScreenShape();

  expect(skippedShape).toEqual(watchedShape);
  expect(skippedShape.title).toBe(watchedShape.title);
});

// 옛 [EI2]·[EN1]의 개정입니다 — 끝이 「맵 + 유닛은 다시 눌러야 열린다」에서 「맵 +
// 표지가 clear」로 바뀝니다. 서사 자체의 모양(비주얼 노벨이 서고 통화가 아니다)도
// 여기서 함께 봅니다.
test("[IN-I4] Next → 서사 → 결과 화면 → Check면 맵이고 표지가 clear다", async () => {
  await renderSignedInApp(<App />);
  openIntro();

  nextIntro();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("episode-narrative-screen-title")).toHaveTextContent("Episode 0.");
  expect(screen.queryByTestId("prologue-call-screen")).not.toBeInTheDocument();

  readNarrative();
  expect(screen.queryByTestId("episode-narrative-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");

  tapLessonCompleteCheck();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(introUnit()).toHaveAttribute("data-status", "clear");
});

// 옛 [EI6]의 개정입니다 — 「다음에 유닛을 열면 표지가 다시 선다」가 「표지가 여전히
// 미완료라 뒤가 잠긴 채다」로 바뀝니다. 뒤로는 결과 화면에 닿지 않으므로 완료가 아닙니다.
test("[IN-I5] 표지의 뒤로는 맵으로 가고 완료로 적지 않아 잠김도 그대로다", async () => {
  await renderSignedInApp(<App />);
  openIntro();

  tapIntroBack();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(introUnit()).toHaveAttribute("data-status", "available");

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  // 표지는 다시 누르면 다시 섭니다 — 끝낸 것으로 적지 않았기 때문입니다.
  fireEvent.tap(introUnit(), {});
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
});

// 옛 [EN2]의 개정입니다. 이유가 더 좁아졌습니다 — 완료를 적는 자리가 결과 화면의
// `Check` 하나뿐이라, **결과 화면에 닿은 적이 없으면** 어디서 나가든 완료가 아닙니다.
test("[IN-I6] 서사 중간에 뒤로 나가면 결과 화면에 닿은 적이 없어 완료로 적지 않는다", async () => {
  await renderSignedInApp(<App />);
  openIntro();
  nextIntro();

  fireEvent.tap(
    within(screen.getByTestId("episode-narrative-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(introUnit()).toHaveAttribute("data-status", "available");
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
});

// 옛 [EI4]의 대체입니다 — 「표지를 넘긴 뒤에는 표지가 서지 않는다」가 아니라 「표지
// **항목**이 완료 표식으로 서고, 그래도 다시 열린다」입니다. 표지는 유닛이라 끝낸
// 뒤에도 다시 볼 수 있습니다(스텝을 다시 푸는 것과 같은 자리).
test("[IN-I7] 표지를 끝낸 뒤에도 표지 항목은 잠기지 않고 다시 눌러도 열린다", async () => {
  await renderSignedInApp(<App />);
  finishIntroBySkip();

  expect(introUnit()).toHaveAttribute("data-status", "clear");

  fireEvent.tap(introUnit(), {});

  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  expect(screen.getByTestId("episode-intro-screen-label")).toHaveTextContent("Episode 0.");
});

// ⟨삭제⟩ **[EI5] 「유닛에서 나가면 표지가 아니라 맵으로 돌아온다」는 지웠습니다.**
//
// 그 케이스가 지키던 것은 「표지 → 유닛」으로 이어진 스택에서 유닛을 빠져나올 때
// 표지가 다시 드러나지 않는 것이었습니다. 표지가 **유닛 앞에 끼지 않게 되면서**
// (spec §2.5) 그 스택이 만들어지는 길이 없어졌고, 따라서 **그 상태 자체가 존재하지
// 않습니다** — 유닛은 맵에서 직접 열리므로 그 위에 표지가 깔릴 자리가 없습니다.
// 「일어날 수 없는 일이 일어나지 않는다」를 단언으로 남기면 무엇을 고쳐도 통과하는
// 공허한 케이스가 됩니다. 유닛에서 나가면 맵이라는 관찰 자체는
// `App.messenger.integration.test.tsx`·`App.integration.test.tsx`가 그대로 봅니다.

// ⚠ **미결입니다 — 오늘 동작을 기록만 합니다.** 알림에서 여는 특별 유닛은 맵을 거치지
// 않아 **표지 잠김을 우회합니다**: 같은 유닛이 맵에서는 자물쇠인데 알림에서는 열립니다.
// 옛 [EI8]은 「알림에서 여는 유닛도 표지를 지난다」였고 가로채기 층이 그것을 만들었는데,
// 그 층이 없어지면서 반전됐습니다.
//
// **이것이 옳은지는 미결입니다.** 알림이 잠김을 보고 막아야 하는지, 아니면 알림은
// 「이미 열린 것에 대한 안내」라 잠김을 볼 일이 없는지가 정해진 적이 없습니다. 판정을
// 여기서 지어내지 않고 test-plan §7(판정이 거짓이 되는 조건)으로 올립니다. 이 케이스는
// **동작을 바꾸라고 요구하지 않습니다** — 우회가 실제로 일어난다는 사실을 화면에 못
// 박아, 나중에 누가 그것을 고칠 때 이 줄이 함께 움직이게 합니다.
test("[IN-I8] 알림에서 여는 특별 유닛은 표지를 안 지나고, 맵의 잠김도 우회한다", async () => {
  await renderSignedInApp(<App />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  // 맵에서는 잠겨 있습니다 — 표지를 끝내지 않았기 때문입니다.
  expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "default",
  );

  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});
  fireEvent.tap(screen.getByTestId("notification-list-item-notification-messenger"), {});

  // 표지가 끼어들지 않습니다(계약이 정한 것) …
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  // … 그리고 잠김도 보지 않습니다(미결).
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
});

// 최종 테스트가 열리는 조건이 「자기 말고 여덟 완료」에서 「아홉 완료」로 바뀝니다 —
// 표지가 그 「다른 항목」에 낍니다(spec §2.7 델타 표). 표지만 남겨 두고 나머지를 전부
// 끝낸 씨앗이라, 최종의 잠김이 **표지 하나에** 걸린 것이 드러납니다.
test("[IN-I9] 표지를 끝내기 전에는 최종 테스트가 잠겨 있고, 표지를 끝내면 열린다", async () => {
  const introLeft: AppJourneySeed = {
    completedStepCount: journeySteps.length,
    completedMessengerUnitIds: ["appointment-confirmation"],
    completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
    visualNovelProgress: { status: "completed", beatIndex: 2 },
    completedEpisodeFinalIds: [],
  };
  await renderSignedInApp(<App journeySeed={introLeft} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  expect(screen.getByTestId(finalUnitTestId)).toHaveAttribute("data-status", "default");
  fireEvent.tap(screen.getByTestId(finalUnitTestId), {});
  expect(screen.queryByTestId("episode-final-screen")).not.toBeInTheDocument();

  finishIntroBySkip();

  expect(screen.getByTestId(finalUnitTestId)).toHaveAttribute("data-status", "available");
  fireEvent.tap(screen.getByTestId(finalUnitTestId), {});
  expect(screen.getByTestId("episode-final-screen-title")).toHaveTextContent("Episode 0.");
});

// ------------------------------------------------------------------ 서사 통화 · 메신저
//
// 에피소드마다 서사 형식이 하나입니다. 튜토리얼은 비주얼 노벨이라, 통화 · 메신저 형식은
// 대본을 바꿔 끼워 봅니다(`App`의 `episodePrologueFor`).

const call: PrologueCall = {
  callerName: "Jimin",
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

async function renderWithCall() {
  return await renderSignedInApp(<App episodePrologueFor={() => callPrologue} />);
}

// 옛 [EP1]·[EM1]의 **진입 경로 개정**입니다 — 서사 형식이 무엇이든 들어가는 문은 맵의
// 표지 항목 하나입니다. 형식별 화면이 서는 것은 그 뒤의 일입니다.
test("[IN-I10] 서사가 통화·메신저인 에피소드도 진입점이 표지 항목이다", async () => {
  const first = await renderWithCall();
  openIntro();
  expect(screen.getByTestId("episode-intro-screen-title")).toHaveTextContent("Tutorial.");

  nextIntro();
  expect(screen.queryByTestId("episode-narrative-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("prologue-call-screen-title")).toHaveTextContent("Episode 0.");
  expect(screen.getByTestId("prologue-call-screen-caller")).toHaveAttribute(
    "accessibility-label",
    "Voice call, Jimin",
  );
  first.unmount();

  await renderSignedInApp(<App episodePrologueFor={() => messengerPrologue} />);
  openIntro();
  expect(screen.getByTestId("episode-intro-screen-title")).toHaveTextContent("Tutorial.");

  nextIntro();
  expect(screen.getByTestId("prologue-chat-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-narrative-screen")).not.toBeInTheDocument();
});

// 옛 [EM2]의 **반전**입니다 — 「서사가 없으면 `Next`가 곧장 누른 유닛을 연다」였는데,
// 열 유닛이라는 개념이 없어졌습니다. 서사가 없어도 결과 화면을 지납니다: `Skip`과 같은
// 곳이고, 그래야 완료를 적는 자리가 하나로 남습니다(spec §2.5).
test("[IN-I11] 서사가 없는 에피소드는 Next가 Skip과 같은 결과 화면으로 간다", async () => {
  await renderSignedInApp(<App episodePrologueFor={() => undefined} />);
  openIntro();

  nextIntro();

  expect(screen.queryByTestId("episode-narrative-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");

  tapLessonCompleteCheck();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(introUnit()).toHaveAttribute("data-status", "clear");
});

// 옛 [EI9]의 개정입니다. ⚠ **씨앗 prop의 이름과 값이 함께 바뀝니다**(spec §2.5) —
// `seenEpisodeIntroIds`(에피소드 id)가 `completedEpisodeIntroIds`(표지 **유닛** id)가
// 됩니다. 「봤다」가 아니라 「끝냈다」이고, 축이 에피소드에서 유닛으로 옮겨 간 것을
// 이름이 그대로 집니다. 이 케이스가 그 개명을 잡습니다.
test("[IN-I12] 표지를 끝낸 것으로 부팅하면 맵의 표지가 clear로 서고 뒤가 열려 있다", async () => {
  await renderSignedInApp(<App completedEpisodeIntroIds={["tutorial-intro"]} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  expect(introUnit()).toHaveAttribute("data-status", "clear");
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();

  startOrdering();
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
});

// 옛 [EI7]의 개정입니다 — 「표지를 넘긴 뒤에 한 번」이 아니라 「열리고 나면 **곧장**
// 한 번」입니다. 앞에 끼는 것이 없어졌으므로 탭과 이벤트 사이에 화면이 하나도 없습니다.
test("[IN-I13] 특별 유닛의 열림 이벤트가 곧장 한 번 난다", async () => {
  const messengerEventSink = vi.fn<NonNullable<MessengerEventSink>>();
  await renderSignedInApp(<App messengerEventSink={messengerEventSink} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  // 잠긴 동안은 눌러도 이벤트가 나지 않습니다 — 열리지 않았으니 열린 적도 없습니다.
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  expect(messengerEventSink).not.toHaveBeenCalled();

  finishIntroBySkip();
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});

  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(messengerEventSink.mock.calls.map(([event]) => event.name)).toEqual([
    "messenger_unit_opened",
  ]);
});

// ---------------------------------------------------------------- 남은 흐름 (진입만 개정)
//
// 아래 넷은 계획 표에 없습니다 — 보는 것이 그대로이고 **들어가는 문만** 표지 항목으로
// 바뀝니다. 지우면 서사 형식별 마무리(통화의 `Continue` · 메신저의 보내기)와 모달의
// 「계속 보기」를 보는 자리가 0건이 됩니다.
//
// ⟨흡수⟩ 옛 **[EP4]**(「서사를 마친 뒤에는 같은 에피소드의 유닛에 표지도 서사도 서지
// 않는다」)는 따로 두지 않습니다. 「끼어드는 것이 없다」가 이제 기본값이고, 표지를
// 끝낸 뒤 특별 유닛이 곧장 열리는 것은 [IN-I13]이, 스텝이 열리는 것은 [IN-K2]가
// 봅니다.

test("[EI10] Skip 뒤 모달에서 계속 보기를 고르면 표지에 남고 완료로 적지 않는다", async () => {
  await renderSignedInApp(<App />);
  openIntro();

  tapButtonIn("episode-intro-screen-skip");
  tapButtonIn("ui-lynx-dialog-action-stay");

  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();

  tapIntroBack();
  expect(introUnit()).toHaveAttribute("data-status", "available");
});

test("[EP2] 대사가 흐른 뒤 통화가 끝나면 화면에 남아 Continue를 기다린다", async () => {
  vi.useFakeTimers();
  await renderWithCall();
  vi.useFakeTimers();
  openIntro();
  nextIntro();

  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  vi.useRealTimers();

  expect(screen.getByTestId("prologue-call-screen")).toBeInTheDocument();
  expect(screen.getByTestId("prologue-call-screen-complete")).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
});

test("[EP2b] 통화의 Continue → PERFECT LESSON → Check → 맵이고 표지가 clear다", async () => {
  await renderWithCall();
  openIntro();
  nextIntro();
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});

  fireEvent.tap(screen.getByTestId("prologue-call-screen-complete"), {});
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");

  tapLessonCompleteCheck();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(introUnit()).toHaveAttribute("data-status", "clear");
});

test("[EP3] 통화에서 뒤로 가면 맵이고 완료로 적지 않는다", async () => {
  await renderWithCall();
  openIntro();
  nextIntro();

  fireEvent.tap(
    within(screen.getByTestId("prologue-call-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(introUnit()).toHaveAttribute("data-status", "available");
});

test("[EM1] 메신저 서사를 끝까지 보내면 PERFECT LESSON → Check → 맵이다", async () => {
  vi.useFakeTimers();
  await renderSignedInApp(<App episodePrologueFor={() => messengerPrologue} />);
  vi.useFakeTimers();
  openIntro();
  nextIntro();

  act(() => {
    vi.advanceTimersByTime(1500);
  });
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-send"), {});
  vi.useRealTimers();
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-complete"), {});

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  tapLessonCompleteCheck();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(introUnit()).toHaveAttribute("data-status", "clear");
});

// ------------------------------------------------------------------ 표지 · 서사 이벤트
//
// sink는 App prop으로 직접 주입합니다. 표지 항목을 누르는 순간부터 서사를 마칠 때까지의
// 이벤트를 순서 그대로 봅니다.

async function renderWithIntroSink(
  ui: (sink: NonNullable<EpisodeIntroEventSink>) => Parameters<typeof render>[0],
) {
  const events: EpisodeIntroEvent[] = [];
  await renderSignedInApp(ui((event) => events.push(event)));
  return events;
}

test("[EV1] 표지 항목을 눌러 표지가 서면 episode_intro_viewed가 한 번 난다", async () => {
  const events = await renderWithIntroSink((sink) => <App episodeIntroEventSink={sink} />);

  openIntro();

  expect(events).toEqual([{ name: "episode_intro_viewed", episodeId: "tutorial" }]);
});

test("[EV2] 잠긴 유닛을 눌러서는 표지 이벤트가 나지 않는다", async () => {
  const events = await renderWithIntroSink((sink) => <App episodeIntroEventSink={sink} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});

  expect(events).toEqual([]);
});

test("[EV3] Skip을 누른 것만으로는 나지 않고, 모달에서 건너뛰기를 골라야 episode_intro_skipped가 난다", async () => {
  const events = await renderWithIntroSink((sink) => <App episodeIntroEventSink={sink} />);
  openIntro();

  tapButtonIn("episode-intro-screen-skip");
  tapButtonIn("ui-lynx-dialog-action-stay");
  expect(events.map((event) => event.name)).toEqual(["episode_intro_viewed"]);

  skipIntro();
  expect(events.slice(1)).toEqual([{ name: "episode_intro_skipped", episodeId: "tutorial" }]);
});

test("[EV4] Next → 서사 끝 → Check는 continued · prologue_completed 순서로 난다", async () => {
  const events = await renderWithIntroSink((sink) => <App episodeIntroEventSink={sink} />);
  openIntro();

  nextIntro();
  expect(events.slice(1)).toEqual([
    { name: "episode_intro_continued", episodeId: "tutorial", hasPrologue: true },
  ]);

  readNarrative();
  expect(events.slice(2)).toEqual([
    { name: "episode_prologue_completed", episodeId: "tutorial", prologueKind: "visual-novel" },
  ]);

  tapLessonCompleteCheck();
  expect(events).toHaveLength(3);
});

test("[EV5] 서사가 없는 에피소드의 Next는 hasPrologue가 false이고 서사 완료가 나지 않는다", async () => {
  const events = await renderWithIntroSink((sink) => (
    <App episodePrologueFor={() => undefined} episodeIntroEventSink={sink} />
  ));
  openIntro();

  nextIntro();

  expect(events.slice(1)).toEqual([
    { name: "episode_intro_continued", episodeId: "tutorial", hasPrologue: false },
  ]);
});

test("[EV6] 표지에서 뒤로 나가면 stage가 intro인 episode_intro_exited가 난다", async () => {
  const events = await renderWithIntroSink((sink) => <App episodeIntroEventSink={sink} />);
  openIntro();

  tapIntroBack();

  expect(events.slice(1)).toEqual([
    { name: "episode_intro_exited", episodeId: "tutorial", stage: "intro" },
  ]);
});

test("[EV7] 서사에서 뒤로 나가면 stage가 prologue인 episode_intro_exited가 난다", async () => {
  const events = await renderWithIntroSink((sink) => (
    <App episodePrologueFor={() => callPrologue} episodeIntroEventSink={sink} />
  ));
  openIntro();
  nextIntro();

  fireEvent.tap(
    within(screen.getByTestId("prologue-call-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(events.slice(2)).toEqual([
    { name: "episode_intro_exited", episodeId: "tutorial", stage: "prologue" },
  ]);
});

test("[EV8] 서사 형식이 통화면 prologueKind가 call이다", async () => {
  const events = await renderWithIntroSink((sink) => (
    <App episodePrologueFor={() => callPrologue} episodeIntroEventSink={sink} />
  ));
  openIntro();
  nextIntro();
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});

  fireEvent.tap(screen.getByTestId("prologue-call-screen-complete"), {});

  expect(events.at(-1)).toEqual({
    name: "episode_prologue_completed",
    episodeId: "tutorial",
    prologueKind: "call",
  });
});

test("[EV9] 끝낸 표지를 다시 열어도 episode_intro_viewed가 난다", async () => {
  const events = await renderWithIntroSink((sink) => (
    <App completedEpisodeIntroIds={["tutorial-intro"]} episodeIntroEventSink={sink} />
  ));

  openIntro();

  expect(events).toEqual([{ name: "episode_intro_viewed", episodeId: "tutorial" }]);
});

test("[EV10] (가드) sink 없이도 표지 · 서사의 어느 조작도 던지지 않는다", async () => {
  await renderSignedInApp(<App />);

  expect(() => {
    openIntro();
    tapIntroBack();
    fireEvent.tap(introUnit(), {});
    nextIntro();
    readNarrative();
    tapLessonCompleteCheck();
  }).not.toThrow();
});
