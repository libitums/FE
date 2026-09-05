import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { ListeningScreen } from "./ListeningScreen";
import type { JourneyStepId } from "../journey-map/journey-map";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 본다 (ADR-0006 D4).
// 순수 함수(listening.ts)를 mock하지 않는다 — 화면이 그것을 실제로 부르는지가
// 이 파일이 보는 것의 절반이다. `toHaveClass` · `toHaveStyle` · `toBeVisible`을
// 쓰지 않는다 (docs/conventions/code.md).
//
// 계약: .agent-harness/work/lib-223/spec.md §3.2(c) 단언 1~15 · §9.9(d) (추가분) ·
//       §9.10(a) (뒤집히는 넷).
//
// 기대값의 정본은 계약 §1.4의 고정 데이터다 — 아래 상수는 그것을 옮긴 것이지
// 지어낸 것이 아니다. `ordering`은 서수 3이고 문항 셋의 정답 인덱스가 서로 다르다
// (§1.4의 불변식 — "첫 보기를 계속 고르면 전부 맞는" 경로가 없다).

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
    // (계약 §1.6(c), u7 보정) onFinish가 인자 둘을 받는다 — id와 응답 순서·길이대로의
    // 판정 결과 배열이다. 통과 여부는 듣기가 계산하지 않는다. **둘째 인자를 optional로
    // 적는다** — 현재 소스(`ListeningScreen.tsx`)는 아직 u2의 1-인자 시그니처이고 이
    // 화면 컴포넌트는 이 라운드가 고치지 않는다(구현은 다음 단위). optional이 아니면
    // `onFinish={overrides.onFinish}`가 1-인자 prop 타입에 대입되지 않아 `typecheck`가
    // red보다 먼저 죽는다 — 그것은 이 라운드가 원하는 red가 아니다.
    onFinish?: (id: JourneyStepId, results?: readonly AnswerResult[]) => void;
  } = {},
) {
  return render(
    <ListeningScreen
      stepId="ordering"
      stepOrdinal={3}
      onExit={overrides.onExit ?? (() => {})}
      onFinish={overrides.onFinish ?? (() => {})}
    />,
  );
}

// 문항 하나를 정답으로 응답하고 다음으로 넘긴다. 임의의 대기를 두지 않는다 —
// tap이 리듀서 전이를 동기적으로 일으키고 렌더가 끝난다 (JourneyMapScreen 선례).
function answerCorrectlyAndAdvance(questionIndex: number): void {
  fireEvent.tap(
    screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[questionIndex].answerIndex}`),
    {},
  );
  fireEvent.tap(screen.getByTestId("listening-screen-next"), {});
}

function completeAllThree(): void {
  answerCorrectlyAndAdvance(0);
  answerCorrectlyAndAdvance(1);
  answerCorrectlyAndAdvance(2);
}

// ------------------------------------------------------------ 오디오 대역 (계약 §9.9(a))
//
// 형태의 정본은 `src/lib/audio.unit.test.ts`의 `stubHost()`다. **`lib/audio.ts`를
// mock하지 않는다** — 화면이 실제 접점을 지나 호스트 경계까지 닿는지가 이 파일이 보는
// 것의 절반이다. 대역을 두는 자리는 호스트 경계 하나다.
//
// **아래 대부분의 테스트는 대역을 세우지 않는다.** 그것이 회귀 단언이다 — 전역
// `NativeModules`가 아예 없는 환경에서도 화면이 던지지 않고 렌더된다 (계약 §9.3-2).

const STOP = "<stop>";

type HostCall = { source: string; done: (result: unknown) => void };

function stubHost(): HostCall[] {
  const calls: HostCall[] = [];
  const mod = {
    play: (source: string, done: (result: unknown) => void) => void calls.push({ source, done }),
    stop: () => void calls.push({ source: STOP, done: () => {} }),
  };
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: mod });
  return calls;
}

const sourcesOf = (calls: readonly HostCall[]): string[] => calls.map((call) => call.source);

const stopCount = (calls: readonly HostCall[]): number =>
  calls.filter((call) => call.source === STOP).length;

// 없던 전역을 세우므로 테스트마다 원상복구한다 — 지우지 않으면 다른 파일로 샌다.
afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- 처음 렌더 (단언 1~4)

// 단언 1: 제목이 listeningScreenTitle(stepOrdinal)의 합성 결과이고 heading이다.
test("제목이 '3단계 · 듣기'이고 accessibility-traits='header'다", () => {
  renderOrdering();

  const title = screen.getByTestId("listening-screen-title");
  expect(title).toHaveTextContent("3단계 · 듣기");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

// 단언 2: 진행 문구가 questionProgressLabel(0, 3)의 합성 결과다 (1-based로 보인다).
test("진행 문구가 '문항 1 / 3'이다", () => {
  renderOrdering();

  expect(screen.getByTestId("listening-screen-progress")).toHaveTextContent("문항 1 / 3");
});

// 단언 3: 제시 채널에 첫 문항이 나오고 보기가 **네 개** 렌더된다 (수용 기준 4).
test("첫 문항이 제시되고 보기가 네 개 렌더된다", () => {
  renderOrdering();

  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(
    ORDERING_QUESTIONS[0].prompt,
  );
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  }
});

// 단언 4 — **수용 기준 3의 `ui` 쪽 판정.** 어느 스텝에서 왔는지가 화면에 드러난다:
// 제목도 문항도 스텝마다 갈린다. 한 스텝의 데이터가 박혀 있으면 여기서 잡힌다.
test("다른 스텝으로 렌더하면 제목과 문항이 둘 다 갈린다", () => {
  const ordering = render(
    <ListeningScreen stepId="ordering" stepOrdinal={3} onExit={() => {}} onFinish={() => {}} />,
  );
  const orderingTitle = screen.getByTestId("listening-screen-title").textContent;
  const orderingPrompt = screen.getByTestId("listening-prompt-text").textContent;
  ordering.unmount();

  render(
    <ListeningScreen stepId="greeting" stepOrdinal={1} onExit={() => {}} onFinish={() => {}} />,
  );

  const greetingTitle = screen.getByTestId("listening-screen-title");
  const greetingPrompt = screen.getByTestId("listening-prompt-text");
  expect(greetingTitle).toHaveTextContent("1단계 · 듣기");
  expect(greetingPrompt).toHaveTextContent("안녕하세요, 처음 뵙겠습니다.");
  expect(greetingTitle.textContent).not.toBe(orderingTitle);
  expect(greetingPrompt.textContent).not.toBe(orderingPrompt);
});

// ---------------------------------------------------------------- 응답 전 (단언 5·6)

// 단언 5: 나가는 수단이 정확히 하나다 — 미완료에서는 `맵으로`뿐이고,
// `다음`은 응답 전에 없다(응답 여부의 프로브) · `맵으로 돌아가기`도 없다.
test("응답 전에는 나가기만 있고 다음·마치기가 없다", () => {
  renderOrdering();

  expect(screen.getByTestId("listening-screen-exit")).toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-next")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-finish")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-complete")).not.toBeInTheDocument();
});

// 단언 6: 응답 전 네 보기가 전부 data-result="none"이다. 정답 보기도 예외가 아니다.
test("응답 전 네 보기가 전부 data-result='none'이다", () => {
  renderOrdering();

  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toHaveAttribute("data-result", "none");
  }
});

// 같은 사실의 보조기술 채널 — 응답 전에는 어느 보기에도 접미사가 없다.
// 네 보기가 전부 ", 정답 아님" 류로 읽히면 **답을 미리 알려 주는 것**이 된다
// (계약 §1.5(b)).
test("응답 전 네 보기의 accessibility-label에 접미사가 없다 — 답을 미리 알려 주지 않는다", () => {
  renderOrdering();

  for (const testid of CHOICE_TESTIDS) {
    const label = screen.getByTestId(testid).getAttribute("accessibility-label");
    expect(label).not.toContain(", 정답");
    expect(label).not.toContain(", 오답");
  }
});

// ---------------------------------------------------------------- 판정 (단언 7~9)

// 단언 7: 정답 보기를 탭하면 그 보기만 판정을 지고 `다음`이 나타난다.
// 세 관찰 채널을 아래 세 테스트로 나눠 본다 (계약 §1.8 — 채널이 서로 다른 것을 본다).
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

test("정답 보기를 탭하면 그 보기의 accessibility-label에 ', 정답'이 붙는다", () => {
  renderOrdering();

  const answered = screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`);
  const before = answered.getAttribute("accessibility-label");

  fireEvent.tap(answered, {});

  expect(
    screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`),
  ).toHaveAttribute("accessibility-label", `${before}, 정답`);
});

test("정답 보기를 탭하면 그 보기에 표식 아이콘이 나타난다", () => {
  renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0].answerIndex;
  expect(screen.queryByTestId(`listening-choice-icon-${answerIndex}`)).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId(`listening-choice-${answerIndex}`), {});

  expect(screen.getByTestId(`listening-choice-icon-${answerIndex}`)).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
});

test("정답 보기를 탭하면 '다음'이 나타난다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  expect(screen.getByTestId("listening-screen-next")).toBeInTheDocument();
});

// 단언 8 — **정답을 알려 주지 않는다** (계약 §1.1). 오답을 골라도 정답 보기는
// 판정을 지지 않는다. 두 채널로 함께 본다: 고르지 않은 정답 보기는 data-result가
// "none"이고 라벨에도 접미사가 없다.
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
  expect(answerLabel).not.toContain(", 정답");
  expect(screen.getByTestId(`listening-choice-${wrongIndex}`)).toHaveTextContent("오답");
});

// 단언 9: 응답은 문항당 한 번뿐이다. **게이트가 리듀서라는 것의 `ui` 쪽 관찰** —
// 보기 컴포넌트는 tap을 그대로 올리는데(ListeningChoice 단언 10) 화면의 판정이
// 움직이지 않는다.
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

// **0은 falsy다.** `greeting`의 첫 문항은 정답 인덱스가 0이라, 0번 보기를 고른 것이
// 응답으로 기록되지 않으면 여기서만 잡힌다 — 판정도 안 나오고 `다음`도 안 뜬다.
test("0번 보기를 골라도 응답으로 기록된다 — 0은 falsy다", () => {
  render(
    <ListeningScreen stepId="greeting" stepOrdinal={1} onExit={() => {}} onFinish={() => {}} />,
  );

  fireEvent.tap(screen.getByTestId("listening-choice-0"), {});

  expect(screen.getByTestId("listening-choice-0")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId("listening-screen-next")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 문항 진행 (단언 10)

// 단언 10: `다음`이 문항을 넘기고 선택을 비운다.
test("'다음'을 탭하면 진행·문항이 갈리고 판정이 초기화되며 '다음'이 다시 사라진다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("listening-screen-next"), {});

  expect(screen.getByTestId("listening-screen-progress")).toHaveTextContent("문항 2 / 3");
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(
    ORDERING_QUESTIONS[1].prompt,
  );
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.getByTestId(testid)).toHaveAttribute("data-result", "none");
  }
  expect(screen.queryByTestId("listening-screen-next")).not.toBeInTheDocument();
});

// 두 번째 문항의 정답 인덱스가 0이다 — 문항이 넘어간 뒤에도 0번 보기가 살아 있다.
test("두 번째 문항에서도 0번 보기가 응답으로 기록된다", () => {
  renderOrdering();

  answerCorrectlyAndAdvance(0);
  fireEvent.tap(screen.getByTestId("listening-choice-0"), {});

  expect(screen.getByTestId("listening-choice-0")).toHaveAttribute("data-result", "correct");
});

// ---------------------------------------------------------------- 완료 (단언 11·12)

// 단언 11 — **수용 기준 7.** 문항 셋을 마치면 완료 상태로 넘어가고, 완료 상태에서만
// 맵 복귀 수단이 나타난다. 나가는 수단이 어느 시점에도 정확히 하나이므로 `맵으로`는
// 사라진다 — 둘 다 두면 같은 목적지에 가는데 진행이 갈리는 버튼 둘이 앉는다.
test("문항 셋을 마치면 완료 문구와 마치기가 나타난다", () => {
  renderOrdering();

  completeAllThree();

  expect(screen.getByTestId("listening-screen-complete")).toHaveTextContent("문항을 모두 마쳤어요");
  expect(screen.getByTestId("listening-screen-finish")).toBeInTheDocument();
});

test("완료 상태에서 나가기·진행·문항·보기가 전부 사라진다", () => {
  renderOrdering();

  completeAllThree();

  expect(screen.queryByTestId("listening-screen-exit")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-progress")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-prompt-text")).not.toBeInTheDocument();
  for (const testid of CHOICE_TESTIDS) {
    expect(screen.queryByTestId(testid)).not.toBeInTheDocument();
  }
});

// 마지막 문항을 응답한 것만으로는 완료가 아니다 — `다음`을 한 번 더 눌러야 넘어간다.
// (questionIndex === 문항 수가 완료이고, 응답은 인덱스를 올리지 않는다.)
test("마지막 문항에 응답만 해서는 완료가 아니다", () => {
  renderOrdering();

  answerCorrectlyAndAdvance(0);
  answerCorrectlyAndAdvance(1);
  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[2].answerIndex}`), {});

  expect(screen.getByTestId("listening-screen-progress")).toHaveTextContent("문항 3 / 3");
  expect(screen.queryByTestId("listening-screen-finish")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-exit")).toBeInTheDocument();
});

// 단언 12: 마치기를 탭하면 onFinish가 그 스텝 id와 응답 결과 배열로 정확히 한 번
// 불린다 — 진행 갱신의 주체는 App이고, 통과 여부는 평가가 판정한다(계약 §1.6(c),
// u7 보정). 화면은 「끝났다」와 「무엇이 일어났는지」만 되돌려 준다.
test("마치기를 탭하면 onFinish가 stepId와 응답 결과 배열로 정확히 한 번 불린다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results?: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  completeAllThree();
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["correct", "correct", "correct"]);
});

// 오답으로 전부 응답해도 완료된다 — 이 슬라이스에 재시도 규칙이 없다. 결과 배열도
// 전부 incorrect로 응답 순서·길이대로 온다(계약 §1.6(a)·(b)).
test("전부 오답이어도 완료 상태로 넘어가고 onFinish가 결과 배열과 함께 불린다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results?: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  for (const question of ORDERING_QUESTIONS) {
    fireEvent.tap(screen.getByTestId(`listening-choice-${(question.answerIndex + 1) % 4}`), {});
    fireEvent.tap(screen.getByTestId("listening-screen-next"), {});
  }
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["incorrect", "incorrect", "incorrect"]);
});

// ---------------------------------------------------------------- 중도 이탈 (단언 13)

// 단언 13 — **수용 기준 10의 `ui` 쪽 판정.** `맵으로`는 진행을 갱신하지 않는다.
// onExit과 onFinish가 다른 콜백인 이유가 이 단언이다.
test("응답 전 나가기를 탭하면 onExit이 한 번, onFinish는 한 번도 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId) => void>();
  renderOrdering({ onExit, onFinish });

  fireEvent.tap(screen.getByTestId("listening-screen-exit"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

test("문항 하나를 응답한 뒤 나가기를 탭해도 onFinish가 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId) => void>();
  renderOrdering({ onExit, onFinish });

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("listening-screen-exit"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------- 접근성 (단언 14)

// 단언 14: 조작 단위 셋에 각각 label + traits + element가 붙는다 (수용 기준 12의
// "붙었는가" 절반. 실제 낭독은 실기가 판정한다 — ADR-0016 D6).
// 두 출구의 라벨이 **다른 문자열**이라는 것도 함께 본다 — 음성 제어에서 갈린다.
test("나가기에 element·label='맵으로'·traits='button'이 붙는다", () => {
  renderOrdering();

  const exit = screen.getByTestId("listening-screen-exit");
  expect(exit).toHaveAttribute("accessibility-element", "true");
  expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
});

test("다음에 element·label='다음'·traits='button'이 붙는다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  const next = screen.getByTestId("listening-screen-next");
  expect(next).toHaveAttribute("accessibility-element", "true");
  expect(next).toHaveAttribute("accessibility-label", "다음");
  expect(next).toHaveAttribute("accessibility-traits", "button");
});

// (계약 §1.6(c), u7 보정) 완료 버튼의 문구가 '맵으로 돌아가기' → '결과 보기'로 바뀐다 —
// testid·클래스·DOM 자리·accessibility-traits는 그대로이고 보이는 문구와
// accessibility-label 두 문자열만 바뀐다. 목적지가 맵이 아니라 평가 화면으로
// 바뀌었기 때문이다(§1.8). 통과든 미통과든 이 문구는 참이다 — 판정에 따라 가르지
// 않는다.
test("마치기에 element·label='결과 보기'·traits='button'이 붙는다", () => {
  renderOrdering();

  completeAllThree();

  const finish = screen.getByTestId("listening-screen-finish");
  expect(finish).toHaveAttribute("accessibility-element", "true");
  expect(finish).toHaveAttribute("accessibility-label", "결과 보기");
  expect(finish).toHaveAttribute("accessibility-traits", "button");
  expect(finish).toHaveTextContent("결과 보기");
});

// ADR-0016 D3 `정정 기록`: 상태는 라벨 접미사이고 accessibility-value를 쓰지 않는다.
test("화면 어느 요소에도 accessibility-value가 없다", () => {
  const { container } = renderOrdering();

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
});

// 버튼 안의 라벨 <text>는 장식이다 — 조작 단위가 되면 정지 노드가 둘로 갈리고
// 이름이 두 번 읽힌다 (ADR-0016 D5).
test("나가기·마치기 안의 라벨 텍스트가 조작 단위가 되지 않는다", () => {
  renderOrdering();

  expect(
    screen.getByTestId("listening-screen-exit").querySelectorAll("[accessibility-element]"),
  ).toHaveLength(0);

  completeAllThree();

  expect(
    screen.getByTestId("listening-screen-finish").querySelectorAll("[accessibility-element]"),
  ).toHaveLength(0);
});

// ---------------------------------------------------------------- 조작 단위 목록 (단언 15)

// 단언 15 — 화면의 조작 단위를 **순서까지** 세는 자리다. `bindtap`은 이 환경에서 DOM
// 속성으로 직렬화되지 않으므로(확인함) 탭 대상은 조작 단위의 관찰 채널인
// accessibility-traits="button"으로 센다.
//
// **재생 조작이 여기 끼면서 목록이 뒤집혔다** (계약 §9.10(a)). 자리는 나가기와 보기
// **사이**다 — DOM 순서 = 낭독 순서이므로 목록의 순서가 곧 접근성 계약이고, 사용자가
// 보기를 만나기 **전에** 다시 들을 수단을 만난다 (계약 §9.5(d)).
//
// 수용 기준 5는 이제 「오디오 코드 0줄」이 아니라 「`<audio>`·`<video>`·`new Audio`·
// `AudioContext`를 쓰지 않는다」로 좁아졌다 (계약 §9.10(c)) — 이번에 연 것은 네이티브
// 모듈 경로 하나이고 DOM 요소도 웹 오디오도 아니다.
test("응답 전 조작 단위가 나가기 + 재생 조작 + 보기 넷이다 — 재생 조작이 보기보다 앞이다", () => {
  const { container } = renderOrdering();

  const tappables = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(tappables).toEqual([
    "listening-screen-exit",
    "listening-prompt-playback",
    "listening-choice-0",
    "listening-choice-1",
    "listening-choice-2",
    "listening-choice-3",
  ]);
});

test("응답 뒤 조작 단위가 나가기 + 재생 조작 + 보기 넷 + 다음이다", () => {
  const { container } = renderOrdering();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  const tappables = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(tappables).toEqual([
    "listening-screen-exit",
    "listening-prompt-playback",
    "listening-choice-0",
    "listening-choice-1",
    "listening-choice-2",
    "listening-choice-3",
    "listening-screen-next",
  ]);
});

test("완료 상태의 조작 단위가 마치기 하나뿐이다", () => {
  const { container } = renderOrdering();

  completeAllThree();

  const tappables = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(tappables).toEqual(["listening-screen-finish"]);
});

// 아이콘 개수도 뒤집혔다 (계약 §9.10(a)). 응답 전에 하나 있고 그것이 **재생
// 아이콘**이며, 응답 뒤에 생기는 둘째가 고른 보기의 표식이다. 순서까지 센다 —
// 재생 아이콘이 보기의 표식보다 앞이다.
test("응답 전 트리의 <svg>가 재생 아이콘 하나다", () => {
  const { container } = renderOrdering();

  // 앵커: 개수 단언만 두면 화면이 반쯤 그려져도 통과한다. 문항과 보기가 실제로
  // 그려진 트리에서 아이콘이 하나라는 것이 이 단언의 내용이다.
  expect(screen.getByTestId("listening-prompt-text")).toBeInTheDocument();
  expect(screen.getByTestId("listening-choice-0")).toBeInTheDocument();

  const icons = [...container.querySelectorAll("svg")].map((el) => el.getAttribute("data-testid"));
  expect(icons).toEqual(["listening-prompt-playback-icon"]);
});

test("응답 뒤 <svg>가 재생 아이콘 + 고른 보기의 표식 둘이다", () => {
  const { container } = renderOrdering();

  const answerIndex = ORDERING_QUESTIONS[0].answerIndex;
  fireEvent.tap(screen.getByTestId(`listening-choice-${answerIndex}`), {});

  const icons = [...container.querySelectorAll("svg")].map((el) => el.getAttribute("data-testid"));
  expect(icons).toEqual(["listening-prompt-playback-icon", `listening-choice-icon-${answerIndex}`]);
});

test("완료 상태에도 <svg>가 하나도 없다", () => {
  const { container } = renderOrdering();

  completeAllThree();

  expect(container.querySelectorAll("svg")).toHaveLength(0);
});

// ---------------------------------------------------------------- 오디오 (계약 §9.9(d))
//
// 여기부터가 이 라운드에 더해진 둘 + 언마운트 하나다. **`lib/audio.ts`를 mock하지
// 않고 호스트 경계에 대역을 둔다** — 화면이 현재 문항의 옳은 `audioSource`를 실제로
// 아래로 흘리는지가 이 절이 보는 것이다 (계약 §9.7의 첫 행).

// 추가 1 — **「현재 문항의 옳은 `source`」의 `ui` 쪽 판정.** 값의 정본은 계약 §9.4의
// 고정 데이터다. 문항이 넘어갈 때 **이전 것이 먼저 멈춘다**는 순서까지 본다
// (계약 §9.6-2). 화면이 `question.prompt`만 내리고 `audioSource`를 안 내리면
// 여기서만 잡힌다.
test("현재 문항의 audioSource로 play가 불리고, 다음 문항에서 stop 뒤 새 source로 불린다", () => {
  const calls = stubHost();
  renderOrdering();

  expect(sourcesOf(calls)).toEqual(["ordering-1"]);

  answerCorrectlyAndAdvance(0);

  expect(sourcesOf(calls)).toEqual(["ordering-1", STOP, "ordering-2"]);
});

// 다른 스텝으로 렌더하면 source도 갈린다 — 한 스텝의 값이 박혀 있으면 여기서 잡힌다
// (단언 4의 오디오 축 짝).
test("다른 스텝으로 렌더하면 play의 source가 그 스텝의 첫 문항 것이다", () => {
  const calls = stubHost();

  render(
    <ListeningScreen stepId="greeting" stepOrdinal={1} onExit={() => {}} onFinish={() => {}} />,
  );

  expect(sourcesOf(calls)).toEqual(["greeting-1"]);
});

// 추가 2 — 계약 §9.6-6. 문항을 다 마치면 `ListeningPrompt`가 언마운트되고 cleanup이
// `stop`을 부른다. **완료 화면에서 소리가 계속 나면 안 된다.**
test("문항 셋을 마쳐 완료가 되면 stop이 불리고 재생 조작이 트리에서 사라진다", () => {
  const calls = stubHost();
  renderOrdering();

  completeAllThree();

  expect(sourcesOf(calls)).toEqual(["ordering-1", STOP, "ordering-2", STOP, "ordering-3", STOP]);
  expect(screen.getByTestId("listening-screen-finish")).toBeInTheDocument(); // 앵커
  expect(screen.queryByTestId("listening-prompt-playback")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-prompt-playback-icon")).not.toBeInTheDocument();
});

// 계약 §9.6-7·8의 `ui` 쪽 절반. `맵으로`·`맵으로 돌아가기`·탭 전환은 **화면을
// 언마운트하는 것**이고, 셋을 각각 손으로 잇지 않는 근거가 cleanup 하나다. 실제로
// 언마운트를 일으키는 것은 `App`이므로 그 경로는 `integration`이 본다 (계약 §9.7).
test("화면을 언마운트하면 stop이 불린다 — 출구 둘과 탭 전환이 지나는 자리다", () => {
  const calls = stubHost();
  const { unmount } = renderOrdering();
  expect(stopCount(calls)).toBe(0);

  unmount();

  expect(sourcesOf(calls)).toEqual(["ordering-1", STOP]);
});

// 대역이 없어도 화면이 던지지 않는다 — 위의 스무 남짓한 테스트가 전부 대역 없이
// 도는 것이 이미 회귀 단언이지만, **그 사실을 이름으로 한 번 못박는다** (계약 §9.3-2).
// `NativeModules` 전역이 아예 없는 환경에서 맨 식별자 접근이면 여기서 ReferenceError다.
test("대역 없이도 화면이 던지지 않고 재생 조작이 '듣기'로 렌더된다", () => {
  expect(() => renderOrdering()).not.toThrow();

  const playback = screen.getByTestId("listening-prompt-playback");
  expect(playback).toHaveAttribute("accessibility-label", "듣기");
  expect(playback).toHaveAttribute("accessibility-traits", "button");
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(
    ORDERING_QUESTIONS[0].prompt,
  );
});

// ---------------------------------------------------------------- 스크롤 영역 (LIB-226 계약 §3.2 U1·U2·U3·U6)
//
// `@lynx-js/testing-environment`이 `scroll-view`를 실제 요소로 만든다(계약 §3.2
// 도입부) — `getByTestId`로 잡히고 `within()`으로 안쪽을 질의할 수 있다. 여기서
// 판정하는 것은 "구조가 계약대로 짜였다"까지다 — 실제로 스크롤되는가·넘치는가·
// 막대가 뜨는가는 이 계층이 원리적으로 못 본다(jsdom엔 레이아웃이 없다, §3.2 말미).

// U1: 스크롤 컨테이너가 존재한다.
test("[U1] listening-screen-scroll이 존재한다", () => {
  renderOrdering();

  expect(screen.getByTestId("listening-screen-scroll")).toBeInTheDocument();
});

// U2: 흐름 자식(진행·대본·보기 넷)이 스크롤 컨테이너 **안**에 있다.
test("[U2] 진행·대본·보기 넷이 스크롤 컨테이너 안에 있다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("listening-screen-scroll");
  expect(within(scroll).getByTestId("listening-screen-progress")).toBeInTheDocument();
  expect(within(scroll).getByTestId("listening-prompt-text")).toBeInTheDocument();
  for (const testid of CHOICE_TESTIDS) {
    expect(within(scroll).getByTestId(testid)).toBeInTheDocument();
  }
});

// U3: 고정 자식(제목·나가기·다음)이 스크롤 컨테이너 **밖**에 있다 — 화면 전체에서는
// 여전히 찾을 수 있는데 스크롤 컨테이너 안에서는 찾을 수 없다.
test("[U3] 제목·나가기·다음이 스크롤 컨테이너 밖에 있다", () => {
  renderOrdering();
  fireEvent.tap(screen.getByTestId(`listening-choice-${ORDERING_QUESTIONS[0].answerIndex}`), {});

  const scroll = screen.getByTestId("listening-screen-scroll");
  expect(within(scroll).queryByTestId("listening-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("listening-screen-exit")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("listening-screen-next")).not.toBeInTheDocument();

  expect(screen.getByTestId("listening-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-exit")).toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-next")).toBeInTheDocument();
});

// U6: 완료 상태에서 `-complete`는 스크롤 안, `-finish`는 스크롤 밖.
test("[U6] 완료 상태에서 완료 문구는 스크롤 안, 마치기는 스크롤 밖이다", () => {
  renderOrdering();
  completeAllThree();

  const scroll = screen.getByTestId("listening-screen-scroll");
  expect(within(scroll).getByTestId("listening-screen-complete")).toBeInTheDocument();
  expect(within(scroll).queryByTestId("listening-screen-finish")).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-screen-finish")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재 (LIB-226 계약 §3.2.1 U8)
//
// R6·R6.1의 「없음」을 지키는 회귀 그물이다(계약 §2.3 · §3.2.1). 오늘의 구현은 이
// 넷을 하나도 붙이지 않는다 — **red가 없는 것이 이 케이스의 성질이다.** 다음 편집이
// 넷 중 하나라도 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가
// 아니라 계약(§8.3)으로 되돌아가라는 신호다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("listening-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 세로 동작 (LIB-226 계약 §3.2.2 U9·U10·U11, r4)
//
// R5 폐기 → R5.1~R5.3. `<scroll-view>`는 `scroll-orientation` prop이 없으면
// `_enableScrollY` 초기값이 NO라 세로 스크롤이 원리적으로 불가능하다(design §8.2).
// U9·U11은 어트리뷰트 존재/값만 본다 — jsdom은 레이아웃이 없어 실제로 스크롤되는지는
// 이 계층이 원리적으로 못 본다(§3.2.2 말미, 실기 S8·S9가 답한다).
//
// U11의 기댓값이 문자열 "true"인 이유: `@lynx-js/testing-environment`의
// `__SetAttribute`(ElementPAPI.js:87~89)가 boolean을 `JSON.stringify`로 직렬화한다.
// `scroll-orientation`은 문자열이라 그대로 "vertical"로 간다.

// U9: scroll-orientation이 "vertical"로 붙어 있다.
test("[U9] listening-screen-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("listening-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

// U11: scroll-bar-enable이 (JSON.stringify를 거친) 문자열 "true"로 붙어 있다.
test("[U11] listening-screen-scroll에 scroll-bar-enable='true'가 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("listening-screen-scroll")).toHaveAttribute(
    "scroll-bar-enable",
    "true",
  );
});

// U10: 스크롤 컨테이너의 직계 요소 자식이 하나를 넘지 않는다. 듣기는 문항 상태와
// 완료 상태 둘 다 본다 — 문항 상태는 오늘 자식이 넷(-progress·프롬프트·-instruction·
// -choices)이라 red이고(R7.1), 완료 상태는 자식이 하나(-complete)라 green이다.
test("[U10] 문항 상태에서 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  renderOrdering();

  expect(screen.getByTestId("listening-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

test("[U10] 완료 상태에서 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  renderOrdering();
  completeAllThree();

  expect(screen.getByTestId("listening-screen-scroll").children.length).toBeLessThanOrEqual(1);
});
