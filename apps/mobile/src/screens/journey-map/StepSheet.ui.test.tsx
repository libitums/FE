import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { StepSheet } from "./StepSheet";

// `ui` 계층: 렌더 결과와 상호작용만 본다 (ADR-0006 D4). `toHaveClass`·`toHaveStyle`을
// 쓰지 않는다 (docs/conventions/code.md).
//
// 계약: .agent-harness/work/lib-222/spec.md §3.2(b) 단언 1~6
//
// LIB-223 (ui-scaffold): `StepSheetProps`에 `onStart`가 필수로 늘어(계약 §1.6)
// 렌더 호출에 `onStart={() => {}}`만 더했다.
//
// LIB-223 (ui): 계약 §3.2(d)가 지정한 대로 **단언 6 하나가 뒤집혔다** — 무동작
// 단언을 삭제하고 `onStart`가 불린다는 단언으로 바꿨다. 단언 1~5는 그대로다.

// 단언 1: 제목·설명이 props 문자열을 낸다.
test("제목·설명이 props 문자열을 텍스트로 낸다", () => {
  render(
    <StepSheet
      title="주문하기"
      description="카페에서 마실 것을 주문한다"
      onStart={() => {}}
      onClose={() => {}}
    />,
  );

  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");
  expect(screen.getByTestId("step-sheet-description")).toHaveTextContent(
    "카페에서 마실 것을 주문한다",
  );
});

// 단언 2: 제목에 accessibility-traits="header"가 붙는다.
test("제목이 accessibility-traits='header'를 갖는다", () => {
  render(
    <StepSheet
      title="주문하기"
      description="카페에서 마실 것을 주문한다"
      onStart={() => {}}
      onClose={() => {}}
    />,
  );

  expect(screen.getByTestId("step-sheet-title")).toHaveAttribute("accessibility-traits", "header");
});

// 단언 3: 시작이 accessibility-label="시작" · traits="button" · element="true"를 갖고
// 라벨 텍스트가 시작이다.
test("시작 버튼이 접근성 속성과 라벨 텍스트를 갖는다", () => {
  render(
    <StepSheet
      title="주문하기"
      description="카페에서 마실 것을 주문한다"
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

// 단언 4: 닫기가 같은 형태를 갖고 라벨 텍스트가 닫기다.
test("닫기 버튼이 접근성 속성과 라벨 텍스트를 갖는다", () => {
  render(
    <StepSheet
      title="주문하기"
      description="카페에서 마실 것을 주문한다"
      onStart={() => {}}
      onClose={() => {}}
    />,
  );

  const close = screen.getByTestId("step-sheet-close");
  expect(close).toHaveAttribute("accessibility-label", "닫기");
  expect(close).toHaveAttribute("accessibility-traits", "button");
  expect(close).toHaveAttribute("accessibility-element", "true");
  expect(close).toHaveTextContent("닫기");
});

// 단언 5: 닫기를 tap하면 onClose가 정확히 한 번 불린다.
test("닫기를 tap하면 onClose가 정확히 한 번 불린다", () => {
  const onClose = vi.fn<() => void>();
  render(
    <StepSheet
      title="주문하기"
      description="카페에서 마실 것을 주문한다"
      onStart={() => {}}
      onClose={onClose}
    />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(onClose).toHaveBeenCalledTimes(1);
});

// 단언 6 (보정, LIB-223 계약 §3.2(d) · §4.0-1): **뒤집힌다.** lib-222의
// "시작을 tap해도 아무 일도 일어나지 않는다"는 *학습 화면이 범위 밖이라 목적지가
// 없다*는 사실을 못박은 것이었고, lib-222 §1.7이 *"다음 이슈가 bindtap 한 줄을
// 붙인다"* 로 후속을 이름으로 지목해 둔 빈칸이다. 이번 이슈가 그 자리를 채우므로
// 무동작 단언을 **삭제하고** onStart가 불린다는 단언으로 바꾼다.
//
// 나머지 단언(1~5)은 한 글자도 바뀌지 않는다 — 시작에 붙는 것은 bindtap 한 줄이고
// className · data-testid · accessibility-* · 낭독 순서는 그대로다 (계약 §1.7).
test("시작을 tap하면 onStart가 정확히 한 번 불린다", () => {
  const onStart = vi.fn<() => void>();
  render(
    <StepSheet
      title="주문하기"
      description="카페에서 마실 것을 주문한다"
      onStart={onStart}
      onClose={() => {}}
    />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(onStart).toHaveBeenCalledTimes(1);
});

// 시작은 닫기가 아니다 — 두 조작이 서로의 콜백을 부르지 않는다. 시트가 닫혀 보이는
// 것은 App이 화면을 갈아 끼워 JourneyMapScreen이 언마운트되기 때문이지 onClose가
// 불려서가 아니다 (계약 §1.7 「시트를 명시적으로 닫지 않는다」).
test("시작을 tap해도 onClose는 불리지 않는다", () => {
  const onClose = vi.fn<() => void>();
  render(
    <StepSheet
      title="주문하기"
      description="카페에서 마실 것을 주문한다"
      onStart={() => {}}
      onClose={onClose}
    />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(onClose).not.toHaveBeenCalled();
});

// 닫기는 시작이 아니다 — 반대 방향도 함께 못박는다. 두 콜백이 뒤바뀐 결선을 잡는다.
test("닫기를 tap해도 onStart는 불리지 않는다", () => {
  const onStart = vi.fn<() => void>();
  render(
    <StepSheet
      title="주문하기"
      description="카페에서 마실 것을 주문한다"
      onStart={onStart}
      onClose={() => {}}
    />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(onStart).not.toHaveBeenCalled();
});
