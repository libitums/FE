import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { JourneyStepId } from "../journey-map/journey-map";
import type { CultureQuizQuestion } from "./culture-quiz";
import { CultureQuizScreen } from "./CultureQuizScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 본다(ADR-0006 D4). 순수
// 함수(culture-quiz.ts의 세션 리듀서·판정·문구)는 mock하지 않는다 — 화면이 그것을
// 실제로 부르는지가 이 파일이 보는 것의 절반이다. `toHaveClass` · `toHaveStyle` ·
// `toBeVisible`을 쓰지 않는다(docs/conventions/code.md).
//
// 계약: .agent-harness/work/lib-244/spec.md §4(컴포넌트 계약) · §8.2(ui — required,
// X1~X10).
//
// 이음매 ③(화면이 내용에 의존하지 않는다) — 조회 함수 cultureQuizQuestionsForStep
// **하나만** 부분 대역한다. 나머지 export(리듀서 · 판정 · 문구)는 실물이다. 데이터
// 파일(culture-quiz.ts)을 고치지 않는다.
//
// fixture는 문항 둘 이상이고 보기 개수가 문항마다 다르다 — 개수를 계약이 정하지
// 않았음을(D5) 실물로 보인다. answerIndex: 0인 문항을 하나 포함한다(0을 falsy로
// 다루면 잡힌다).

const ORDERING_QUESTIONS: readonly CultureQuizQuestion[] = [
  {
    prompt: "설날에 어른께 드리는 인사는?",
    // 보기 셋. 정답 인덱스가 0이다 — 0을 falsy로 다루는 자리를 여기서 잡는다.
    choices: ["세배", "성묘", "차례"],
    answerIndex: 0,
  },
  {
    prompt: "한국에서 숫자 4를 꺼리는 이유와 관련 있는 것은?",
    // 보기 다섯 — 앞 문항(셋)과 개수가 다르다(D5 「개수를 계약이 정하지 않는다」의
    // 실물 증거).
    choices: ["死(죽을 사)", "행운의 숫자", "왕의 숫자", "봄의 숫자", "달의 숫자"],
    answerIndex: 2,
  },
] as const;

vi.mock("./culture-quiz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./culture-quiz")>();
  return {
    ...actual,
    cultureQuizQuestionsForStep: (id: JourneyStepId) =>
      id === "ordering" ? ORDERING_QUESTIONS : [],
  };
});

// ------------------------------------------------------------ announce 대역
//
// 형태의 정본은 `SentenceOrderScreen.ui.test.tsx`의 `stubAnnounce()`다.
// `lib/accessibility.ts`가 만지는 접점 하나(`NativeModules.LynxAccessibilityModule`)에
// 대역을 둔다 — `lib/accessibility.ts` 자체를 mock하지 않는다.
//
// ⚠ **이 화면이 여는 능동 채널은 완료 전이 하나다**(LIB-247 계약 §6.2(f)). 앞선
// 회차의 「어디에도 announce 0건」은 이 대역이 재는 것이 아니게 됐다 — 이제 재는
// 것은 「완료 전이 하나만 발화하고 그 밖의 경로에서는 0건」이다. 판정(정답/오답)은
// **여전히 발화하지 않는다** — 그것은 라벨 접미사(ADR-0016 D3)가 지고, 위 X7이
// 그대로 그것을 짓는다(계약 §1.3).

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

// 완료 전용 custom 모듈과 기존 builtin 호출을 분리해 관찰한다.
function stubCompletionHost(): { builtin: AnnounceCall[]; completion: AnnounceCall[] } {
  const builtin: AnnounceCall[] = [];
  const completion: AnnounceCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        builtin.push({ content: args.content });
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
  return { builtin, completion };
}

afterEach(() => {
  // announce 대역이 세운 전역을 원복한다 — 지우지 않으면 다른 파일로 샌다
  // (계약 §3.2 「announce 대역은 테스트마다 원복한다」).
  vi.unstubAllGlobals();
});

function renderOrdering(overrides: { onExit?: () => void } = {}) {
  return render(
    <CultureQuizScreen stepId="ordering" stepOrdinal={3} onExit={overrides.onExit ?? (() => {})} />,
  );
}

function optionTestIds(question: CultureQuizQuestion): readonly string[] {
  return question.choices.map((_choice, index) => `culture-quiz-option-${index}`);
}

// ---------------------------------------------------------------- X1: 제목

test("[X1] 제목이 '3단계 · 문화 퀴즈'이고 accessibility-traits='header'다", () => {
  renderOrdering();

  const title = screen.getByTestId("culture-quiz-screen-title");
  expect(title).toHaveTextContent("3단계 · 문화 퀴즈");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

// ---------------------------------------------------------------- X2: 나가기

test("[X2] -exit가 라벨 '맵으로'·traits='button'이고 탭하면 onExit이 정확히 한 번 불린다", () => {
  const onExit = vi.fn<() => void>();
  renderOrdering({ onExit });

  const exit = screen.getByTestId("culture-quiz-screen-exit");
  expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  expect(exit).toHaveAttribute("accessibility-traits", "button");

  fireEvent.tap(exit, {});

  expect(onExit).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- X3: 진행 문구

test("[X3] 진행 문구가 fixture의 문항 수를 반영한다 — '문항 1 / 2'", () => {
  renderOrdering();

  expect(screen.getByTestId("culture-quiz-screen-progress")).toHaveTextContent("문항 1 / 2");
});

// ---------------------------------------------------------------- X4: 제시문

test("[X4] 제시문이 fixture의 문자열이다", () => {
  renderOrdering();

  expect(screen.getByTestId("culture-quiz-screen-prompt")).toHaveTextContent(
    ORDERING_QUESTIONS[0]!.prompt,
  );
});

// ---------------------------------------------------------------- X5: 보기 수

test("[X5] 보기 수가 fixture의 choices.length와 같다 — 그 수 + 1번째 testid는 없다", () => {
  renderOrdering();

  const question = ORDERING_QUESTIONS[0]!;
  for (const testid of optionTestIds(question)) {
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  }
  expect(
    screen.queryByTestId(`culture-quiz-option-${question.choices.length}`),
  ).not.toBeInTheDocument();
});

test("[X5] 둘째 문항으로 넘어가면 보기 수가 다섯으로 바뀐다 — 문항마다 개수가 다르다(D5)", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});

  const question = ORDERING_QUESTIONS[1]!;
  for (const testid of optionTestIds(question)) {
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  }
  expect(
    screen.queryByTestId(`culture-quiz-option-${question.choices.length}`),
  ).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- X6: -next 조건부

test("[X6] 응답 전 -next가 없다. 보기 하나를 탭하면 생긴다", () => {
  renderOrdering();

  expect(screen.queryByTestId("culture-quiz-screen-next")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});

  expect(screen.getByTestId("culture-quiz-screen-next")).toBeInTheDocument();
});

// ---------------------------------------------------------------- X7: 고른 보기에만 접미사

test("[X7] 응답 뒤 고른 보기에만 판정 접미사가 붙고 나머지는 없다 — 정답을 안 골랐어도", () => {
  renderOrdering();

  const question = ORDERING_QUESTIONS[0]!;
  // 정답(0번)이 아닌 1번을 고른다 — 정답 보기(0번)에도 접미사가 안 붙는 것을 본다.
  const chosenIndex = 1;
  expect(chosenIndex).not.toBe(question.answerIndex);

  fireEvent.tap(screen.getByTestId(`culture-quiz-option-${chosenIndex}`), {});

  // 조건부 expect를 피한다(vitest/no-conditional-expect) — 기대 결과를 먼저
  // 배열로 짓고 무조건 단언한다.
  const labels = question.choices.map(
    (_choice, index) =>
      screen.getByTestId(`culture-quiz-option-${index}`).getAttribute("accessibility-label") ?? "",
  );
  const suffixed = labels.map((label) => /, (정답|오답)$/.test(label));

  expect(suffixed).toEqual(question.choices.map((_choice, index) => index === chosenIndex));
});

// ---------------------------------------------------------------- X8: 다음 → 문항 전환

test("[X8] -next를 탭하면 진행 문구가 다음 문항으로 넘어가고 선택이 풀린다 — -next가 다시 사라진다", () => {
  renderOrdering();

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});

  expect(screen.getByTestId("culture-quiz-screen-progress")).toHaveTextContent("문항 2 / 2");
  expect(screen.getByTestId("culture-quiz-screen-prompt")).toHaveTextContent(
    ORDERING_QUESTIONS[1]!.prompt,
  );
  expect(screen.queryByTestId("culture-quiz-screen-next")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- X9: 완료 상태

test("[X9] 마지막 문항의 -next 뒤 -complete가 뜨고 -exit가 여전히 있다. -next는 없다", () => {
  renderOrdering();

  // 문항 0
  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});
  // 문항 1(마지막)
  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
  fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});

  expect(screen.getByTestId("culture-quiz-screen-complete")).toHaveTextContent(
    "문항을 모두 마쳤어요",
  );
  expect(screen.getByTestId("culture-quiz-screen-exit")).toBeInTheDocument();
  expect(screen.queryByTestId("culture-quiz-screen-next")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- X10: 스크롤 · 가림

// 인자 하나짜리 부정형 매처로 짓는다(값까지 넘기는 두 인자 형태는 거짓 통과를
// 만든 적이 있다).
test("[X10] -scroll에 accessibility-*가 없다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("culture-quiz-screen-scroll");
  expect(scroll).toBeInTheDocument();
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

test("[X10] accessibility-elements-hidden이 응답 뒤에만 나타나고 그 자리가 표식 래퍼다", () => {
  const { container } = renderOrdering();

  expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});

  const hidden = container.querySelectorAll("[accessibility-elements-hidden]");
  expect(hidden).toHaveLength(1);
  expect(hidden[0]).toContainElement(screen.getByTestId("culture-quiz-option-icon-0"));
});

// AC14(a)가 요구하는 나머지 둘. scroll-orientation·scroll-bar-enable이 빠지면
// 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로 불가능해진다(Dynamic Type로
// 넘친 내용에 닿을 수 없다). 형제 화면(CultureScreen 등)의 스크롤 속성 단언과
// 형태를 맞춘다.
test("[X10] -scroll에 scroll-orientation='vertical'·scroll-bar-enable='true'가 붙는다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("culture-quiz-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
});

// AC14(a)의 「직계 자식이 정확히 하나」. 저장소 선례(다른 화면들의 U10류)는
// 「하나를 넘지 않는다」(<=1, 빈 화면을 허용)까지만 재는데, 이 화면은 문항이 항상
// 있어 내용 컨테이너가 항상 렌더된다 — 그래서 "정확히 하나"까지 잴 수 있고 그래야
// 한다. 자식 수뿐 아니라 그 하나가 실제 내용 컨테이너인지(진행 문구·제시문을 담고
// 있는지)까지 확인한다 — 개수만 세면 「자식 하나짜리 빈 껍데기」로도 거짓 통과한다.
test("[X10] -scroll의 직계 자식이 정확히 하나이고 그 자식이 화면의 내용 컨테이너다", () => {
  renderOrdering();

  const scroll = screen.getByTestId("culture-quiz-screen-scroll");
  expect(scroll.children.length).toBe(1);

  const content = scroll.children[0] as HTMLElement;
  expect(content).toContainElement(screen.getByTestId("culture-quiz-screen-progress"));
  expect(content).toContainElement(screen.getByTestId("culture-quiz-screen-prompt"));
});

// ------------------------------------------ AC14(e) → LIB-247 계약 §6.2(f): 완료 전이 하나

// `announce`는 호스트가 없어도 던지지 않고 `"unavailable"`을 돌려주므로
// (lib/accessibility.ts) `not.toThrow()` 하나만으로는 호출 횟수를 못 잡는다 — 화면이
// announce를 부르든 안 부르든 그 단언은 그대로 초록이다. 그래서
// `NativeModules.LynxAccessibilityModule`에 대역을 두고 실제 호출 횟수를 센다.
//
// ⚠ **LIB-247이 이 케이스를 지우지 않고 조인다.** 조작열은 한 줄도 안 바뀌고
// `not.toThrow()`도 그대로 남는다 — 바뀌는 것은 **기대 횟수**다. 이 경로의 마지막
// `다음`이 종료 전이이므로 그 순간 발화가 하나 나가는 것이 옳다. **「0건」의 절반은
// 아래 X-B가 이어받는다** — 완료 **전에는** 여전히 0건이다.
test("전체 흐름(응답 → 다음 → 완료)에서 예외 없이 렌더되고 announce는 완료 전이 하나뿐이다", () => {
  const calls = stubAnnounce();

  expect(() => {
    renderOrdering();
    fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
    fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});
    fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
    fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});
  }).not.toThrow();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("문항을 모두 마쳤어요, 맵으로");
});

// 실제 마지막 다음 전이만 custom 완료 발화를 사용하고 builtin 중복은 만들지 않는다.
test("마지막 다음 뒤 custom 문화 완료 발화가 한 번이고 rerender에도 늘지 않는다", () => {
  const { builtin, completion } = stubCompletionHost();
  const view = renderOrdering();

  expect(completion).toHaveLength(0);
  completeAllQuestions();

  expect(completion).toHaveLength(1);
  expect(completion[0]?.content).toBe("문항을 모두 마쳤어요, 맵으로");
  expect(builtin).toHaveLength(0);

  view.rerender(<CultureQuizScreen stepId="ordering" stepOrdinal={3} onExit={() => {}} />);
  expect(completion).toHaveLength(1);
  expect(builtin).toHaveLength(0);
});

// ------------------------------------------- 완료 전이 발화 (LIB-247 계약 §6.2 X-A~X-E)
//
// 이 화면의 완료 상태에 남는 **유일한 조작 단위**는 `결과 보기`가 아니라 `맵으로`다
// (LIB-244 D1 — 이 화면에는 결과가 없다). 규칙은 넷이 같고 값이 갈린다(계약 §3.3(a)).

// 문항 전부에 응답하고 넘겨 완료 상태까지 몬다. 어느 보기를 고르든 진행은 같다 —
// 이 화면은 판정으로 갈라지지 않는다(LIB-244 D1).
function completeAllQuestions(): void {
  for (let index = 0; index < ORDERING_QUESTIONS.length; index += 1) {
    fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});
    fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});
  }
}

// X-A. 완료 전이 뒤 발화가 정확히 하나이고 그 내용이 계약 §3.2 표의 문자열이다.
test("[X-A] 완료 전이 뒤 announce가 정확히 하나이고 content가 '문항을 모두 마쳤어요, 맵으로'다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  completeAllQuestions();

  expect(screen.getByTestId("culture-quiz-screen-complete")).toBeInTheDocument(); // 앵커
  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("문항을 모두 마쳤어요, 맵으로");
});

// X-B. 전이 **전에는** 0건이다. 가드(`if (!complete) return;`)를 지우면 문항 도중에
// 완료 발화가 나가고 이 케이스가 잡는다(계약 §6.2(h)). 판정이 발화로 새는 것도
// 여기서 함께 잡힌다 — 보기를 고르는 것은 이 채널을 열지 않는다.
test("[X-B] 첫 렌더·응답·중간 다음까지 announce가 0건이다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  expect(calls).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});

  expect(calls).toHaveLength(0);

  fireEvent.tap(screen.getByTestId("culture-quiz-screen-next"), {});

  expect(screen.getByTestId("culture-quiz-screen-progress")).toHaveTextContent("문항 2 / 2"); // 앵커
  expect(calls).toHaveLength(0);
});

// X-C. **정확히 한 번**이다. 종료 상태에 닿은 뒤 같은 props로 다시 렌더해도 호출이
// 늘지 않는다 — dep 배열을 지워 매 렌더 실행이 되면 여기서만 잡힌다(계약 §6.2(h)).
// props를 새로 짓지 않고 **같은 참조**를 다시 넘긴다 — 값이 갈려서 늘어난 것이
// 아니라 렌더 자체로 늘어난 것을 보려는 것이다.
test("[X-C] 완료 상태에서 같은 props로 다시 렌더해도 announce가 늘지 않는다", () => {
  const calls = stubAnnounce();
  const onExit = () => {};
  const view = render(<CultureQuizScreen stepId="ordering" stepOrdinal={3} onExit={onExit} />);

  completeAllQuestions();

  expect(calls).toHaveLength(1);

  view.rerender(<CultureQuizScreen stepId="ordering" stepOrdinal={3} onExit={onExit} />);
  view.rerender(<CultureQuizScreen stepId="ordering" stepOrdinal={3} onExit={onExit} />);

  expect(screen.getByTestId("culture-quiz-screen-complete")).toBeInTheDocument(); // 앵커
  expect(calls).toHaveLength(1);
});

// X-D. **소리에만 있는 낱말이 0건이다**(ADR-0016 D11-1 · 수용 기준 3). 발화 문자열을
// 리터럴로 다시 적지 않고 **DOM에서 파생해** 짓는다 — 앞절은 종료 문구 요소의 내용,
// 뒷절은 그 순간 화면에 실재하는 유일한 조작 단위의 `accessibility-label`이다.
// 이 화면에서 그 하나가 `맵으로`인 것이 값이 갈리는 자리다.
test("[X-D] 완료 발화가 종료 문구와 그 순간 유일한 조작 단위의 라벨에서 그대로 나온다", () => {
  const calls = stubAnnounce();
  const { container } = renderOrdering();

  completeAllQuestions();

  const elements = [...container.querySelectorAll("[accessibility-element]")];
  expect(elements.map((el) => el.getAttribute("data-testid"))).toEqual([
    "culture-quiz-screen-exit",
  ]);

  const completeText = screen.getByTestId("culture-quiz-screen-complete").textContent ?? "";
  const actionLabel = elements[0]?.getAttribute("accessibility-label") ?? "";

  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe(`${completeText}, ${actionLabel}`);
});

// X-E. **마운트가 곧 완료인 갈래**(계약 §4.2). 문항 표가 빈 스텝은 첫 렌더가 이미
// 종료 상태다 — 전이만 발화하게 만들면 그 갈래가 조용한 채로 남는다. 이 화면은
// 오늘 실물 문항 표가 다섯 스텝 전부 비어 있어 배정이 오는 날 이 갈래가 실물이다.
test("[X-E] 문항이 0인 스텝은 마운트가 곧 완료라 그 순간 announce가 하나 나간다", () => {
  const calls = stubAnnounce();

  render(<CultureQuizScreen stepId="greeting" stepOrdinal={1} onExit={() => {}} />);

  expect(screen.getByTestId("culture-quiz-screen-complete")).toBeInTheDocument(); // 앵커
  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("문항을 모두 마쳤어요, 맵으로");
});
