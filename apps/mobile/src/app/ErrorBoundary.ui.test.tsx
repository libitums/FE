import type { ReactNode } from "@lynx-js/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { UiCopyContext } from "../lib/ui-copy";
import { markedUiCopy } from "../lib/ui-copy.test-support";
import { ErrorBoundary } from "./ErrorBoundary";

// ErrorBoundary는 한동안 동작이 바뀌지 않는다는 전제 아래 `ui` 테스트가 없었습니다 —
// 요구사항이 이 요소를 직접 지목하면서 그 전제가 무너져 새로 생겼습니다(2026-09-02).
//
// 에러 상태를 렌더하려면 던지는 자식이 필요합니다. 그냥 항상 던지게 두면 재시도를
// 눌렀을 때 다시 던져서 무한 에러 루프가 되고 재시도 동작을 관찰할 수 없습니다 —
// 모듈 스코프 플래그로 **첫 렌더만** 던지게 합니다.
let hasThrown = false;

function Boom(): ReactNode {
  if (!hasThrown) {
    hasThrown = true;
    throw new Error("test failure");
  }
  return <text data-testid="boom-recovered">복구됨</text>;
}

// `componentDidCatch`와 React가 둘 다 잡힌 에러를 찍습니다. 테스트 출력이 실패처럼
// 보이지 않게 막되, **끝나면 되돌립니다** — 복원하지 않으면 이 파일 뒤로 진짜 에러
// 로그가 조용히 사라집니다.
beforeEach(() => {
  hasThrown = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("[SH3-E] 에러 화면 제목이 문구와 header trait을 갖는다", () => {
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  const title = screen.getByTestId("error-boundary-title");
  expect(title).toHaveTextContent("Something went wrong");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

test("재시도 요소가 accessibility-traits button을 갖는다", () => {
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

test("[SH3-E] 재시도 요소가 accessibility-label Try again과 보이는 글자 Try again을 갖는다", () => {
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  expect(screen.getByTestId("error-boundary-retry")).toHaveAttribute(
    "accessibility-label",
    "Try again",
  );
  expect(screen.getByTestId("error-boundary-retry")).toHaveTextContent("Try again");
});

test("재시도 요소가 accessibility-element true를 갖는다", () => {
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

// SH3-M — 폴백의 문구는 문구표에서 읽습니다(하드코딩 영어는 표시 표에서 그대로 남아 잡힙니다).
test("[SH3-M] 문구표를 주입하면 제목 · 재시도의 글자와 이름이 표의 경로로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("error-boundary-title")).toHaveTextContent(
    "⟦shell.errorBoundary.title⟧",
  );
  const retry = screen.getByTestId("error-boundary-retry");
  expect(retry).toHaveTextContent("⟦shell.errorBoundary.retry⟧");
  expect(retry).toHaveAttribute("accessibility-label", "⟦shell.errorBoundary.retry⟧");
});

// 크래시 보고 — 에러 경계가 잡은 예외는 런타임 오류 통로(`lynx.reportError`)로 한 번 나갑니다.
// 통로는 전역 `lynx`의 스파이로 가로챕니다: 경계가 `reportCrash`를 거쳐 실제로 그 통로를 부르는지
// 끝까지 보려고 모듈 모킹 대신 이 경계를 골랐습니다.
test("[U1] 잡힌 예외가 lynx.reportError로 정확히 한 번 나가고 에러 화면이 보인다", () => {
  const report = vi.spyOn(lynx, "reportError").mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  expect(report).toHaveBeenCalledTimes(1);
  const sent = report.mock.calls[0]?.[0];
  expect(sent).toBeInstanceOf(Error);
  expect((sent as Error).message).toBe("test failure");
  expect(screen.getByTestId("error-boundary-title")).toBeInTheDocument();
});

test("[U2] 재시도로 자식이 다시 그려져도 보고 횟수는 그대로 1이다", () => {
  const report = vi.spyOn(lynx, "reportError").mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );
  expect(report).toHaveBeenCalledTimes(1);

  fireEvent.tap(screen.getByTestId("error-boundary-retry"), {});

  expect(screen.getByTestId("boom-recovered")).toBeInTheDocument();
  expect(report).toHaveBeenCalledTimes(1);
});

// 스파이를 걸지 않습니다 — testing-environment의 기본 `reportError`는 던집니다.
test("[U3] 보고 통로가 던져도 에러 화면이 그대로 뜬다", () => {
  expect(() => lynx.reportError(new Error("probe"))).toThrow();

  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  expect(screen.getByTestId("error-boundary-title")).toBeInTheDocument();
  expect(screen.getByTestId("error-boundary-retry")).toBeInTheDocument();
});

test("[U4] 던지지 않는 자식이면 보고가 나가지 않는다", () => {
  const report = vi.spyOn(lynx, "reportError").mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <text data-testid="calm-child">ok</text>
    </ErrorBoundary>,
  );

  expect(screen.getByTestId("calm-child")).toBeInTheDocument();
  expect(report).not.toHaveBeenCalled();
});
