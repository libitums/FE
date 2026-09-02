import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { SettingsScreen } from "./SettingsScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 이 화면은 제목 텍스트 하나만 그린다 (screens.contract.ts).
test("설정 화면이 제목을 렌더한다", () => {
  render(<SettingsScreen />);

  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("설정");
});
