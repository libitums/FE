import type { ReactNode } from "@lynx-js/react";
import { beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { ErrorBoundary } from "./ErrorBoundary";

// `ui` 계층: ErrorBoundary 신규 파일 (재고정 2026-09-02, 수용 기준 9).
// 첫 고정은 "이번 이슈가 에러 경계의 동작을 바꾸지 않는다"로 두어 ui 테스트가
// 없었다 — 요구사항 수용 기준 9가 이 요소를 직접 지목하면서 전제가 무너졌다
// (screens.contract.ts "ErrorBoundary" 절).
//
// 에러 상태를 렌더하려면 던지는 자식이 필요하다. 그냥 항상 던지게 두면 재시도를
// 눌렀을 때 다시 던져서 무한 에러 루프가 되고 재시도 동작을 관찰할 수 없다 —
// 모듈 스코프 플래그로 **첫 렌더만** 던지게 한다 (spec.md §6.3 D).
let hasThrown = false;

function Boom(): ReactNode {
  if (!hasThrown) {
    hasThrown = true;
    throw new Error("테스트용 실패");
  }
  return <text data-testid="boom-recovered">복구됨</text>;
}

beforeEach(() => {
  hasThrown = false;
});

test("에러 화면 제목이 문구와 header trait을 갖는다", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  const title = screen.getByTestId("error-boundary-title");
  expect(title).toHaveTextContent("문제가 생겼어요");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

test("재시도 요소가 accessibility-traits button을 갖는다", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  expect(screen.getByTestId("error-boundary-retry")).toHaveAttribute(
    "accessibility-traits",
    "button",
  );
});

test("재시도 요소가 accessibility-label 다시 시도를 갖는다", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  expect(screen.getByTestId("error-boundary-retry")).toHaveAttribute(
    "accessibility-label",
    "다시 시도",
  );
});

test("재시도 요소가 accessibility-element true를 갖는다", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  expect(screen.getByTestId("error-boundary-retry")).toHaveAttribute(
    "accessibility-element",
    "true",
  );
});

test("재시도를 tap하면 실패 화면이 사라지고 자식이 다시 렌더된다", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  expect(screen.getByTestId("error-boundary-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("error-boundary-retry"), {});

  expect(screen.queryByTestId("error-boundary-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("boom-recovered")).toBeInTheDocument();
});
