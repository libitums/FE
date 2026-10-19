// 여정 맵 자동 스크롤을 앱 세션에서 보는 integration 테스트의 공용 값입니다. 제품 코드가 import하지
// 않습니다. 호스트 질의 대역은 `JourneyMapScreen.test-support`의 `stubHost`를 그대로 씁니다.

import { act, fireEvent, screen } from "@lynx-js/react/testing-library";

import { scrollSelector, type Rect } from "../../screens/journey-map/JourneyMapScreen.test-support";

export { scrollSelector };

/** 스크롤 상자 · 머리 손잡이 · 화면의 잰 값입니다 — 손잡이 높이 0은 기기 꼴입니다. */
export const frameRects: Record<string, Rect> = {
  [scrollSelector]: { top: 60, height: 800 },
  "#journey-map-screen-header": { top: 64, height: 0 },
  "#journey-map-screen": { top: 0, height: 900 },
};

// 가운데 = 60 + 800 / 2 = 460, 대상 중심 = top + 50. 띠 손잡이 아래 + 24는 대상 위 410보다 위라 걸리지 않는다.
/** 대상 유닛 위 모서리가 `top`일 때 스크롤 자리 0에서의 목적지입니다(대상이 서는 자리 410). */
export const offsetFor = (top: number): number => top - 410;

export function setGlobalProps(value: Record<string, unknown> | undefined): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

export const insets = { top: 59, bottom: 34, left: 0, right: 0 };

export function tapTab(name: "journey" | "roleplay"): void {
  fireEvent.tap(screen.getByTestId(`ui-lynx-bottom-navigator-item-${name}`), {});
}

export async function flushAsync(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
