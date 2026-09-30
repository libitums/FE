import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { ListeningScreen } from "./ListeningScreen";
import type { JourneyStepId } from "../journey-map/journey-map";
// sessionOptions가 필수 prop이 됐습니다. 이 파일의 fixture는 언제나 초기값(둘
// 다 켜짐)을 줍니다 — 단언은 한 글자도 바꾸지 않습니다.
import { initialSessionOptions } from "../../lib/session-options";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// 무대(가운데 카드) 안만 세는 헬퍼입니다. 뼈대는 `LearningShell`의 것이고 그 계약은
// 껍데기 자신의 테스트가 답니다 — 여기서 화면 전체를 세면 상단 바의 칩 · 알림 버튼과
// 나가기 · 아래 버튼까지 들어와, 이 파일이 무엇을 고정하는지가 흐려집니다.
function stageTappables(): readonly (string | null)[] {
  const stage = screen.getByTestId("learning-shell-stage");
  return [...stage.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );
}

function stageIcons(): readonly (string | null)[] {
  const stage = screen.getByTestId("learning-shell-stage");
  return [...stage.querySelectorAll("svg")].map((el) => el.getAttribute("data-testid"));
}

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 봅니다 (ADR-0006 D4).
// 순수 함수(listening.ts)를 mock하지 않습니다 — 화면이 그것을 실제로 부르는지가
// 이 파일이 보는 것의 절반입니다. `toHaveClass`·`toHaveStyle`·`toBeVisible`을
// 쓰지 않습니다 (docs/conventions/code.md).
//
// 기대값의 정본은 계약의 고정 데이터입니다 — 아래 상수는 그것을 옮긴 것이지
// 지어낸 것이 아닙니다. `ordering`은 서수 3이고 문항 셋의 정답 인덱스가 서로
// 다릅니다(불변식 — "첫 보기를 계속 고르면 전부 맞는" 경로가 없습니다).

const ORDERING_QUESTIONS = [
  { prompt: "따뜻한 아메리카노 한 잔 주세요.", answerIndex: 2 },
  {
    prompt: "주문하시겠어요? 음료는 따뜻한 것과 차가운 것 중에 무엇으로 드릴까요?",
    answerIndex: 0,
  },
  { prompt: "카드로 결제할게요.", answerIndex: 3 },
] as const;

const CHOICE_TESTIDS = [
  "listening-choice-0",
  "listening-choice-1",
  "listening-choice-2",
  "listening-choice-3",
] as const;

function renderOrdering(
  overrides: {
    onExit?: () => void;
    // (u7 보정) onFinish가 인자 둘을 받습니다 — id와 응답 순서·길이대로의 판정
    // 결과 배열입니다. 통과 여부는 듣기가 계산하지 않습니다. **둘째 인자를
    // optional로 적습니다** — 현재 소스(`ListeningScreen.tsx`)는 아직 u2의
    // 1-인자 시그니처이고 이 화면 컴포넌트는 이 라운드가 고치지 않습니다(구현은
    // 다음 단위입니다). optional이 아니면 `onFinish={overrides.onFinish}`가
    // 1-인자 prop 타입에 대입되지 않아 `typecheck`가 red보다 먼저 죽습니다 —
    // 그것은 이 라운드가 원하는 red가 아닙니다.
    onFinish?: (id: JourneyStepId, results?: readonly AnswerResult[]) => void;
  } = {},
) {
  return render(
    <ListeningScreen
      stepId="ordering"
      onExit={overrides.onExit ?? (() => {})}
      onFinish={overrides.onFinish ?? (() => {})}
      sessionOptions={initialSessionOptions}
    />,
  );
}

// 문항 하나를 정답으로 응답하고 다음으로 넘깁니다. 임의의 대기를 두지 않습니다
// — tap이 리듀서 전이를 동기적으로 일으키고 렌더가 끝납니다 (JourneyMapScreen
// 선례).
function answerCorrectlyAndAdvance(questionIndex: number): void {
  fireEvent.tap(
    screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[questionIndex].answerIndex}`),
    {},
  );
  // 문항 사이는 버튼이 아니라 **넘김 층**입니다 — 고른 뒤 화면을 누르면 즉시
  // 넘어가고, 안 누르면 타이머가 넘깁니다(2026-09-28).
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
}

// 나가기는 두 걸음입니다 ⟨2026-09-28⟩ — `×`는 묻기만 하고 실제로 떠나는 것은 모달의
// `Leave`입니다. 그 계약은 껍데기 자신의 테스트가 지므로, 여기서는 「끝까지 나간다」를
// 한 줄로 부릅니다.
function exitThroughConfirm(container: Element): void {
  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});
  const leave = [...container.querySelectorAll('[data-testid="ui-lynx-button"]')].find(
    (el) => el.getAttribute("accessibility-label") === "Leave",
  );
  expect(leave).toBeDefined();
  fireEvent.tap(leave as Element, {});
}

function completeAllThree(): void {
  answerCorrectlyAndAdvance(0);
  answerCorrectlyAndAdvance(1);
  answerCorrectlyAndAdvance(2);
}

// ------------------------------------------------------------ 오디오 대역
//
// 형태의 정본은 `src/lib/audio.unit.test.ts`의 `stubHost()`입니다. **`lib/audio.ts`를
// mock하지 않습니다** — 화면이 실제 접점을 지나 호스트 경계까지 닿는지가 이
// 파일이 보는 것의 절반입니다. 대역을 두는 자리는 호스트 경계 하나입니다.
//
// **아래 대부분의 테스트는 대역을 세우지 않습니다.** 그것이 회귀 단언입니다 —
// 전역 `NativeModules`가 아예 없는 환경에서도 화면이 던지지 않고 렌더됩니다.

const STOP = "<stop>";

type HostCall = { source: string; done: (result: unknown) => void };
type AnnounceCall = { content: string };

// ⚠ **`vi.stubGlobal("NativeModules", …)`은 전역을 통째로 덮습니다.** 낭독
// 대역을 따로 세우면 뒤에 부른 쪽이 앞의 것을 지웁니다 — 오디오가 죽거나(기존
// 케이스가 실패) 발화가 안 잡힙니다(새 케이스가 공허하게 통과). 그래서 이
// 파일의 `vi.stubGlobal`은 **하나**이고 그 객체가 **두 모듈을 함께** 담습니다.
//
// 반환은 호출 배열 둘입니다. `sourcesOf`·`stopCount`의 입력 타입은 그대로
// `HostCall[]`입니다 — 기존 오디오 단언이 한 줄도 흔들리지 않습니다.
function stubHost(): { audio: HostCall[]; announce: AnnounceCall[] } {
  const audio: HostCall[] = [];
  const announce: AnnounceCall[] = [];
  const audioModule = {
    play: (source: string, done: (result: unknown) => void) => void audio.push({ source, done }),
    stop: () => void audio.push({ source: STOP, done: () => {} }),
  };
  const accessibilityModule = {
    accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
      announce.push({ content: args.content });
      callback("announced");
    },
  };
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: audioModule,
    LynxAccessibilityModule: accessibilityModule,
  });
  return { audio, announce };
}

function stubCompletionHost(): {
  announce: AnnounceCall[];
  completion: AnnounceCall[];
} {
  const announce: AnnounceCall[] = [];
  const completion: AnnounceCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        announce.push({ content: args.content });
        callback("announced");
      },
    },
    CompletionAnnouncementModule: {
      announce: (args: { content: string }, callback: (result: unknown) => void) => {
        completion.push({ content: args.content });
        callback("announced");
      },
    },
  });
  return { announce, completion };
}

const sourcesOf = (calls: readonly HostCall[]): string[] => calls.map((call) => call.source);

const stopCount = (calls: readonly HostCall[]): number =>
  calls.filter((call) => call.source === STOP).length;

// 없던 전역을 세우므로 테스트마다 원상복구합니다 — 지우지 않으면 다른 파일로 샙니다.
afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- 처음 렌더 (단언 1~4)

// 단언 1 — 2026-09-27: 화면 제목이 없어졌습니다(Figma 65-14). 뼈대는 `LearningShell`의
// 것이고 이 화면이 아는 것은 카드 **안**뿐입니다. 그 경계가 성립하는지를 답니다:
// 껍데기가 서고, 문항이 그 무대 안에 들어 있습니다.
test("뼈대는 껍데기가 세우고 문항은 그 무대 안에 선다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();

  const stage = screen.getByTestId("learning-shell-stage");
  expect(within(stage).getByTestId("listening-screen-content")).toBeInTheDocument();
  expect(within(stage).getByTestId("listening-prompt-text")).toBeInTheDocument();
});

// 단언 2 — 1-based로 보입니다.
test("진행 문구가 'Lesson 1 / 3'이다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 3");
});

// 단언 3 (수용 기준 4)
test("첫 문항이 제시되고 보기가 네 개 렌더된다", () => {
  renderOrdering();

  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(
    ORDERING_QUESTIONS[0].prompt,
  );
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  }
});

// 단언 4 — **수용 기준 3의 `ui` 쪽 판정입니다.** 어느 스텝에서 왔는지가 화면에
// 드러납니다: 문항이 스텝마다 갈립니다. 한 스텝의 데이터가 박혀 있으면 여기서
// 잡힙니다. 제목 절은 걷혔습니다 — 화면 제목이 없어졌고(Figma 65-14) 스텝을 가리는
// 채널은 이제 문항 하나입니다.
test("다른 스텝으로 렌더하면 문항이 갈린다", () => {
  const ordering = render(
    <ListeningScreen
      stepId="ordering"
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
    />,
  );
  const orderingPrompt = screen.getByTestId("listening-prompt-text").textContent;
  ordering.unmount();

  render(
    <ListeningScreen
      stepId="introduction"
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
    />,
  );

  const introductionPrompt = screen.getByTestId("listening-prompt-text");
  expect(introductionPrompt).toHaveTextContent("이름이 어떻게 되세요?");
  expect(introductionPrompt.textContent).not.toBe(orderingPrompt);
});

// ---------------------------------------------------------------- 응답 전 (단언 5·6)

// 단언 5 — 나가는 수단이 정확히 하나입니다: 미완료에서는 `×`뿐입니다. 넘김 층도
// 아래 버튼도 응답 전에는 없습니다 — 둘 다 응답 여부의 프로브입니다.
test("응답 전에는 나가기만 있고 넘김 층·마치기가 없다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-advance")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-complete")).not.toBeInTheDocument();
});

// 단언 6 — 정답 보기도 예외가 아닙니다.
test("응답 전 네 보기가 전부 data-result='none'이다", () => {
  renderOrdering();

  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toHaveAttribute("data-result", "none");
  }
});

// 같은 사실의 보조기술 채널입니다 — 응답 전에는 어느 보기에도 접미사가
// 없습니다. 네 보기가 전부 ", incorrect" 류로 읽히면 **답을 미리 알려 주는
// 것**이 됩니다.
test("응답 전 네 보기의 accessibility-label에 접미사가 없다 — 답을 미리 알려 주지 않는다", () => {
  renderOrdering();

  for (const testid of CHOICE_TESTIDS) {
    const label = screen.getByTestId(testid).getAttribute("accessibility-label");
    expect(label).not.toContain(", correct");
    expect(label).not.toContain(", incorrect");
  }
});

// ---------------------------------------------------------------- 판정 (단언 7~9)

// 단언 7 — 세 관찰 채널을 아래 세 테스트로 나눠 봅니다(채널이 서로 다른 것을
// 봅니다).
test("정답 보기를 탭하면 그 보기만 data-result='correct'이고 나머지 셋은 'none'이다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  CHOICE_TESTIDS.forEach((testid, index) => {
    expect(screen.getByTestId(testid)).toHaveAttribute(
      "data-result",
      index === ORDERING_QUESTIONS[0].answerIndex ? "correct" : "none",
    );
  });
});

test("정답 보기를 탭하면 그 보기의 accessibility-label에 ', correct'가 붙는다", () => {
  renderOrdering();

  const answered = screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`);
  const before = answered.getAttribute("accessibility-label");

  fireEvent.tap(answered, {});

  expect(
    screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`),
  ).toHaveAttribute("accessibility-label", `${before}, correct`);
});

// 재판정: accessibility-elements-hidden의 iOS 세터는 view.accessibilityElementsHidden이라
// 가리는 대상이 자손입니다. 표식 아이콘은 자손 없는 잎 `<svg>`이므로 이 속성을
// 붙여도 아무것도 가리지 못합니다 — 붙이지 않는 것이 계약입니다 (E-A1, E-A2).
// 가림은 `ListeningChoice.ui.test.tsx`의 래퍼(`listening-choice-mark`) 단언이
// 집니다.
// 2026-09-27: 보기의 표식이 걷히고 **판정 배지**가 그 자리를 대신합니다. 배지는
// 무대 카드 안에 서고, 아이콘은 잎이라 가림 속성을 지지 않습니다.
test("정답 보기를 탭하면 무대에 정답 배지가 나타나고 보기에는 표식이 없다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0].answerIndex;
  expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId(`listening-choice-${answerIndex}`), {});

  const verdict = screen.getByTestId("answer-verdict");
  expect(verdict).toHaveAttribute("data-result", "correct");
  expect(verdict).toHaveTextContent("Correct");
  expect(screen.getByTestId("answer-verdict-icon")).not.toHaveAttribute(
    "accessibility-elements-hidden",
  );
  expect(screen.queryByTestId(`listening-choice-icon-${answerIndex}`)).not.toBeInTheDocument();
});

// 2026-09-28: 응답 뒤에 **아래 버튼이 서지 않습니다.** 판정을 보인 채 몇 초 뒤 저절로
// 다음 문항으로 넘어가고, 그 동안 화면 전체가 「지금 누르면 곧바로 넘어간다」는 넘김
// 층이 됩니다.
//
// 버튼의 부재와 넘김 층의 존재를 **함께** 답니다 — 하나만 보면 「버튼을 지우다 넘김을
// 빠뜨린 것」과 구별되지 않습니다.
test("정답 보기를 탭하면 넘김 층이 서고 아래 버튼은 서지 않는다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
});

// 단언 8 — **정답을 알려 주지 않습니다.** 오답을 골라도 정답 보기는 판정을 지지
// 않습니다. 두 채널로 함께 봅니다: 고르지 않은 정답 보기는 data-result가
// "none"이고 라벨에도 접미사가 없습니다.
test("오답 보기를 탭하면 그 보기만 incorrect이고 정답 보기는 여전히 none이다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0].answerIndex;
  const wrongIndex = (answerIndex + 1) % 4;

  fireEvent.tap(screen.getByTestId(`listening-choice-${wrongIndex}`), {});

  expect(screen.getByTestId(`listening-choice-${wrongIndex}`)).toHaveAttribute(
    "data-result",
    "incorrect",
  );
  expect(screen.getByTestId(`listening-choice-${answerIndex}`)).toHaveAttribute(
    "data-result",
    "none",
  );
});

test("오답을 골라도 정답 보기의 라벨에 접미사가 붙지 않는다 — 정답 노출 없음", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0].answerIndex;
  const wrongIndex = (answerIndex + 1) % 4;

  fireEvent.tap(screen.getByTestId(`listening-choice-${wrongIndex}`), {});

  const answerLabel = screen
    .getByTestId(`listening-choice-${answerIndex}`)
    .getAttribute("accessibility-label");
  expect(answerLabel).not.toContain(", correct");
  // 고른 보기에는 보이는 낱말이 없습니다 — 「오답」은 무대의 배지가 말합니다.
  expect(screen.getByTestId(`listening-choice-${wrongIndex}`)).not.toHaveTextContent("ncorrect");
  expect(screen.getByTestId("answer-verdict")).toHaveTextContent("Incorrect");
});

// 단언 9 — **게이트가 리듀서라는 것의 `ui` 쪽 관찰입니다** — 보기 컴포넌트는
// tap을 그대로 올리는데(ListeningChoice 단언 10) 화면의 판정이 움직이지
// 않습니다.
test("응답 뒤 다른 보기를 탭해도 첫 응답이 그대로다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0].answerIndex;
  const otherIndex = (answerIndex + 1) % 4;

  fireEvent.tap(screen.getByTestId(`listening-choice-${answerIndex}`), {});
  fireEvent.tap(screen.getByTestId(`listening-choice-${otherIndex}`), {});

  expect(screen.getByTestId(`listening-choice-${answerIndex}`)).toHaveAttribute(
    "data-result",
    "correct",
  );
  expect(screen.getByTestId(`listening-choice-${otherIndex}`)).toHaveAttribute(
    "data-result",
    "none",
  );
});

// **0은 falsy입니다.** `introduction`의 둘째 문항은 정답 인덱스가 0이라, 0번 보기를
// 고른 것이 응답으로 기록되지 않으면 여기서만 잡힙니다 — 판정도 안 나오고
// `다음`도 안 뜹니다.
test("0번 보기를 골라도 응답으로 기록된다 — 0은 falsy다", () => {
  render(
    <ListeningScreen
      stepId="introduction"
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
    />,
  );

  fireEvent.tap(screen.getByTestId("listening-choice-3"), {});
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  fireEvent.tap(screen.getByTestId("listening-choice-0"), {});

  expect(screen.getByTestId("listening-choice-0")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 문항 진행 (단언 10)

// 단언 10
test("넘김 층을 탭하면 진행·문항이 갈리고 판정이 초기화되며 층이 다시 사라진다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 3");
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(
    ORDERING_QUESTIONS[1].prompt,
  );
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toHaveAttribute("data-result", "none");
  }
  expect(screen.queryByTestId("learning-shell-advance")).not.toBeInTheDocument();
});

// 두 번째 문항의 정답 인덱스가 0입니다 — 문항이 넘어간 뒤에도 0번 보기가 살아
// 있습니다.
test("두 번째 문항에서도 0번 보기가 응답으로 기록된다", () => {
  renderOrdering();

  answerCorrectlyAndAdvance(0);
  fireEvent.tap(screen.getByTestId("listening-choice-0"), {});

  expect(screen.getByTestId("listening-choice-0")).toHaveAttribute("data-result", "correct");
});

// ---------------------------------------------------------------- 완료 (단언 11·12)

// 단언 11 — **수용 기준 7.** 문항 셋을 마치면 완료 상태로 넘어가고, 완료
// 상태에서만 맵 복귀 수단이 나타납니다. 나가는 수단이 어느 시점에도 정확히
// 하나이므로 `맵으로`는 사라집니다 — 둘 다 두면 같은 목적지에 가는데 진행이
// 갈리는 버튼 둘이 앉습니다.
test("문항 셋을 마치면 완료 문구와 마치기가 나타난다", () => {
  renderOrdering();

  completeAllThree();

  expect(screen.getByTestId("listening-screen-complete")).toHaveTextContent("All questions done");
  expect(screen.getByTestId("learning-shell-action")).toBeInTheDocument();
});

// 나가기는 남습니다 — 껍데기의 `×`는 세션 내내 서 있고, 그 목적지(맵)는 완료
// 버튼의 목적지(결과)와 다릅니다. 「같은 곳으로 가는 버튼 둘」이 아닙니다.
// ⟨2026-09-28⟩ 세션 헤더는 완료 상태에도 남습니다 — 껍데기의 것이고, 나가기와 같은
// 자리에 있습니다. 사라지는 것은 문항이 쓰던 것들(제시문 · 보기)뿐입니다. 진행 순번은
// 마지막 문항 자리에 멈춥니다.
test("완료 상태에서 문항·보기가 사라지고 나가기와 진행은 남는다", () => {
  renderOrdering();

  completeAllThree();

  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 3 / 3");
  expect(screen.queryByTestId("listening-prompt-text")).not.toBeInTheDocument();
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.queryByTestId(testid)).not.toBeInTheDocument();
  }
});

// 마지막 문항을 응답한 것만으로는 완료가 아닙니다 — `다음`을 한 번 더 눌러야
// 넘어갑니다. (questionIndex === 문항 수가 완료이고, 응답은 인덱스를 올리지
// 않습니다.)
test("마지막 문항에 응답만 해서는 완료가 아니다", () => {
  renderOrdering();

  answerCorrectlyAndAdvance(0);
  answerCorrectlyAndAdvance(1);
  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[2].answerIndex}`), {});

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 3 / 3");
  // 아직 넘김 층입니다 — 완료였다면 아래 버튼(`결과 보기`)이 섰을 자리입니다.
  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-complete")).not.toBeInTheDocument();
});

// 완료 전이만 custom 모듈을 사용하고 builtin announce로 중복 발화하지 않습니다.
test("완료 전이에서 custom announceCompletion이 원문으로 한 번, builtin은 0번 불린다", () => {
  const { announce, completion } = stubCompletionHost();

  const view = renderOrdering();
  expect(completion).toHaveLength(0);
  completeAllThree();

  expect(completion).toHaveLength(1);
  expect(completion[0]?.content).toBe("All questions done, See results");
  expect(announce).toHaveLength(0);

  view.rerender(
    <ListeningScreen
      stepId="ordering"
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
    />,
  );
  expect(completion).toHaveLength(1);
  expect(announce).toHaveLength(0);
});

// 단언 12 — 진행 갱신의 주체는 App이고, 통과 여부는 평가가 판정합니다(u7
// 보정). 화면은 「끝났다」와 「무엇이 일어났는지」만 되돌려 줍니다.
test("마치기를 탭하면 onFinish가 stepId와 응답 결과 배열로 정확히 한 번 불린다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results?: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  completeAllThree();
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["correct", "correct", "correct"], 0);
});

// 오답으로 전부 응답해도 완료됩니다 — 이 슬라이스에 재시도 규칙이 없습니다.
// 결과 배열도 전부 incorrect로 응답 순서·길이대로 옵니다.
test("전부 오답이어도 완료 상태로 넘어가고 onFinish가 결과 배열과 함께 불린다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results?: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  for (const question of ORDERING_QUESTIONS) {
    fireEvent.tap(screen.getByTestId(`listening-choice-${(question.answerIndex + 1) % 4}`), {});
    // 문항 사이는 넘김 층입니다(2026-09-28).
    fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  }
  // 세션이 끝난 뒤에만 아래 버튼(`결과 보기`)이 섭니다.
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["incorrect", "incorrect", "incorrect"], 0);
});

// ---------------------------------------------------------------- 중도 이탈 (단언 13)

// 단언 13 — **수용 기준 10의 `ui` 쪽 판정입니다.** `맵으로`는 진행을 갱신하지
// 않습니다. onExit과 onFinish가 다른 콜백인 이유가 이 단언입니다.
test("응답 전 나가기를 탭하면 onExit이 한 번, onFinish는 한 번도 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId) => void>();
  const { container } = renderOrdering({ onExit, onFinish });

  exitThroughConfirm(container);

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

test("문항 하나를 응답한 뒤 나가도 onFinish가 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId) => void>();
  const { container } = renderOrdering({ onExit, onFinish });

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});
  exitThroughConfirm(container);

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------- 접근성 (단언 14)

// 단언 14 (수용 기준 12의 "붙었는가" 절반입니다. 실제 낭독은 실기가
// 판정합니다 — ADR-0016 D6). 두 출구의 라벨이 **다른 문자열**이라는 것도 함께
// 봅니다 — 음성 제어에서 갈립니다.
// 나가기의 접근성 속성은 껍데기가 자기 테스트에서 답니다(`LearningShell.ui.test.tsx`).
// 여기서 보는 것은 **배선** 하나입니다 — 그 버튼이 이 화면의 `onExit`에 닿는가.
test("껍데기의 나가기가 이 화면의 onExit에 닿는다", () => {
  const onExit = vi.fn<() => void>();
  const { container } = render(
    <ListeningScreen
      stepId="ordering"
      onExit={onExit}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
    />,
  );

  exitThroughConfirm(container);

  expect(onExit).toHaveBeenCalledTimes(1);
});

// 넘김 층은 낱말이 없는 투명한 상자라 이름을 `accessibility-label` 혼자 집니다.
// 층이 트리에 있는 동안 화면 어디를 눌러도 다음 문항으로 가므로 조작 단위로 읽혀야
// 합니다 — 안 그러면 보조기술 사용자에게는 「기다리는 것 말고 할 수 있는 일이 없는
// 화면」이 됩니다.
test("넘김 층에 element·label='Continue'·traits='button'이 붙는다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  const advance = screen.getByTestId("learning-shell-advance");
  expect(advance).toHaveAttribute("accessibility-element", "true");
  expect(advance).toHaveAttribute("accessibility-label", "Continue");
  expect(advance).toHaveAttribute("accessibility-traits", "button");
});

// (u7 보정) 완료 버튼의 문구가 '맵으로 돌아가기' → '결과 보기'로 바뀝니다 —
// testid·클래스·DOM 자리·accessibility-traits는 그대로이고 보이는 문구와
// accessibility-label 두 문자열만 바뀝니다. 목적지가 맵이 아니라 평가 화면으로
// 바뀌었기 때문입니다. 통과든 미통과든 이 문구는 참입니다 — 판정에 따라 가르지
// 않습니다.
test("마치기에 element·label='See results'·traits='button'이 붙는다", () => {
  renderOrdering();

  completeAllThree();

  const finish = screen.getByTestId("learning-shell-action");
  expect(finish).toHaveAttribute("accessibility-element", "true");
  expect(finish).toHaveAttribute("accessibility-label", "See results");
  expect(finish).toHaveAttribute("accessibility-traits", "button");
  expect(finish).toHaveTextContent("See results");
});

// ADR-0016 D3 `정정 기록`: 상태는 라벨 접미사이고 accessibility-value를 쓰지
// 않습니다.
test("화면 어느 요소에도 accessibility-value가 없다", () => {
  const { container } = renderOrdering();

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
});

// 버튼 안의 라벨 <text>는 장식입니다 — 조작 단위가 되면 정지 노드가 둘로 갈리고
// 이름이 두 번 읽힙니다 (ADR-0016 D5).
test("나가기·마치기 안의 라벨 텍스트가 조작 단위가 되지 않는다", () => {
  renderOrdering();

  expect(
    screen.getByTestId("learning-shell-exit").querySelectorAll("[accessibility-element]"),
  ).toHaveLength(0);

  completeAllThree();

  expect(
    screen.getByTestId("learning-shell-action").querySelectorAll("[accessibility-element]"),
  ).toHaveLength(0);
});

// ---------------------------------------------------------------- 조작 단위 목록 (단언 15)

// 단언 15 — 화면의 조작 단위를 **순서까지** 세는 자리입니다. `bindtap`은 이
// 환경에서 DOM 속성으로 직렬화되지 않으므로(확인함) 탭 대상은 조작 단위의
// 관찰 채널인 accessibility-traits="button"으로 셉니다.
//
// **재생 조작이 여기 끼면서 목록이 뒤집혔습니다.** 자리는 나가기와 보기
// **사이**입니다 — DOM 순서 = 낭독 순서이므로 목록의 순서가 곧 접근성
// 계약이고, 사용자가 보기를 만나기 **전에** 다시 들을 수단을 만납니다.
//
// 수용 기준 5는 이제 「오디오 코드 0줄」이 아니라 「`<audio>`·`<video>`·`new Audio`·
// `AudioContext`를 쓰지 않는다」로 좁아졌습니다 — 이번에 연 것은 네이티브
// 모듈 경로 하나이고 DOM 요소도 웹 오디오도 아니다.
// 2026-09-27: 보기가 무대 **밖**으로 나갔습니다(Figma 53-14231). 무대 안에 남는
// 조작 단위는 재생 컨트롤 둘이고, 보기 넷은 작업 영역에 섭니다.
test("응답 전 무대의 조작 단위가 재생 컨트롤 둘뿐이다", () => {
  renderOrdering();

  expect(stageTappables()).toEqual(["listening-prompt-replay", "listening-prompt-playback"]);
});

test("보기 넷이 무대 밖 작업 영역에 선다", () => {
  renderOrdering();

  const workspace = screen.getByTestId("learning-shell-scroll");
  const choices = [...workspace.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(choices).toEqual([
    "listening-choice-0",
    "listening-choice-1",
    "listening-choice-2",
    "listening-choice-3",
  ]);
  const stage = screen.getByTestId("learning-shell-stage");
  expect(within(stage).queryByTestId("listening-choice-0")).not.toBeInTheDocument();
});

// 응답해도 무대 안의 목록은 그대로입니다 — 넘김은 무대 **밖**, 껍데기가 화면 위에
// 덮는 층입니다. 그것이 생겼다는 것은 따로 답니다.
test("응답 뒤에도 무대의 조작 단위는 그대로이고 넘김 층이 생긴다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  expect(stageTappables()).toEqual(["listening-prompt-replay", "listening-prompt-playback"]);
  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
});

test("완료 상태의 무대에는 조작 단위가 없고 아래 버튼이 마치기다", () => {
  renderOrdering();

  completeAllThree();

  expect(stageTappables()).toEqual([]);
  expect(screen.getByTestId("learning-shell-action")).toHaveTextContent("See results");
});

// 아이콘 개수도 뒤집혔습니다. 응답 전에 하나 있고 그것이 **재생 아이콘**이며,
// 응답 뒤에 생기는 둘째가 고른 보기의 표식입니다. 순서까지 셉니다 — 재생
// 아이콘이 보기의 표식보다 앞입니다.
test("응답 전 무대의 <svg>가 컨트롤 아이콘 둘이다", () => {
  renderOrdering();

  // 앵커: 개수 단언만 두면 화면이 반쯤 그려져도 통과합니다. 문항과 보기가
  // 실제로 그려진 트리에서 아이콘이 하나라는 것이 이 단언의 내용입니다.
  expect(screen.getByTestId("listening-prompt-text")).toBeInTheDocument();
  expect(screen.getByTestId("listening-choice-0")).toBeInTheDocument();

  expect(stageIcons()).toEqual(["listening-prompt-replay-icon", "listening-prompt-playback-icon"]);
});

// 고른 보기의 표식이 걷히고 **판정 배지**가 그 자리를 대신합니다. 배지는 무대 안,
// 보기는 무대 밖 — 그래서 무대의 아이콘은 배지 하나가 늘어납니다.
test("응답 뒤 무대의 <svg>가 판정 배지 + 컨트롤 아이콘 둘이다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0].answerIndex;
  fireEvent.tap(screen.getByTestId(`listening-choice-${answerIndex}`), {});

  expect(stageIcons()).toEqual([
    "answer-verdict-icon",
    "listening-prompt-replay-icon",
    "listening-prompt-playback-icon",
  ]);
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
});

test("완료 상태에는 재생 아이콘 없이 장식용 완료 아이콘만 있다", () => {
  renderOrdering();

  completeAllThree();

  expect(stageIcons()).toEqual(["learning-activity-complete-icon"]);
});

// ---------------------------------------------------------------- 오디오
//
// 여기부터가 이 라운드에 더해진 둘 + 언마운트 하나입니다. **`lib/audio.ts`를
// mock하지 않고 호스트 경계에 대역을 둡니다** — 화면이 현재 문항의 옳은
// `audioSource`를 실제로 아래로 흘리는지가 이 절이 보는 것입니다.

// 추가 1 — **「현재 문항의 옳은 `source`」의 `ui` 쪽 판정입니다.** 값의 정본은
// 계약의 고정 데이터입니다. 문항이 넘어갈 때 **이전 것이 먼저 멈춘다**는
// 순서까지 봅니다. 화면이 `question.prompt`만 내리고 `audioSource`를 안 내리면
// 여기서만 잡힙니다.
test("현재 문항의 audioSource로 play가 불리고, 다음 문항에서 stop 뒤 새 source로 불린다", () => {
  const { audio } = stubHost();
  renderOrdering();

  expect(sourcesOf(audio)).toEqual(["ordering-1"]);

  answerCorrectlyAndAdvance(0);

  expect(sourcesOf(audio)).toEqual(["ordering-1", STOP, "ordering-2"]);
});

// 다른 스텝으로 렌더하면 source도 갈립니다 — 한 스텝의 값이 박혀 있으면
// 여기서 잡힙니다(단언 4의 오디오 축 짝입니다).
test("다른 스텝으로 렌더하면 play의 source가 그 스텝의 첫 문항 것이다", () => {
  const { audio } = stubHost();

  render(
    <ListeningScreen
      stepId="introduction"
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
    />,
  );

  expect(sourcesOf(audio)).toEqual(["introduction-1"]);
});

// 추가 2 — 문항을 다 마치면 `ListeningPrompt`가 언마운트되고 cleanup이 `stop`을
// 부릅니다. **완료 화면에서 소리가 계속 나면 안 됩니다.**
test("문항 셋을 마쳐 완료가 되면 stop이 불리고 재생 조작이 트리에서 사라진다", () => {
  const { audio } = stubHost();
  renderOrdering();

  completeAllThree();

  expect(sourcesOf(audio)).toEqual(["ordering-1", STOP, "ordering-2", STOP, "ordering-3", STOP]);
  expect(screen.getByTestId("learning-shell-action")).toBeInTheDocument(); // 앵커
  expect(screen.queryByTestId("listening-prompt-playback")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-prompt-playback-icon")).not.toBeInTheDocument();
});

// `ui` 쪽 절반입니다. `맵으로`·`맵으로 돌아가기`·탭 전환은 **화면을 언마운트하는
// 것**이고, 셋을 각각 손으로 잇지 않는 근거가 cleanup 하나입니다. 실제로
// 언마운트를 일으키는 것은 `App`이므로 그 경로는 `integration`이 봅니다.
test("화면을 언마운트하면 stop이 불린다 — 출구 둘과 탭 전환이 지나는 자리다", () => {
  const { audio } = stubHost();
  const { unmount } = renderOrdering();
  expect(stopCount(audio)).toBe(0);

  unmount();

  expect(sourcesOf(audio)).toEqual(["ordering-1", STOP]);
});

// 대역이 없어도 화면이 던지지 않습니다 — 위의 스무 남짓한 테스트가 전부 대역
// 없이 도는 것이 이미 회귀 단언이지만, **그 사실을 이름으로 한 번 못박습니다.**
// `NativeModules` 전역이 아예 없는 환경에서 맨 식별자 접근이면 여기서
// ReferenceError입니다.
// ------------------------------------------- 완료 전이 발화
//
// 오디오와 **같은 대역**을 지납니다 — `stubHost()`가 한 객체에 두 모듈을
// 담습니다. 위 오디오 절의 단언들이 그대로 통과하는 것이 그 병합이 옳다는
// 증거입니다.
//
// 판정(정답/오답)은 이 채널로 나가지 않습니다 — 라벨 접미사(ADR-0016 D3)가 이미
// 지고 있고 위 판정 절이 그대로입니다. 여기서 보는 것은 세션의 종료
// 하나입니다.
//
// **X-E는 이 화면에 두지 않습니다.** 실물 문항 표가 다섯 스텝 전부 비어 있지
// 않아 듣기는 마운트-완료 상태에 **원리적으로 도달하지 않습니다** — 없는
// 상태를 만들려고 이 파일에 없는 `vi.mock`을 새로 들이지 않습니다.

test("[X-A] 완료 전이 뒤 announce가 정확히 하나이고 content가 'All questions done, See results'다", () => {
  const { announce } = stubHost();
  renderOrdering();

  completeAllThree();

  expect(screen.getByTestId("listening-screen-complete")).toBeInTheDocument(); // 앵커
  expect(announce).toHaveLength(1);
  expect(announce[0]?.content).toBe("All questions done, See results");
});

// X-B. 전이 **전에는** 0건입니다. 가드(`if (!complete) return;`)를 지우면 문항
// 도중에 완료 발화가 나가고 이 케이스가 잡습니다. 같은 대역이 오디오도 받고
// 있으므로 그쪽이 도는 동안 낭독 큐는 조용하다는 것까지 함께 집니다.
test("[X-B] 첫 렌더·응답·중간 다음까지 announce가 0건이다", () => {
  const { announce, audio } = stubHost();
  renderOrdering();

  expect(announce).toHaveLength(0);

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  expect(announce).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 3"); // 앵커
  expect(sourcesOf(audio)).toEqual(["ordering-1", STOP, "ordering-2"]); // 오디오는 그대로 돕니다
  expect(announce).toHaveLength(0);
});

// X-C. **정확히 한 번입니다.** 종료 상태에 닿은 뒤 같은 props로 다시 렌더해도
// 호출이 늘지 않습니다 — dep 배열을 지워 매 렌더 실행이 되면 여기서만
// 잡힙니다. props를 새로 짓지 않고 **같은 참조**를 다시 넘깁니다 — 값이
// 갈려서 늘어난 것이 아니라 렌더 자체로 늘어난 것을 보려는 것입니다.
test("[X-C] 완료 상태에서 같은 props로 다시 렌더해도 announce가 늘지 않는다", () => {
  const { announce } = stubHost();
  const onExit = () => {};
  const onFinish = () => {};
  const view = render(
    <ListeningScreen
      stepId="ordering"
      onExit={onExit}
      onFinish={onFinish}
      sessionOptions={initialSessionOptions}
    />,
  );

  completeAllThree();

  expect(announce).toHaveLength(1);

  view.rerender(
    <ListeningScreen
      stepId="ordering"
      onExit={onExit}
      onFinish={onFinish}
      sessionOptions={initialSessionOptions}
    />,
  );
  view.rerender(
    <ListeningScreen
      stepId="ordering"
      onExit={onExit}
      onFinish={onFinish}
      sessionOptions={initialSessionOptions}
    />,
  );

  expect(screen.getByTestId("listening-screen-complete")).toBeInTheDocument(); // 앵커
  expect(announce).toHaveLength(1);
});

// X-D. **소리에만 있는 낱말이 0건입니다**(ADR-0016 D11-1·수용 기준 3). 발화 문자열을
// 리터럴로 다시 적지 않고 **DOM에서 파생해** 짓습니다 — 앞절은 종료 문구 요소의 내용,
// 뒷절은 그 순간 화면이 내미는 다음 걸음, 즉 아래 버튼의 `accessibility-label`입니다.
//
// 2026-09-27: 「유일한 조작 단위」가 아니게 됐습니다 — 껍데기가 상단 바와 나가기를
// 함께 세웁니다. 유일성 대신 **무대에는 조작 단위가 없다**는 것으로 좁힙니다: 완료
// 상태에서 사용자가 카드 안에서 할 일은 없고, 다음 걸음은 아래 버튼 하나입니다.
test("[X-D] 완료 발화가 종료 문구와 아래 버튼의 라벨에서 그대로 나온다", () => {
  const { announce } = stubHost();
  renderOrdering();

  completeAllThree();

  expect(stageTappables()).toEqual([]);

  const completeText = screen.getByTestId("listening-screen-complete").textContent ?? "";
  const actionLabel =
    screen.getByTestId("learning-shell-action").getAttribute("accessibility-label") ?? "";

  expect(announce).toHaveLength(1);
  expect(announce[0]?.content).toBe(`${completeText}, ${actionLabel}`);
});

test("대역 없이도 화면이 던지지 않고 재생 조작이 'Play'로 렌더된다", () => {
  expect(() => renderOrdering()).not.toThrow();

  const playback = screen.getByTestId("listening-prompt-playback");
  expect(playback).toHaveAttribute("accessibility-label", "Play");
  expect(playback).toHaveAttribute("accessibility-traits", "button");
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(
    ORDERING_QUESTIONS[0].prompt,
  );
});

// ---------------------------------------------------------------- 스크롤 영역
//
// `@lynx-js/testing-environment`이 `scroll-view`를 실제 요소로 만듭니다 —
// `getByTestId`로 잡히고 `within()`으로 안쪽을 질의할 수 있습니다. 여기서
// 판정하는 것은 "구조가 계약대로 짜였다"까지입니다 — 실제로 스크롤되는가·
// 넘치는가·막대가 뜨는가는 이 계층이 원리적으로 못 봅니다(jsdom엔 레이아웃이
// 없습니다).

test("[U1] learning-shell-stage이 존재한다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-stage")).toBeInTheDocument();
});

test("[U2] 대본은 무대 안, 문항 진행과 보기 넷은 무대 밖이다", () => {
  renderOrdering();

  const stage = screen.getByTestId("learning-shell-stage");
  expect(within(stage).getByTestId("listening-prompt-text")).toBeInTheDocument();
  // 문항 진행은 세션 헤더로 갔습니다 — 카드 높이를 줄여 화면 예산에 맞추기 위해서입니다.
  expect(within(stage).queryByTestId("learning-shell-chapter")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 3");

  const workspace = screen.getByTestId("learning-shell-scroll");
  for (const testid of CHOICE_TESTIDS) {
    expect(within(workspace).getByTestId(testid)).toBeInTheDocument();
    expect(within(stage).queryByTestId(testid)).not.toBeInTheDocument();
  }
});

// 아래 버튼이 무대 밖이라는 것은 완료 상태를 보는 [U6]이 집니다 — 문항 중에는 버튼
// 자체가 없으므로 여기서는 나가기와 넘김 층만 봅니다.
test("[U3] 나가기·넘김 층이 무대 밖에 있다", () => {
  renderOrdering();
  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  const stage = screen.getByTestId("learning-shell-stage");
  expect(within(stage).queryByTestId("learning-shell-exit")).not.toBeInTheDocument();
  expect(within(stage).queryByTestId("learning-shell-advance")).not.toBeInTheDocument();

  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
});

test("[U6] 완료 상태에서 완료 문구는 스크롤 안, 마치기는 스크롤 밖이다", () => {
  renderOrdering();
  completeAllThree();

  const scroll = screen.getByTestId("learning-shell-stage");
  expect(within(scroll).getByTestId("listening-screen-complete")).toBeInTheDocument();
  expect(within(scroll).queryByTestId("learning-shell-action")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-action")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재
//
// R6·R6.1의 「없음」을 지키는 회귀 그물입니다. 오늘의 구현은 이 넷을 하나도
// 붙이지 않습니다 — **red가 없는 것이 이 케이스의 성질입니다.** 다음 편집이 넷
// 중 하나라도 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가
// 아니라 계약으로 되돌아가라는 신호입니다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("learning-shell-stage");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 세로 동작
//
// R5 폐기 → R5.1~R5.3. `<scroll-view>`는 `scroll-orientation` prop이 없으면
// `_enableScrollY` 초기값이 NO라 세로 스크롤이 원리적으로 불가능합니다. U9·U11은
// 어트리뷰트 존재/값만 봅니다 — jsdom은 레이아웃이 없어 실제로 스크롤되는지는
// 이 계층이 원리적으로 못 봅니다(실기 S8·S9가 답합니다).
//
// U11의 기댓값이 문자열 "true"인 이유: `@lynx-js/testing-environment`의
// `__SetAttribute`(ElementPAPI.js:87~89)가 boolean을 `JSON.stringify`로
// 직렬화합니다. `scroll-orientation`은 문자열이라 그대로 "vertical"로 갑니다.

test("[U9] learning-shell-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

test("[U11] learning-shell-scroll에 scroll-bar-enable='true'가 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-scroll")).toHaveAttribute("scroll-bar-enable", "true");
});

// U10 — 듣기는 문항 상태와 완료 상태 둘 다 봅니다 — 문항 상태는 오늘 자식이
// 넷(-progress·프롬프트·-instruction·-choices)이라 red이고(R7.1), 완료 상태는
// 자식이 하나(-complete)라 green입니다.
test("[U10] 문항 상태에서 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-stage").children.length).toBeLessThanOrEqual(1);
});

test("[U10] 완료 상태에서 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  renderOrdering();
  completeAllThree();

  expect(screen.getByTestId("learning-shell-stage").children.length).toBeLessThanOrEqual(1);
});

// ---------------------------------------------------------------- 걸음의 정체 (2026-09-28)
//
// 껍데기는 **참조로** 걸음을 가릅니다 — 객체가 갈리면 타이머를 다시 걸고, 같은 객체는
// 두 번 밟지 않습니다. 그래서 걸음을 매 렌더마다 새로 만들면 관계없는 리렌더 하나가
// 기다림을 처음부터 되돌리는데, **화면에는 아무 표시도 남지 않습니다.** 눈으로는 「가끔
// 늦게 넘어간다」로만 보입니다.
//
// 그 자리를 여기서 답니다: 2.4초를 기다린 뒤 리렌더를 한 번 끼우고, 남은 0.1초가 지나면
// 넘어가야 합니다. 걸음이 리렌더마다 새로 만들어지면 여기서 타이머가 0으로 돌아가
// 문항이 그대로 남습니다.
test("관계없는 리렌더가 끼어도 기다림이 처음으로 되돌아가지 않는다", () => {
  vi.useFakeTimers();
  const view = renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  act(() => {
    vi.advanceTimersByTime(2400);
  });
  view.rerender(
    <ListeningScreen
      stepId="ordering"
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
    />,
  );
  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 3");

  act(() => {
    vi.advanceTimersByTime(100);
  });

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 3");

  vi.useRealTimers();
});

// ---------------------------------------------------------------- 영어 렌더 · 문구표 (LA1)

test("[LA1-E] 지시문이 영어이고 보기는 영어 뜻 풀이, 제시문은 한국어 그대로다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "Choose what the sentence means.",
  );
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(
    ORDERING_QUESTIONS[0].prompt,
  );
  expect(screen.getByTestId("listening-choice-0")).toHaveTextContent("Ordering two iced coffees");
  expect(screen.getByTestId("listening-choice-2")).toHaveTextContent("Ordering one hot coffee");
});

test("[LA1-E] 응답 뒤 정답 보기의 이름이 ', correct'로 끝나고 배지의 이름이 Correct다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId("listening-choice-2"), {});

  expect(screen.getByTestId("listening-choice-2")).toHaveAttribute(
    "accessibility-label",
    "Ordering one hot coffee, correct",
  );
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("accessibility-label", "Correct");
});

function renderOrderingMarked(): ReturnType<typeof render> {
  return render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <ListeningScreen
        stepId="ordering"
        onExit={() => {}}
        onFinish={() => {}}
        sessionOptions={initialSessionOptions}
      />
    </UiCopyContext.Provider>,
  );
}

test("[LA1-M] 문구표를 주입하면 지시문 · 재생 조작 · 나가기가 표의 경로로 나온다", () => {
  renderOrderingMarked();

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "⟦listening.instruction⟧",
  );
  expect(screen.getByTestId("listening-prompt-replay")).toHaveAttribute(
    "accessibility-label",
    "⟦listening.playFromStart⟧",
  );
  expect(screen.getByTestId("listening-prompt-playback")).toHaveAttribute(
    "accessibility-label",
    "⟦listening.playback.play⟧",
  );
  expect(screen.getByTestId("learning-shell-exit")).toHaveAttribute(
    "accessibility-label",
    "⟦learningShell.exitLesson⟧",
  );
});

test("[LA1-M] 문구표를 주입하고 응답하면 판정 배지 · 보기 접미 · 넘김 층이 표의 경로로 나온다", () => {
  renderOrderingMarked();

  fireEvent.tap(screen.getByTestId("listening-choice-2"), {});

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute(
    "accessibility-label",
    "⟦common.answerResult.correct⟧",
  );
  expect(screen.getByTestId("listening-choice-2")).toHaveAttribute(
    "accessibility-label",
    "Ordering one hot coffee, ⟦common.answerResultSuffix.correct⟧",
  );
  expect(screen.getByTestId("learning-shell-advance")).toHaveAttribute(
    "accessibility-label",
    "⟦common.continue⟧",
  );
});

test("[LA1-M] 문구표를 주입하고 문항을 마치면 완료 문구 · 마치기 · 낭독이 표의 경로로 나온다", () => {
  const { announce, completion } = stubCompletionHost();
  renderOrderingMarked();

  completeAllThree();

  expect(screen.getByTestId("listening-screen-complete")).toHaveTextContent(
    "⟦common.allQuestionsDone⟧",
  );
  const finish = screen.getByTestId("learning-shell-action");
  expect(finish).toHaveAttribute("accessibility-label", "⟦common.seeResults⟧");
  expect(finish).toHaveTextContent("⟦common.seeResults⟧");
  expect(completion).toHaveLength(1);
  expect(completion[0]?.content).toBe("⟦common.allQuestionsDone⟧, ⟦common.seeResults⟧");
  expect(announce).toHaveLength(0);
});
