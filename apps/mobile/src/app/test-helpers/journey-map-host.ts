// 여정 맵 자동 스크롤을 앱 세션에서 보는 integration 테스트의 공용 값입니다. 제품 코드가 import하지
// 않습니다. 호스트 질의 대역은 `JourneyMapScreen.test-support`의 `stubHost`를 그대로 씁니다.

import { act, fireEvent, screen } from "@lynx-js/react/testing-library";

import { scrollSelector, type Rect } from "../../screens/journey-map/JourneyMapScreen.test-support";

export { scrollSelector };

/** 스크롤 상자와 머리 카드의 잰 값입니다 — 정렬선은 60 + 168 + 24 = 252입니다. */
export const frameRects: Record<string, Rect> = {
  [scrollSelector]: { top: 60, height: 800 },
  "#journey-map-screen-header": { top: 60, height: 168 },
  "#journey-map-screen": { top: 0, height: 900 },
};

/** 대상 유닛 위 모서리가 `top`일 때 스크롤 자리 0에서의 목적지입니다(정렬선 252). */
export const offsetFor = (top: number): number => top - 252;

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
