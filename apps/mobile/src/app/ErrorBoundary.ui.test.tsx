import type { ReactNode } from "@lynx-js/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

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
    throw new Error("테스트용 실패");
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

test("에러 화면 제목이 문구와 header trait을 갖는다", () => {
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
