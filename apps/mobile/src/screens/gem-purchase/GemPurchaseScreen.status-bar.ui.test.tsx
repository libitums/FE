import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { GemPurchaseScreen } from "./GemPurchaseScreen";

// `ui` 계층: 젬 구매 화면은 표지를 달지 않습니다 — 제품에서 열리지 않는 표면입니다
// (계약 3.2 · U3).

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

test("UT10: 젬 구매 화면에는 표지가 없다", () => {
  render(<GemPurchaseScreen gemBalance={1240} onClose={vi.fn()} />);

  expect(markers()).toHaveLength(0);
});
