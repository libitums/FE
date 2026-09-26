import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { StepSheet } from "./StepSheet";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다 (ADR-0006 D4). `toHaveClass`·`toHaveStyle`을
// 쓰지 않습니다 (docs/conventions/code.md).
//
// `StepSheetProps`에 `onStart`가 필수로 늘어 렌더 호출에 `onStart={() => {}}`만
// 더했습니다.
//
// **단언 6 하나가 뒤집혔습니다** — 무동작 단언을 삭제하고 `onStart`가 불린다는
// 단언으로 바꿨습니다. 단언 1~5는 그대로입니다.

// 단언 1 — 설명이 걷히고 순번이 제목 앞에 붙습니다(2026-09-27 말풍선 디자인).
test("제목이 순번과 함께 props 문자열을 텍스트로 낸다", () => {
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={() => {}}
    />,
  );

  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 3: “주문하기”");
});

// 단언 2
test("제목이 accessibility-traits='header'를 갖는다", () => {
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={() => {}}
    />,
  );

  expect(screen.getByTestId("step-sheet-title")).toHaveAttribute("accessibility-traits", "header");
});

// 단언 3
test("시작 버튼이 접근성 속성과 라벨 텍스트를 갖는다", () => {
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={() => {}}
    />,
  );

  const start = screen.getByTestId("step-sheet-start");
  expect(start).toHaveAttribute("accessibility-label", "시작");
  expect(start).toHaveAttribute("accessibility-traits", "button");
  expect(start).toHaveAttribute("accessibility-element", "true");
  expect(start).toHaveTextContent("시작");
});

// 단언 4 — 디자인에 보이는 닫기 자리가 없어졌습니다. 이름과 역할은 가림막이 집니다:
// 손가락은 말풍선 밖을 누르고, 스크린리더는 그 막을 `닫기` 버튼으로 읽습니다.
test("가림막이 닫기의 접근성 속성을 갖고, 보이는 낱말은 없다", () => {
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={() => {}}
    />,
  );

  const close = screen.getByTestId("step-sheet-close");
  expect(close).toHaveAttribute("accessibility-label", "닫기");
  expect(close).toHaveAttribute("accessibility-traits", "button");
  expect(close).toHaveAttribute("accessibility-element", "true");
  expect(close).toHaveTextContent("");
});

// 단언 5
test("닫기를 tap하면 onClose가 정확히 한 번 불린다", () => {
  const onClose = vi.fn<() => void>();
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={onClose}
    />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(onClose).toHaveBeenCalledTimes(1);
});

// 단언 6 — **뒤집힙니다.** 예전의 "시작을 tap해도 아무 일도 일어나지 않는다"는
// *학습 화면이 범위 밖이라 목적지가 없다*는 사실을 못박은 것이었고, 그 뒤로
// "다음 이슈가 bindtap 한 줄을 붙인다"로 후속을 이름으로 지목해 둔 빈칸이었습니다.
// 이번이 그 자리를 채우므로 무동작 단언을 **삭제하고** onStart가 불린다는 단언으로
// 바꿉니다.
//
// 나머지 단언(1~5)은 한 글자도 바뀌지 않습니다 — 시작에 붙는 것은 bindtap 한
// 줄이고 className·data-testid·accessibility-*·낭독 순서는 그대로입니다.
test("시작을 tap하면 onStart가 정확히 한 번 불린다", () => {
  const onStart = vi.fn<() => void>();
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={onStart}
      onClose={() => {}}
    />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(onStart).toHaveBeenCalledTimes(1);
});

// 시작은 닫기가 아닙니다 — 두 조작이 서로의 콜백을 부르지 않습니다. 시트가 닫혀
// 보이는 것은 App이 화면을 갈아 끼워 JourneyMapScreen이 언마운트되기 때문이지
// onClose가 불려서가 아닙니다.
test("시작을 tap해도 onClose는 불리지 않는다", () => {
  const onClose = vi.fn<() => void>();
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={onClose}
    />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(onClose).not.toHaveBeenCalled();
});

// 닫기는 시작이 아닙니다 — 반대 방향도 함께 못박습니다. 두 콜백이 뒤바뀐 결선을
// 잡습니다.
test("닫기를 tap해도 onStart는 불리지 않는다", () => {
  const onStart = vi.fn<() => void>();
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={onStart}
      onClose={() => {}}
    />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(onStart).not.toHaveBeenCalled();
});

// 진행 줄 — 낱말 둘과 막대가 같은 수에서 나옵니다.
test("진행 줄이 활동 수와 백분율을 같은 값에서 낸다", () => {
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={1}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={() => {}}
    />,
  );

  expect(screen.getByTestId("step-sheet-progress-count")).toHaveTextContent("1/4 활동");
  expect(screen.getByTestId("step-sheet-progress-percent")).toHaveTextContent("25%");
  expect(screen.getByTestId("step-sheet-progress")).toHaveAttribute(
    "accessibility-label",
    "1/4 활동, 25%",
  );
});

// 0%에서는 채움을 그리지 않습니다 — 폭 0짜리 상자가 점으로 남아 「조금 했다」로
// 읽힙니다.
test("끝낸 활동이 없으면 채움 막대를 그리지 않는다", () => {
  render(
    <StepSheet
      title="주문하기"
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={() => {}}
    />,
  );

  expect(screen.queryByTestId("step-sheet-progress-fill")).not.toBeInTheDocument();
});
