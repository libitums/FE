import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import type { AnswerResult } from "../../lib/answer-result";
import { ListeningChoice } from "./ListeningChoice";

// `ui` 계층: 렌더 결과와 상호작용만 본다 (ADR-0006 D4). 계산된 스타일을 볼 수 없으므로
// `toHaveClass` · `toHaveStyle` · `toBeVisible`을 쓰지 않는다 (docs/conventions/code.md
// 「jest-dom 매처는 절반만 쓴다」). 상태는 전부 속성으로 관찰한다 (「관찰 채널 넷」).
//
// 계약: .agent-harness/work/lib-223/spec.md §3.2(a) 단언 1~10.
// 이 컴포넌트는 상태를 갖지 않는다 — props에서만 파생한다 (§1.6).
//
// 판정 결과가 나가는 채널은 셋이고 **서로 다른 것을 본다**(§1.8). 그래서 아래에서
// 한 단언으로 뭉치지 않고 채널마다 테스트를 나눈다:
//   1) 상태 `data-*`      — `data-result`                (테스트가 보는 것)
//   2) `accessibility-*`  — `accessibility-label` 접미사  (보조기술이 받는 것)
//   3) 보이는 표식        — 아이콘 모양(`content`) + `current-color` + 낱말 텍스트
// 채널이 하나라도 조용히 빠지면 그 채널의 테스트만 빨개진다.

const RESULTS: readonly (AnswerResult | null)[] = [null, "correct", "incorrect"];

// 아이콘 모양의 정본은 패키지 모듈이다 — 리터럴을 적지 않는다 (JourneyStepNode 선례).
// 계약 §1.7.1 표.
const ICON_BY_RESULT: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// 아이콘 색의 정본은 design이 고정한 토큰 상수다 — design.md §3.3 · §8이 spec.md
// §1.7.1의 자리표시자(`color.feedback.correct` / `.incorrect`)를 `-text` 변형으로
// 정정했다(대비 3.03 경계값을 세 번째로 들이지 않기 위해).
const ICON_COLOR_BY_RESULT: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

// ---------------------------------------------------------------- 채널 1: 상태 `data-*`

// 단언 1: 판정이 없으면 data-result="none". 조건부로 속성을 빼지 않는다 —
// "속성을 붙이는 것을 잊었다"와 "판정이 없다"가 구별되어야 한다 (계약 §1.7).
test("판정이 없으면 data-result가 none이다 · 라벨 텍스트가 text와 같다", () => {
  render(
    <ListeningChoice index={0} text="음료 온도를 묻고 있다" result={null} onSelect={() => {}} />,
  );

  const root = screen.getByTestId("listening-choice-0");
  expect(root).toHaveAttribute("data-result", "none");
  expect(root).toHaveTextContent("음료 온도를 묻고 있다");
});

// 단언 4-a: 정답 판정이 상태 채널로 나온다.
test("정답이면 data-result가 correct다", () => {
  render(
    <ListeningChoice index={1} text="음료 온도를 묻고 있다" result="correct" onSelect={() => {}} />,
  );

  expect(screen.getByTestId("listening-choice-1")).toHaveAttribute("data-result", "correct");
});

// 단언 5-a: 오답 판정이 상태 채널로 나온다.
test("오답이면 data-result가 incorrect다", () => {
  render(
    <ListeningChoice
      index={2}
      text="계산 방법을 묻고 있다"
      result="incorrect"
      onSelect={() => {}}
    />,
  );

  expect(screen.getByTestId("listening-choice-2")).toHaveAttribute("data-result", "incorrect");
});

// ---------------------------------------------------------------- 채널 2: `accessibility-*`

// 단언 3: 판정이 없으면 접미사가 없다 — 라벨이 text와 **정확히** 같다.
// 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는 것이 된다 (계약 §1.5(b)).
test("판정이 없으면 accessibility-label이 text와 정확히 같다 — 접미사 없음", () => {
  render(
    <ListeningChoice index={0} text="음료 온도를 묻고 있다" result={null} onSelect={() => {}} />,
  );

  expect(screen.getByTestId("listening-choice-0")).toHaveAttribute(
    "accessibility-label",
    "음료 온도를 묻고 있다",
  );
});

// 단언 4-b: 구분자는 쉼표 + 공백이다 (ADR-0016 D3).
test("정답이면 accessibility-label에 ', 정답' 접미사가 붙는다", () => {
  render(
    <ListeningChoice index={1} text="음료 온도를 묻고 있다" result="correct" onSelect={() => {}} />,
  );

  expect(screen.getByTestId("listening-choice-1")).toHaveAttribute(
    "accessibility-label",
    "음료 온도를 묻고 있다, 정답",
  );
});

// 단언 5-b.
test("오답이면 accessibility-label에 ', 오답' 접미사가 붙는다", () => {
  render(
    <ListeningChoice
      index={2}
      text="계산 방법을 묻고 있다"
      result="incorrect"
      onSelect={() => {}}
    />,
  );

  expect(screen.getByTestId("listening-choice-2")).toHaveAttribute(
    "accessibility-label",
    "계산 방법을 묻고 있다, 오답",
  );
});

// 단언 6: 세 result 전부에서 조작 단위의 이름·역할이 붙는다. 응답 뒤에도 traits가
// "button"이고 "disabled"로 바뀌지 않는다 (ADR-0016 D10 — 영구히 조작 불가한 것이
// 아니다. 다음 문항이 렌더되는 순간 다시 눌린다). accessibility-element도 응답 뒤에
// 빠지지 않는다 (ADR-0016 D5 — 빼면 정지점은 남고 이름·상태만 사라진다).
for (const result of RESULTS) {
  test(`조작 단위에 element·label·traits가 붙는다 — result=${String(result)}`, () => {
    render(
      <ListeningChoice
        index={0}
        text="음료 온도를 묻고 있다"
        result={result}
        onSelect={() => {}}
      />,
    );

    const root = screen.getByTestId("listening-choice-0");
    expect(root).toHaveAttribute("accessibility-element", "true");
    expect(root).toHaveAttribute("accessibility-traits", "button");
  });
}

// ADR-0016 D3 `정정 기록`: 상태는 라벨 접미사이고 `accessibility-value`를 쓰지 않는다
// (이 스택의 iOS에서 낭독되지 않는다 — `ui`가 전부 green이었는데 실기에 도달하지
// 않았던 바로 그 속성이다). 저장소 전체 0건은 grep의 몫이지만(계약 §3.5-6), 판정을
// 지는 이 요소에서 다시 새지 않는다는 것은 여기서 실행 가능하게 못박는다. undefined를
// 넘긴 속성은 아예 붙지 않으므로 이 부재 단언은 공허하지 않다 (code.md).
for (const result of RESULTS) {
  test(`accessibility-value를 쓰지 않는다 — result=${String(result)}`, () => {
    render(
      <ListeningChoice
        index={0}
        text="음료 온도를 묻고 있다"
        result={result}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByTestId("listening-choice-0")).not.toHaveAttribute("accessibility-value");
  });
}

// ---------------------------------------------------------------- 채널 3: 보이는 표식

// 단언 2: 판정이 없으면 표식이 통째로 없다 — 아이콘도 낱말도.
test("판정이 없으면 표식 아이콘이 렌더되지 않는다", () => {
  render(
    <ListeningChoice index={0} text="음료 온도를 묻고 있다" result={null} onSelect={() => {}} />,
  );

  // 앵커: 보기 자체는 그려져 있고, 그 안에 표식만 없다.
  expect(screen.getByTestId("listening-choice-0")).toHaveAttribute("data-result", "none");
  expect(screen.queryByTestId("listening-choice-icon-0")).not.toBeInTheDocument();
});

test("판정이 없으면 정답·오답 낱말이 텍스트에 없다", () => {
  render(
    <ListeningChoice index={0} text="음료 온도를 묻고 있다" result={null} onSelect={() => {}} />,
  );

  const root = screen.getByTestId("listening-choice-0");
  expect(root).not.toHaveTextContent("정답");
  expect(root).not.toHaveTextContent("오답");
});

// 단언 4-c: 낱말이 보인다. 색과 독립인 두 번째 채널이다 (WCAG 1.4.1 · 계약 §1.7.1).
test("정답이면 '정답' 낱말이 보기 안에 텍스트로 보인다", () => {
  render(
    <ListeningChoice index={1} text="음료 온도를 묻고 있다" result="correct" onSelect={() => {}} />,
  );

  expect(screen.getByTestId("listening-choice-1")).toHaveTextContent("정답");
});

// 단언 5-c.
test("오답이면 '오답' 낱말이 보기 안에 텍스트로 보인다", () => {
  render(
    <ListeningChoice
      index={2}
      text="계산 방법을 묻고 있다"
      result="incorrect"
      onSelect={() => {}}
    />,
  );

  expect(screen.getByTestId("listening-choice-2")).toHaveTextContent("오답");
});

// 단언 7-a: 아이콘 모양이 판정별 패키지 모듈 문자열과 같다 — 뒤바뀐 결선을 여기서 잡는다.
for (const result of ["correct", "incorrect"] as const) {
  test(`표식 아이콘 content가 판정(${result})의 패키지 모듈 문자열과 같다`, () => {
    render(
      <ListeningChoice
        index={3}
        text="물을 달라고 하고 있다"
        result={result}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByTestId("listening-choice-icon-3")).toHaveAttribute(
      "content",
      ICON_BY_RESULT[result],
    );
  });
}

// 단언 7-b: current-color가 판정별 토큰 상수와 같다 (계약 §1.8의 「결선」 채널).
for (const result of ["correct", "incorrect"] as const) {
  test(`표식 아이콘 current-color가 판정(${result})의 토큰 상수와 같다`, () => {
    render(
      <ListeningChoice
        index={3}
        text="물을 달라고 하고 있다"
        result={result}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByTestId("listening-choice-icon-3")).toHaveAttribute(
      "current-color",
      ICON_COLOR_BY_RESULT[result],
    );
  });
}

// 단언 7-c: 두 판정이 아이콘 채널에서 실제로 갈린다 — 모양도 색도 서로 다르다.
// 하나로 뭉개지면 판정이 색 하나에만 실린다.
test("정답과 오답의 표식이 모양·색 둘 다에서 갈린다", () => {
  expect(ICON_BY_RESULT.correct).not.toBe(ICON_BY_RESULT.incorrect);
  expect(ICON_COLOR_BY_RESULT.correct).not.toBe(ICON_COLOR_BY_RESULT.incorrect);
});

// 단언 8: 표식 아이콘은 순수 장식이다 — 접근성 트리에서 빠진다 (ADR-0016 D5).
for (const result of ["correct", "incorrect"] as const) {
  test(`표식 아이콘이 accessibility-elements-hidden="true"다 — ${result}`, () => {
    render(
      <ListeningChoice
        index={3}
        text="물을 달라고 하고 있다"
        result={result}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByTestId("listening-choice-icon-3")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });
}

// 단언 8-b (계약 §1.7 「표식을 가리는 자리는 **래퍼**다」): 가림 속성은 아이콘만이 아니라
// `<view className="listening-choice-mark">`에도 붙는다. 이 속성의 iOS 세터는
// `view.accessibilityElementsHidden`이고 **가리는 대상은 자손**이다 — 자손이 없는
// `<svg>`에만 붙이면 아무것도 가려지지 않는다. 정작 가려야 하는 것은
// `<text className="listening-choice-mark-label">`(`정답`/`오답`)이고, `LynxUIText`는
// `enableAccessibilityByDefault`가 `YES`라 **기본이 접근성 요소**다. 가리지 않으면
// 조작 단위 하나가 접근성 요소 둘이 되어 ADR-0016 D5를 어기고 같은 낱말이 두 번 들린다.
// 판정 상태는 이미 라벨 접미사가 지고 있으므로(ADR-0016 D3) 이 `<text>`는 시각 채널이지
// 보조기술 채널이 아니다.
//
// **위 단언 8(`<svg>`)을 대체하지 않는다** — 계약이 둘 다 유지한다고 적었다.
//
// 계약 §2가 test-id를 늘리지 않아 표식 래퍼에는 `data-testid`가 없다. 그래서 클래스
// 셀렉터로 요소를 **찾는다** — 찾기는 `data-testid`와 같은 탐색 축이지 상태를 보는
// 관찰 채널이 아니다(code.md 「관찰 채널 넷」). 계산된 스타일에 기대는 `toHaveClass`와
// 다르다. 못 찾은 채로 지나가지 않도록 `toContainElement`로 존재 앵커를 건다.
for (const result of ["correct", "incorrect"] as const) {
  test(`표식 래퍼가 accessibility-elements-hidden="true"다 — ${result}`, () => {
    render(
      <ListeningChoice
        index={3}
        text="물을 달라고 하고 있다"
        result={result}
        onSelect={() => {}}
      />,
    );

    const mark = screen
      .getByTestId("listening-choice-3")
      .querySelector<HTMLElement>(".listening-choice-mark");

    expect(mark).toContainElement(screen.getByTestId("listening-choice-icon-3"));
    expect(mark).toHaveAttribute("accessibility-elements-hidden", "true");
  });
}

// 왜 `<svg>` 하나로는 부족한지를 실행 가능하게 못박는다: 래퍼에는 아이콘 말고 **낱말이
// 자손으로 더 있다.** 이 구조가 무너지면(낱말을 래퍼 밖으로 빼거나 지우면) 래퍼를 가릴
// 이유도 함께 사라지므로 같은 자리에서 본다.
test("표식 래퍼가 아이콘과 낱말을 자손으로 갖는다 — 가려야 할 자손이 실제로 있다", () => {
  render(
    <ListeningChoice index={3} text="물을 달라고 하고 있다" result="correct" onSelect={() => {}} />,
  );

  const mark = screen
    .getByTestId("listening-choice-3")
    .querySelector<HTMLElement>(".listening-choice-mark");

  expect(mark).toContainElement(screen.getByTestId("listening-choice-icon-3"));
  expect(mark).toHaveTextContent("정답");
});

// 보기 하나당 정지 노드가 1개다 (ADR-0016 D5 · 실기 §3.4-7의 자동 계층 쪽 절반).
// 라벨 <text>나 표식에 accessibility-element·accessibility-label을 붙이면 정지 노드가
// 늘고 이름이 두 번 읽힌다 — 루트의 자손에 그 속성이 하나도 없다는 것으로 본다.
for (const result of RESULTS) {
  test(`보기 안의 자식이 조작 단위가 되지 않는다 — result=${String(result)}`, () => {
    render(
      <ListeningChoice
        index={0}
        text="음료 온도를 묻고 있다"
        result={result}
        onSelect={() => {}}
      />,
    );

    const root = screen.getByTestId("listening-choice-0");
    expect(root.querySelectorAll("[accessibility-element]")).toHaveLength(0);
    expect(root.querySelectorAll("[accessibility-label]")).toHaveLength(0);
  });
}

// ---------------------------------------------------------------- 상호작용

// 단언 9: tap하면 onSelect가 index로 정확히 한 번 불린다.
test("tap하면 onSelect가 index로 정확히 한 번 불린다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  render(
    <ListeningChoice
      index={2}
      text="따뜻한 커피를 한 잔 주문하고 있다"
      result={null}
      onSelect={onSelect}
    />,
  );

  fireEvent.tap(screen.getByTestId("listening-choice-2"), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(2);
});

// 0번 보기 — **0은 falsy다.** `index && …` 같은 truthy 분기나 `if (index)` 게이트가
// 들어오면 0번 보기만 조용히 죽고 나머지 셋은 통과한다. listening.ts의 choiceResultAt
// 주석이 순수 함수 쪽에서 같은 함정을 적었고, 여기가 컴포넌트 쪽 짝이다.
test("0번 보기를 tap해도 onSelect가 0으로 불린다 — 0은 falsy다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  render(
    <ListeningChoice
      index={0}
      text="처음 만난 사람에게 인사하고 있다"
      result={null}
      onSelect={onSelect}
    />,
  );

  fireEvent.tap(screen.getByTestId("listening-choice-0"), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(0);
});

// 단언 10: 이미 판정이 실린 보기도 tap을 위로 올린다. **차단은 이 컴포넌트의 일이
// 아니다** — 게이트는 리듀서 하나다 (계약 §1.5(b) 「막는 자리가 리듀서 하나다」).
// 이 단언이 없으면 다음 사람이 컴포넌트에 두 번째 게이트를 넣는다.
for (const result of ["correct", "incorrect"] as const) {
  test(`판정이 실린 뒤에도 tap하면 onSelect가 불린다 — ${result} (게이트는 리듀서다)`, () => {
    const onSelect = vi.fn<(index: number) => void>();
    render(
      <ListeningChoice
        index={1}
        text="음료 온도를 묻고 있다"
        result={result}
        onSelect={onSelect}
      />,
    );

    fireEvent.tap(screen.getByTestId("listening-choice-1"), {});

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(1);
  });
}

// 이 컴포넌트는 상태를 갖지 않는다 (계약 §1.6) — tap해도 렌더된 판정이 움직이지 않는다.
test("tap해도 렌더된 data-result는 그대로다 — 컴포넌트는 상태를 갖지 않는다", () => {
  render(
    <ListeningChoice index={0} text="음료 온도를 묻고 있다" result={null} onSelect={() => {}} />,
  );

  fireEvent.tap(screen.getByTestId("listening-choice-0"), {});

  expect(screen.getByTestId("listening-choice-0")).toHaveAttribute("data-result", "none");
});
