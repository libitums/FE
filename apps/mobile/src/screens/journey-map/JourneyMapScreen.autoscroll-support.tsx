import type { ReactElement } from "react";
import { act, render } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { scrollSelector, type HostStub, type Rect } from "./JourneyMapScreen.test-support";

// 자동 스크롤 ui 테스트 셋이 함께 쓰는 표 · 도우미입니다.

export const unitRect = (top: number): Rect => ({ top, height: 100 });

export const screenSelector = "#journey-map-screen";
export const headerSelector = "#journey-map-screen-header";
export const unitSelector = "#journey-map-unit-ordering";
export const nodeSelector = "#journey-step-node-ordering";

export const baseRects: Record<string, Rect> = {
  "#journey-map-unit-ordering": unitRect(700),
  "#journey-map-unit-appointment": unitRect(900),
  [scrollSelector]: { top: 60, height: 800 },
  // 기기 꼴: 띠가 서기 전에는 손잡이 높이가 0입니다.
  "#journey-map-screen-header": { top: 64, height: 0 },
  // 말풍선이 재는 값입니다 — `JourneyMapScreen.anchor.ui.test.tsx`의 값과 같습니다.
  "#journey-step-node-ordering": { top: 700, height: 124 },
  "#journey-map-screen": { top: 0, height: 900 },
};

export const asRects = (): Record<string, Rect> => ({ ...baseRects });

export function mount(element: ReactElement) {
  let view: ReturnType<typeof render> | undefined;
  act(() => {
    view = render(element);
  });
  return view as ReturnType<typeof render>;
}

export function rerender(view: ReturnType<typeof render>, element: ReactElement): void {
  act(() => {
    view.rerender(element);
  });
}

export const reduced = (element: ReactElement) => (
  <MotionProvider motion="reduced">{element}</MotionProvider>
);

export const scrollToCall = (offset: number, smooth: boolean) => ({
  selector: scrollSelector,
  method: "scrollTo",
  params: { offset, smooth },
});

export function deferAll(host: HostStub): void {
  host.defer = () => true;
}
