// 테스트 지원 — 듣기 조작 부품 테스트가 넘기는 `ListenAudioControl` 대역입니다. 제품 코드는 값 import하지 않습니다.
import { vi } from "vitest";

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
