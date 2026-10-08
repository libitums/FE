import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { SplashScreen } from "./SplashScreen";

// `ui` 계층: 스플래시는 밝은 표면이라 표지를 달지 않습니다(계약 3.2 · G6).

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

test("UT8: 스플래시에는 표지가 없다", () => {
  render(<SplashScreen onTimeout={vi.fn()} />);

  expect(markers()).toHaveLength(0);
});
