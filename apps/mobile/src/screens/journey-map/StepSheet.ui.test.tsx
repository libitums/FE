import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { StepSheet } from "./StepSheet";

// `ui` 계층: 렌더 결과와 상호작용만 본다 (ADR-0006 D4). `toHaveClass`·`toHaveStyle`을
// 쓰지 않는다 (docs/conventions/code.md).
//
// 계약: .agent-harness/work/lib-222/spec.md §3.2(b) 단언 1~6

// 단언 1: 제목·설명이 props 문자열을 낸다.
test("제목·설명이 props 문자열을 텍스트로 낸다", () => {
  render(
    <StepSheet title="주문하기" description="카페에서 마실 것을 주문한다" onClose={() => {}} />,
  );

  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");
  expect(screen.getByTestId("step-sheet-description")).toHaveTextContent(
    "카페에서 마실 것을 주문한다",
  );
});

// 단언 2: 제목에 accessibility-traits="header"가 붙는다.
test("제목이 accessibility-traits='header'를 갖는다", () => {
  render(
    <StepSheet title="주문하기" description="카페에서 마실 것을 주문한다" onClose={() => {}} />,
  );

  expect(screen.getByTestId("step-sheet-title")).toHaveAttribute("accessibility-traits", "header");
});

// 단언 3: 시작이 accessibility-label="시작" · traits="button" · element="true"를 갖고
// 라벨 텍스트가 시작이다.
test("시작 버튼이 접근성 속성과 라벨 텍스트를 갖는다", () => {
  render(
    <StepSheet title="주문하기" description="카페에서 마실 것을 주문한다" onClose={() => {}} />,
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
    <StepSheet title="주문하기" description="카페에서 마실 것을 주문한다" onClose={() => {}} />,
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
    <StepSheet title="주문하기" description="카페에서 마실 것을 주문한다" onClose={onClose} />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(onClose).toHaveBeenCalledTimes(1);
});

// 단언 6: 시작을 tap해도 onClose가 불리지 않는다 — 목적지 없음이 의도라는 것을
// 실행 가능한 형태로 못박는다.
test("시작을 tap해도 onClose가 불리지 않는다 — 목적지 없음 계약", () => {
  const onClose = vi.fn<() => void>();
  render(
    <StepSheet title="주문하기" description="카페에서 마실 것을 주문한다" onClose={onClose} />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(onClose).not.toHaveBeenCalled();
});
