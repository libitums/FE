import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { visualNovelStoryFor } from "./visual-novel";
import { VisualNovelScreen } from "./VisualNovelScreen";

// `ui` 계층: 상태바 아이콘 표지가 화면 루트에 달리는지 봅니다(계약 3.2 · r02.2).
// 루트에 testid가 없어 렌더 컨테이너의 첫 요소를 루트로 봅니다.

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

test("UT5: 비주얼 노벨 화면의 루트에 표지가 하나 선다", () => {
  const { container } = render(
    <VisualNovelScreen
      story={visualNovelStoryFor("cafe-arrival-visual-novel")}
      progress={{ status: "active", beatIndex: 0 }}
      onAdvance={vi.fn()}
      onExit={vi.fn()}
      onFinish={vi.fn()}
    />,
  );

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(container.firstElementChild);
});
