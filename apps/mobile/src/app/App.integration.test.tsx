import { expect, test } from "vitest";
import { render } from "@lynx-js/react/testing-library";

import { App } from "./App.js";

// `integration` 계층: 여러 실제 모듈의 협력 (ADR-0006 D4).
// 여기서는 App · navReducer · ErrorBoundary · HomeScreen 넷이 맞물린다.
// 목킹하지 않는다 — 외부 IO가 생기면 그 경계에서만 대체한다.
test("루트가 현재 탭 스택의 최상단 화면을 렌더한다", () => {
  const { getByText } = render(<App />);

  expect(getByText("홈")).toBeTruthy();
});
