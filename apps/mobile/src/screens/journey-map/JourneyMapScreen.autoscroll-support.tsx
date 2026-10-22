import type { ReactElement } from "react";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { catalogUnitDomId } from "./catalog-map";
import {
  catalogProps,
  mapScreen,
  scrollSelector,
  type HostStub,
  type Rect,
} from "./JourneyMapScreen.test-support";

// 자동 스크롤 ui 테스트 셋이 함께 쓰는 표 · 도우미입니다. 맵은 내장 카탈로그 모양(u01 ~ u03)이고, 「레슨 둘 끝」은
// 표지 + S1 + S3을 끝낸 진행(다음 유닛 S4), 「레슨 셋 끝」은 S4까지(다음 유닛 S5)입니다. 말풍선도 같은 셀을 잽니다.
// 부드러운 이동은 각 테스트 파일이 `./use-map-glide`를 대역으로 갈아 「끝 위치로 부드러운 `scrollTo` 한 번」으로 봅니다.

export const unitRect = (top: number): Rect => ({ top, height: 100 });

export const domOf = (episodeId: string, unitKey: string): string =>
  `#${catalogUnitDomId(episodeId, unitKey)}`;

export const screenSelector = "#journey-map-screen";
export const headerSelector = "#journey-map-screen-header";
export const unitSelector = domOf("u01-water", "S4");
export const nextUnitSelector = domOf("u01-water", "S5");

export const baseRects: Record<string, Rect> = {
  [unitSelector]: unitRect(700),
  [nextUnitSelector]: unitRect(900),
  [scrollSelector]: { top: 60, height: 800 },
  // 기기 꼴: 띠가 서기 전에는 손잡이 높이가 0입니다.
  [headerSelector]: { top: 64, height: 0 },
  [screenSelector]: { top: 0, height: 900 },
};

export const asRects = (): Record<string, Rect> => ({ ...baseRects });

const lessonsTwo = { "u01-water": ["intro", "S1", "S3"] };
const lessonsThree = { "u01-water": ["intro", "S1", "S3", "S4"] };
export const atTwo = () => mapScreen({ catalog: catalogProps({ progress: lessonsTwo }) });
export const atThree = () => mapScreen({ catalog: catalogProps({ progress: lessonsThree }) });

/** 자동 스크롤 대상(S4)을 누릅니다 — 탭 세로 좌표는 그 셀의 중심(750)입니다. */
export const tapTarget = (): void => {
  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-S4"), {
      detail: { y: 750 },
    });
  });
};

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
