import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { SpeechWavesState } from "../lib/speech-attempt";
import { SpeechWaves } from "./SpeechWaves";

// `ui` 계층: 마이크(파형) 부품 단독 — 세 상태의 속성 · 접근성 · 탭 · 아이콘 색.

afterEach(cleanup);

function mount(state: SpeechWavesState, label = "Speak") {
  const onTap = vi.fn<() => void>();
  const view = render(<SpeechWaves testId="waves" state={state} label={label} onTap={onTap} />);
  return { onTap, view };
}

const waves = () => screen.getByTestId("waves");
const iconColor = () => waves().querySelector("svg")?.getAttribute("current-color") ?? null;

test("UW1a. idle은 누를 수 있는 버튼 요소이고 이름은 넘긴 라벨이며 탭이 onTap을 한 번 부른다", () => {
  const { onTap } = mount("idle", "Speak");

  expect(waves()).toHaveAttribute("data-state", "idle");
  expect(waves()).toHaveAttribute("accessibility-element", "true");
  expect(waves()).toHaveAttribute("accessibility-traits", "button");
  expect(waves()).toHaveAttribute("accessibility-label", "Speak");
  fireEvent.tap(waves(), {});
  expect(onTap).toHaveBeenCalledTimes(1);
});

test("UW1b. listening도 누를 수 있는 버튼 요소이고 이름은 넘긴 라벨이다", () => {
  const { onTap } = mount("listening", "Stop speaking");

  expect(waves()).toHaveAttribute("data-state", "listening");
  expect(waves()).toHaveAttribute("accessibility-element", "true");
  expect(waves()).toHaveAttribute("accessibility-traits", "button");
  expect(waves()).toHaveAttribute("accessibility-label", "Stop speaking");
  fireEvent.tap(waves(), {});
  expect(onTap).toHaveBeenCalledTimes(1);
});

test("UW1c. off는 접근성 요소가 아니고 이름이 없으며 탭을 받지 않는다", () => {
  const { onTap } = mount("off", "Speak");

  expect(waves()).toHaveAttribute("data-state", "off");
  expect(waves()).not.toHaveAttribute("accessibility-element", "true");
  expect(waves()).not.toHaveAttribute("accessibility-label");
  fireEvent.tap(waves(), {});
  expect(onTap).toHaveBeenCalledTimes(0);
});

test("UW1d. 세 상태의 아이콘 색이 서로 다르다", () => {
  const colors: (string | null)[] = [];
  for (const state of ["idle", "listening", "off"] as const) {
    const { view } = mount(state);
    colors.push(iconColor());
    view.unmount();
  }

  expect(colors.every((value) => value !== null)).toBe(true);
  expect(new Set(colors).size).toBe(3);
});
