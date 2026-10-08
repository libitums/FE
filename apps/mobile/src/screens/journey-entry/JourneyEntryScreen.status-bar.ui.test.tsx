import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { JourneyEntryScreen } from "./JourneyEntryScreen";

// `ui` 계층: 상태바 아이콘 표지가 화면 루트에 달리는지 봅니다(계약 3.2 · r02.2).
// 루트에 testid가 없어 렌더 컨테이너의 첫 요소를 루트로 봅니다.

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

test("UT6: 여정 입장 화면의 루트에 표지가 하나 선다", () => {
  const { container } = render(
    <JourneyEntryScreen
      safeArea={{ top: 0, bottom: 0 }}
      language="en"
      onEnter={vi.fn()}
      onBack={vi.fn<() => void>()}
    />,
  );

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(container.firstElementChild);
});
