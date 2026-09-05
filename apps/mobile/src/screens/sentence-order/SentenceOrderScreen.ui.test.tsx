import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { SentenceOrderScreen } from "./SentenceOrderScreen";
import type { SentenceOrderQuestion } from "./sentence-order";
import type { JourneyStepId } from "../journey-map/journey-map";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 본다(ADR-0006 D4). 순수 함수
// (sentence-order.ts)를 mock하지 않는다 — 화면이 그것을 실제로 부르는지가 이 파일이
// 보는 것의 절반이다. `toHaveClass` · `toHaveStyle` · `toBeVisible`을 쓰지 않는다
// (docs/conventions/code.md).
//
// 계약: .agent-harness/work/lib-229/spec.md §3.2 표 「SentenceOrderScreen」 · 스크롤
// 규약 단언 A1~A7.
//
// **문항 값을 지어내지 않는다는 것과 문항 데이터가 아예 없다는 것은 다르다.**
// `sentenceOrderQuestionsByStep`은 계약(§8.2 보류 1·2)에 따라 다섯 스텝 전부 빈
// 배열이다 — 이 컴포넌트는 `questions`를 prop으로 받지 않고(§1.8(b)) 내부에서
// `sentenceOrderQuestionsForStep(stepId)`로 그 Record를 읽으므로, 이 파일이 소비할
// 수 있는 문항은 이 Record에 값이 있을 때뿐이다. `sentence-order.ts` 파일 자체는
// 고치지 않는다(읽기 전용).
//
// **픽스처 주입은 `vi.mock(경로, importOriginal)`로 조회 함수 하나만 부분 대역한다**
// (형태의 정본: `word-choice/WordChoiceScreen.ui.test.tsx`). 이전에는
// `beforeEach`/`afterEach`로 `sentenceOrderQuestionsByStep` Record의 `ordering`
// 슬롯을 런타임에 대입했다 — 그 방식을 걷어낸 이유 둘:
//   1. 런타임 변형은 `readonly` 선언을 뚫는다 — 타입이 막는 것을 테스트가
//      우회하는 것이었다.
//   2. 모듈 전역을 변형하고 `afterEach` 정리에 의존한다 — 케이스가 실패로
//      빠지면 원복이 스킵되어 다음 케이스로 상태가 샌다.
// `sentenceOrderQuestionsForStep`은 Record 조회 한 줄이고 지울 가드가 없다 — 이
// 대역이 `App.integration.test.tsx:584`의 반대 결정(`lib/audio.ts`를 `vi.mock`하지
// 않는다)과 충돌하지 않는다. 그 결정이 막는 것은 「가드를 가진 모듈을 통째로
// 대역해 그 가드(세대로 늦게 온 완료를 버리고 모듈 부재를 흡수하는 것)를
// 지우는 것」이지 `vi.mock` 자체가 아니다. 나머지 export(세션 리듀서·판정·
// 문구 합성 등)는 `importOriginal`로 그대로 통과시킨다 — `sentence-order.ts`가
// 실제로 불리는지가 이 파일이 보는 것의 절반이라는 원칙은 바뀌지 않는다.

const ORDERING_QUESTIONS: readonly SentenceOrderQuestion[] = [
  {
    prompt: "다음 문장을 순서대로 배치하세요.",
    // chips[1]="나는" chips[0]="밥을" chips[2]="먹었다" → 정답 문장은 "나는 밥을 먹었다".
    chips: ["밥을", "나는", "먹었다"],
    answerOrder: [1, 0, 2],
  },
  {
    prompt: "다음 문장을 순서대로 배치하세요. (2)",
    // chips[2]="학교에" chips[0]="친구와" chips[1]="간다" → 정답 문장은 "친구와 학교에 간다".
    chips: ["친구와", "간다", "학교에"],
    answerOrder: [2, 0, 1],
  },
] as const;

vi.mock("./sentence-order", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sentence-order")>();
  return {
    ...actual,
    sentenceOrderQuestionsForStep: (id: JourneyStepId) =>
      id === "ordering" ? ORDERING_QUESTIONS : [],
  };
});

afterEach(() => {
  // announce 대역이 세운 전역을 원복한다 — 지우지 않으면 다른 파일로 샌다
  // (계약 §3.2 「announce 대역은 테스트마다 원복한다」).
  vi.unstubAllGlobals();
});

function renderOrdering(
  overrides: {
    onExit?: () => void;
    onFinish?: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
  } = {},
) {
  return render(
    <SentenceOrderScreen
      stepId="ordering"
      stepOrdinal={3}
      onExit={overrides.onExit ?? (() => {})}
      onFinish={overrides.onFinish ?? (() => {})}
    />,
  );
}

// ------------------------------------------------------------ announce 대역
//
// 형태의 정본은 `ListeningScreen.ui.test.tsx`의 `stubHost()`(오디오)다. 여기서는
// `lib/accessibility.ts`가 만지는 접점 하나(`NativeModules.LynxAccessibilityModule`)에
// 대역을 둔다 — `lib/accessibility.ts` 자체를 mock하지 않는다.

type AnnounceCall = { content: string };

function stubAnnounce(): AnnounceCall[] {
  const calls: AnnounceCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        calls.push({ content: args.content });
        callback("announced");
      },
    },
  });
  return calls;
}

// 조각을 정답 순서대로 눌러 놓는다.
function placeAllCorrectly(question: SentenceOrderQuestion): void {
  for (const chipIndex of question.answerOrder) {
    fireEvent.tap(screen.getByTestId(`sentence-order-chip-${chipIndex}`), {});
  }
}

// ---------------------------------------------------------------- 처음 렌더

test("제목이 '3단계 · 문장 순서'이고 accessibility-traits='header'다", () => {
  renderOrdering();

  const title = screen.getByTestId("sentence-order-screen-title");
  expect(title).toHaveTextContent("3단계 · 문장 순서");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

test("진행 문구가 '문항 1 / 2'이고 제시문이 첫 문항의 prompt다", () => {
  renderOrdering();

  expect(screen.getByTestId("sentence-order-screen-progress")).toHaveTextContent("문항 1 / 2");
  expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent(
    ORDERING_QUESTIONS[0].prompt,
  );
});

test("처음에는 조각 셋이 전부 창고 안에 있고 답 줄은 비어 있다", () => {
  renderOrdering();

  const sentence = screen.getByTestId("sentence-order-screen-sentence");
  const bank = screen.getByTestId("sentence-order-screen-bank");

  expect(sentence.children.length).toBe(0);
  for (let index = 0; index < ORDERING_QUESTIONS[0].chips.length; index += 1) {
    expect(within(bank).getByTestId(`sentence-order-chip-${index}`)).toBeInTheDocument();
    expect(within(sentence).queryByTestId(`sentence-order-chip-${index}`)).not.toBeInTheDocument();
  }
});

test("확인 전에는 판정 표식이 없다", () => {
  renderOrdering();

  expect(screen.queryByTestId("sentence-order-screen-mark")).not.toBeInTheDocument();
});

test("전부 배치하기 전에는 확인·다음·결과 보기가 하나도 없다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId("sentence-order-chip-1"), {});

  expect(screen.queryByTestId("sentence-order-screen-check")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-next")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-finish")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- 배치·해제

test("조각을 탭하면 답 줄로 이동하고 data-placed가 1이 된다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId("sentence-order-chip-1"), {});

  const sentence = screen.getByTestId("sentence-order-screen-sentence");
  const bank = screen.getByTestId("sentence-order-screen-bank");
  const placed = within(sentence).getByTestId("sentence-order-chip-1");
  expect(placed).toHaveAttribute("data-placed", "1");
  expect(within(bank).queryByTestId("sentence-order-chip-1")).not.toBeInTheDocument();
});

test("놓인 조각을 다시 탭하면 창고로 돌아가고 data-placed가 'none'이 된다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId("sentence-order-chip-1"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-chip-1"), {});

  const sentence = screen.getByTestId("sentence-order-screen-sentence");
  const bank = screen.getByTestId("sentence-order-screen-bank");
  const backInBank = within(bank).getByTestId("sentence-order-chip-1");
  expect(backInBank).toHaveAttribute("data-placed", "none");
  expect(within(sentence).queryByTestId("sentence-order-chip-1")).not.toBeInTheDocument();
});

test("전부 배치하면 확인이 나타난다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);

  expect(screen.getByTestId("sentence-order-screen-check")).toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-next")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-finish")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- 채점

test("정답 순서로 확인을 탭하면 data-result='correct'이고 다음이 나타나며 확인은 사라진다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});

  expect(screen.getByTestId("sentence-order-screen-mark")).toHaveAttribute(
    "data-result",
    "correct",
  );
  expect(screen.getByTestId("sentence-order-screen-next")).toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-check")).not.toBeInTheDocument();
});

test("틀린 순서로 확인을 탭하면 data-result='incorrect'다", () => {
  renderOrdering();

  // 정답 순서를 [1,0,2]로 뒤집어서 놓는다 → [0,1,2] 배치, incorrect.
  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-chip-1"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-chip-2"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});

  expect(screen.getByTestId("sentence-order-screen-mark")).toHaveAttribute(
    "data-result",
    "incorrect",
  );
});

test("채점 뒤 조각을 탭해도 배치·판정이 그대로다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});

  fireEvent.tap(screen.getByTestId("sentence-order-chip-1"), {});

  expect(screen.getByTestId("sentence-order-screen-mark")).toHaveAttribute(
    "data-result",
    "correct",
  );
  const sentence = screen.getByTestId("sentence-order-screen-sentence");
  expect(within(sentence).getByTestId("sentence-order-chip-1")).toHaveAttribute("data-placed", "1");
});

// ---------------------------------------------------------------- 문항 진행 · 완료

test("'다음'을 탭하면 두 번째 문항으로 넘어가고 배치·판정이 초기화된다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-next"), {});

  expect(screen.getByTestId("sentence-order-screen-progress")).toHaveTextContent("문항 2 / 2");
  expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent(
    ORDERING_QUESTIONS[1].prompt,
  );
  expect(screen.queryByTestId("sentence-order-screen-mark")).not.toBeInTheDocument();
  expect(screen.getByTestId("sentence-order-screen-sentence").children.length).toBe(0);
  expect(screen.queryByTestId("sentence-order-screen-next")).not.toBeInTheDocument();
});

test("두 문항을 마치면 완료 문구와 결과 보기가 나타나고 나가기·진행이 사라진다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-next"), {});
  placeAllCorrectly(ORDERING_QUESTIONS[1]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-next"), {});

  expect(screen.getByTestId("sentence-order-screen-complete")).toHaveTextContent(
    "문항을 모두 마쳤어요",
  );
  expect(screen.getByTestId("sentence-order-screen-finish")).toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-exit")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sentence-order-screen-progress")).not.toBeInTheDocument();
});

test("결과 보기를 탭하면 onFinish가 stepId와 판정 배열로 정확히 한 번 불린다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-next"), {});
  // 두 번째 문항은 오답으로 제출한다.
  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-chip-1"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-chip-2"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-next"), {});

  fireEvent.tap(screen.getByTestId("sentence-order-screen-finish"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["correct", "incorrect"]);
});

// ---------------------------------------------------------------- 중도 이탈

test("나가기를 탭하면 onExit이 한 번, onFinish는 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId, results: readonly AnswerResult[]) => void>();
  renderOrdering({ onExit, onFinish });

  fireEvent.tap(screen.getByTestId("sentence-order-screen-exit"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------- 능동 낭독 (계약 §1.11)

test("마운트만으로는 announce가 불리지 않는다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  expect(calls).toHaveLength(0);
});

test("채점 시점에 announce가 한 번 불리고 content가 '채점 결과, 정답'이다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});

  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("채점 결과, 정답");
});

test("오답 채점은 content가 '채점 결과, 오답'이다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-chip-1"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-chip-2"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});

  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("채점 결과, 오답");
});

test("문항 둘을 각각 채점하면 announce가 문항마다 정확히 한 번씩, 합쳐 두 번 불린다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-next"), {});
  placeAllCorrectly(ORDERING_QUESTIONS[1]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});

  expect(calls).toHaveLength(2);
  expect(calls.map((call) => call.content)).toEqual(["채점 결과, 정답", "채점 결과, 정답"]);
});

test("대역이 없어도 화면이 던지지 않는다", () => {
  expect(() => renderOrdering()).not.toThrow();
});

// ---------------------------------------------------------------- 접근성

test("accessibility-value가 화면 어디에도 없다", () => {
  const { container } = renderOrdering();

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
});

test("판정 표식 래퍼에 accessibility-*가 붙지 않는다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});

  const mark = screen.getByTestId("sentence-order-screen-mark");
  expect(mark).not.toHaveAttribute("accessibility-element");
  expect(mark).not.toHaveAttribute("accessibility-label");
  expect(mark).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 영역 (FE ADR-0022 · 계약 §3.2 A1~A7)

test("[A1] sentence-order-screen-scroll이 존재한다", () => {
  renderOrdering();

  expect(screen.getByTestId("sentence-order-screen-scroll")).toBeInTheDocument();
});

test("[A2] 진행·제시문·답 줄·창고가 스크롤 컨테이너 안에 있다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("sentence-order-screen-scroll");
  expect(within(scroll).getByTestId("sentence-order-screen-progress")).toBeInTheDocument();
  expect(within(scroll).getByTestId("sentence-order-screen-prompt")).toBeInTheDocument();
  expect(within(scroll).getByTestId("sentence-order-screen-sentence")).toBeInTheDocument();
  expect(within(scroll).getByTestId("sentence-order-screen-bank")).toBeInTheDocument();
});

test("[A3] 제목·나가기·액션 행이 스크롤 컨테이너 밖에 있다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});

  const scroll = screen.getByTestId("sentence-order-screen-scroll");
  expect(within(scroll).queryByTestId("sentence-order-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("sentence-order-screen-exit")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("sentence-order-screen-next")).not.toBeInTheDocument();

  expect(screen.getByTestId("sentence-order-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("sentence-order-screen-exit")).toBeInTheDocument();
  expect(screen.getByTestId("sentence-order-screen-next")).toBeInTheDocument();
});

test("[A4] scroll-orientation이 'vertical'로 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("sentence-order-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

test("[A5] scroll-bar-enable이 문자열 'true'로 붙는다", () => {
  renderOrdering();

  expect(screen.getByTestId("sentence-order-screen-scroll")).toHaveAttribute(
    "scroll-bar-enable",
    "true",
  );
});

test("[A6] 문항 진행 중과 완료 상태 둘 다 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  renderOrdering();
  expect(screen.getByTestId("sentence-order-screen-scroll").children.length).toBeLessThanOrEqual(1);

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-next"), {});
  placeAllCorrectly(ORDERING_QUESTIONS[1]);
  fireEvent.tap(screen.getByTestId("sentence-order-screen-check"), {});
  fireEvent.tap(screen.getByTestId("sentence-order-screen-next"), {});

  expect(screen.getByTestId("sentence-order-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

test("[A7] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("sentence-order-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});
