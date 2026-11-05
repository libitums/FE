import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { backHandlers } from "../../lib/back-handler";
import { JourneyMapScreen } from "./JourneyMapScreen";
import { catalogProps } from "./JourneyMapScreen.test-support";
import { u00Catalog, u00Screen } from "./JourneyMapScreen.tutorial-u00.test-support";

// `ui` 계층: 다른 탭 루트에 있는 동안 숨겨 둔 지도(`active={false}`, ADR-0106 D2) — 겹침 신호 · 뒤로가기 · 첫 유닛 안내를
// 하지 않고, 열려 있던 말풍선은 닫는다.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    // 남은 핸들러를 비웁니다.
  }
});

const coverDone = { "u01-water": ["intro"] };
const tapUnit = (key: string) => {
  act(() => {
    fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-u01-water-${key}`), {
      detail: { y: 300 },
    });
  });
};

test("IA1. 말풍선이 열린 채 숨겨지면 말풍선을 닫고 겹침 신호를 거둔다", () => {
  const onLayerChange = vi.fn();
  const catalog = catalogProps({ progress: coverDone });
  const view = render(<JourneyMapScreen catalog={catalog} onLayerChange={onLayerChange} />);
  tapUnit("S1");
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeNull();

  act(() => {
    view.rerender(
      <JourneyMapScreen catalog={catalog} onLayerChange={onLayerChange} active={false} />,
    );
  });

  expect(screen.queryByTestId("step-sheet-panel")).toBeNull();
  expect(onLayerChange).toHaveBeenLastCalledWith(false);
});

test("IA2. 숨긴 지도는 첫 유닛 안내를 띄우지 않고 뒤로가기도 가로채지 않으며 겹침 신호를 보내지 않는다", () => {
  const onLayerChange = vi.fn();
  render(
    <FirstUnitGuideProvider enabled>
      {u00Screen(u00Catalog(), { active: false, onLayerChange })}
    </FirstUnitGuideProvider>,
  );

  expect(screen.queryByTestId("first-unit-guide-map") !== null).toBe(false);
  expect(backHandlers.runTop()).toBe(false);
  expect(onLayerChange).not.toHaveBeenCalledWith(true);
});
