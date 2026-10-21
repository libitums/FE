// 테스트 지원 — 듣기 조작 부품 테스트가 넘기는 `ListenAudioControl` 대역입니다. 제품 코드는 값 import하지 않습니다.
import { expect, vi } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import type { ListenAudioControl } from "./use-listen-audio";

export type ControlStub = {
  readonly control: ListenAudioControl;
  readonly toggle: ReturnType<typeof vi.fn<() => void>>;
  readonly replay: ReturnType<typeof vi.fn<() => void>>;
  readonly togglePace: ReturnType<typeof vi.fn<() => void>>;
};

export function controlStub(overrides: Partial<ListenAudioControl> = {}): ControlStub {
  const toggle = vi.fn<() => void>();
  const replay = vi.fn<() => void>();
  const togglePace = vi.fn<() => void>();
  const control: ListenAudioControl = {
    playback: "idle",
    pace: "normal",
    slowPlayback: "supported",
    toggle,
    replay,
    togglePace,
    answered: () => {},
    ...overrides,
  };
  return { control, toggle, replay, togglePace };
}

/**
 * 간이 줄의 다시 듣기: 이름 · 탭은 안쪽 `RoundButton`(접근성 요소)이 지고, 바깥 상자는 testid만 갖는다.
 * 바깥에 이름이 또 있으면 스크린 리더가 두 번 읽습니다.
 */
export function listenAgainParts(lineTestId: string): { outer: HTMLElement; button: HTMLElement } {
  const outer = screen.getByTestId(`${lineTestId}-again`);
  const button = outer.querySelector<HTMLElement>('[data-testid="ui-lynx-round-button"]');
  if (button === null) throw new Error(`${lineTestId}-again 안에 RoundButton이 없음`);
  return { outer, button };
}

export function expectListenAgainAccessible(lineTestId: string, name: string): void {
  const { outer, button } = listenAgainParts(lineTestId);
  expect(button).toHaveAttribute("accessibility-label", name);
  expect(outer).not.toHaveAttribute("accessibility-label");
}
