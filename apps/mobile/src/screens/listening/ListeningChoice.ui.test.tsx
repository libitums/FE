import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import type { AnswerResult } from "../../lib/answer-result";
import { ListeningChoice } from "./ListeningChoice";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다 (ADR-0006 D4). 계산된 스타일을 볼 수
// 없으므로 `toHaveClass`·`toHaveStyle`·`toBeVisible`을 쓰지 않습니다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」). 상태는 전부 속성으로
// 관찰합니다 (「관찰 채널 넷」).
//
// 이 컴포넌트는 상태를 갖지 않습니다 — props에서만 파생합니다.
//
// 판정 결과가 나가는 채널은 셋이고 **서로 다른 것을 봅니다**. 그래서 아래에서
// 한 단언으로 뭉치지 않고 채널마다 테스트를 나눕니다:
//   1) 상태 `data-*`      — `data-result`                (테스트가 보는 것)
//   2) `accessibility-*`  — `accessibility-label` 접미사  (보조기술이 받는 것)
//   3) 보이는 표식        — 아이콘 모양(`content`) + `current-color` + 낱말 텍스트
// 채널이 하나라도 조용히 빠지면 그 채널의 테스트만 빨개집니다.

const RESULTS: readonly (AnswerResult | null)[] = [null, "correct", "incorrect"];

// 아이콘 모양의 정본은 패키지 모듈입니다 — 리터럴을 적지 않습니다 (JourneyStepNode
// 선례).
const ICON_BY_RESULT: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// 아이콘 색의 정본은 design이 고정한 토큰 상수입니다 — 자리표시자
// (`color.feedback.correct` / `.incorrect`)를 `-text` 변형으로 정정했습니다
// (대비 3.03 경계값을 세 번째로 들이지 않기 위해서입니다).
const ICON_COLOR_BY_RESULT: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

// ---------------------------------------------------------------- 채널 1: 상태 `data-*`

// 단언 1: 판정이 없으면 data-result="none"입니다. 조건부로 속성을 빼지 않습니다 —
// "속성을 붙이는 것을 잊었다"와 "판정이 없다"가 구별되어야 합니다.
test("판정이 없으면 data-result가 none이다 · 라벨 텍스트가 text와 같다", () => {
  render(
    <ListeningChoice index={0} text="음료 온도를 묻고 있다" result={null} onSelect={() => {}} />,
  );

  const root = screen.getByTestId("listening-choice-0");
  expect(root).toHaveAttribute("data-result", "none");
  expect(root).toHaveTextContent("음료 온도를 묻고 있다");
});

// 단언 4-a: 정답 판정이 상태 채널로 나옵니다.
test("정답이면 data-result가 correct다", () => {
  render(
    <ListeningChoice index={1} text="음료 온도를 묻고 있다" result="correct" onSelect={() => {}} />,
  );

  expect(screen.getByTestId("listening-choice-1")).toHaveAttribute("data-result", "correct");
});

// 단언 5-a: 오답 판정이 상태 채널로 나옵니다.
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

// 단언 3: 판정이 없으면 접미사가 없습니다 — 라벨이 text와 **정확히** 같습니다.
// 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는 것이 됩니다.
test("판정이 없으면 accessibility-label이 text와 정확히 같다 — 접미사 없음", () => {
  render(
    <ListeningChoice index={0} text="음료 온도를 묻고 있다" result={null} onSelect={() => {}} />,
  );

  expect(screen.getByTestId("listening-choice-0")).toHaveAttribute(
    "accessibility-label",
    "음료 온도를 묻고 있다",
  );
});

// 단언 4-b: 구분자는 쉼표 + 공백입니다 (ADR-0016 D3).
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

// 단언 6: 세 result 전부에서 조작 단위의 이름·역할이 붙습니다. 응답 뒤에도
// traits가 "button"이고 "disabled"로 바뀌지 않습니다 (ADR-0016 D10 — 영구히
// 조작 불가한 것이 아닙니다. 다음 문항이 렌더되는 순간 다시 눌립니다).
// accessibility-element도 응답 뒤에 빠지지 않습니다 (ADR-0016 D5 — 빼면 정지점은
// 남고 이름·상태만 사라집니다).
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

// ADR-0016 D3 `정정 기록`: 상태는 라벨 접미사이고 `accessibility-value`를 쓰지
// 않습니다(이 스택의 iOS에서 낭독되지 않습니다 — `ui`가 전부 green이었는데
// 실기에 도달하지 않았던 바로 그 속성입니다). 저장소 전체 0건은 grep의 몫이지만,
// 판정을 지는 이 요소에서 다시 새지 않는다는 것은 여기서 실행 가능하게
// 못박습니다. undefined를 넘긴 속성은 아예 붙지 않으므로 이 부재 단언은
// 공허하지 않습니다 (code.md).
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

// ---------------------------------------------------------------- 보이는 표식 없음
//
// 2026-09-27: **보이는 표식(✓ · ✗ · 낱말)이 통째로 걷혔습니다**(Figma 53-14231).
// 보기 넷이 응답 뒤에도 같은 모양으로 서고, 눈으로 보는 판정은 무대 카드의 배지
// 하나가 말합니다(`AnswerVerdict`).
//
// 이 절이 예전에 지던 것은 「모양 · 색 · 낱말 셋으로 판정을 가른다」였습니다. 그
// 계약은 배지로 옮겨 갔고, 여기 남는 것은 **그 표식이 정말로 없다**는 것입니다 —
// 없어진 것을 안 재면 다음 사람이 되돌려 놓아도 아무것도 빨개지지 않습니다.

for (const result of RESULTS) {
  test(`판정이 있어도 표식 아이콘이 렌더되지 않는다 — result=${String(result)}`, () => {
    render(
      <ListeningChoice
        index={0}
        text="음료 온도를 묻고 있다"
        result={result}
        onSelect={() => {}}
      />,
    );

    // 앵커: 보기 자체는 그려져 있고 판정도 들어와 있습니다.
    expect(screen.getByTestId("listening-choice-0")).toHaveAttribute(
      "data-result",
      result ?? "none",
    );
    expect(screen.queryByTestId("listening-choice-icon-0")).not.toBeInTheDocument();
  });

  test(`판정이 있어도 정답 · 오답 낱말이 보기 안에 없다 — result=${String(result)}`, () => {
    const { container } = render(
      <ListeningChoice
        index={0}
        text="음료 온도를 묻고 있다"
        result={result}
        onSelect={() => {}}
      />,
    );

    const root = screen.getByTestId("listening-choice-0");
    expect(root).toHaveTextContent("음료 온도를 묻고 있다"); // 앵커
    expect(root).not.toHaveTextContent("정답");
    expect(root).not.toHaveTextContent("오답");
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });
}

// 판정이 화면에서 사라진 것은 **눈으로 보는 쪽**뿐입니다. 이름의 접미사는 그대로
// 지므로 스크린리더는 여전히 어느 보기가 정답이었는지 읽습니다(ADR-0016 D3).
test("표식이 없어도 이름의 접미사가 판정을 남긴다", () => {
  render(
    <ListeningChoice index={0} text="음료 온도를 묻고 있다" result="correct" onSelect={() => {}} />,
  );

  expect(screen.getByTestId("listening-choice-0").getAttribute("accessibility-label")).toContain(
    "정답",
  );
});

// 보기 하나당 정지 노드가 1개입니다 (ADR-0016 D5 — 자동 계층 쪽 절반입니다).
// 라벨 <text>나 표식에 accessibility-element·accessibility-label을 붙이면 정지
// 노드가 늘고 이름이 두 번 읽힙니다 — 루트의 자손에 그 속성이 하나도 없다는
// 것으로 봅니다.
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

// 단언 9
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

// 0번 보기입니다 — **0은 falsy입니다.** `index && …` 같은 truthy 분기나
// `if (index)` 게이트가 들어오면 0번 보기만 조용히 죽고 나머지 셋은 통과합니다.
// listening.ts의 choiceResultAt 주석이 순수 함수 쪽에서 같은 함정을 적었고,
// 여기가 컴포넌트 쪽 짝입니다.
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

// 단언 10: 이미 판정이 실린 보기도 tap을 위로 올립니다. **차단은 이 컴포넌트의
// 일이 아닙니다** — 게이트는 리듀서 하나입니다(「막는 자리가 리듀서 하나다」).
// 이 단언이 없으면 다음 사람이 컴포넌트에 두 번째 게이트를 넣습니다.
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

// 이 컴포넌트는 상태를 갖지 않습니다 — tap해도 렌더된 판정이 움직이지 않습니다.
test("tap해도 렌더된 data-result는 그대로다 — 컴포넌트는 상태를 갖지 않는다", () => {
  render(
    <ListeningChoice index={0} text="음료 온도를 묻고 있다" result={null} onSelect={() => {}} />,
  );

  fireEvent.tap(screen.getByTestId("listening-choice-0"), {});

  expect(screen.getByTestId("listening-choice-0")).toHaveAttribute("data-result", "none");
});
