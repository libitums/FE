import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 이 화면은 제목 텍스트 하나만 그린다 — 탭 라벨(`여정`)과 화면 제목(`여정 맵`)은
// 다르다 (screens.contract.ts).
test("여정 맵 화면이 제목을 렌더한다", () => {
  render(<JourneyMapScreen />);

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
});
