import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { controlStub } from "./listen-controls.test-support";
import { ListenPlaybackControls } from "./ListenPlaybackControls";

// `ui` 계층: 듣기 3열(다시 듣기 · 재생/일시정지 · 「천천히」)이 접두 testid로 서고 조작을 위로 올린다.

const P = "item-listen";

const orderedIds = (root: Element): string[] =>
  [...root.querySelectorAll("[data-testid]")]
    .map((element) => element.getAttribute("data-testid") ?? "")
    .filter((id) => [`${P}-replay`, `${P}-playback`, `${P}-slow`].includes(id));

test("LC1. 접두 아래 replay · playback · slow가 이 DOM 순서로 선다", () => {
  const { control } = controlStub();
  render(<ListenPlaybackControls control={control} testIdPrefix={P} />);

  expect(orderedIds(screen.getByTestId(P))).toEqual([`${P}-replay`, `${P}-playback`, `${P}-slow`]);
});

test("LC2. 호스트가 속도 재생을 지원하지 않으면 slow가 없고 줄 구조는 그대로다", () => {
  const supported = controlStub();
  const unsupported = controlStub({ slowPlayback: "unsupported" });
  const first = render(<ListenPlaybackControls control={supported.control} testIdPrefix={P} />);
  const supportedChildren = screen.getByTestId(P).children.length;
  first.unmount();

  render(<ListenPlaybackControls control={unsupported.control} testIdPrefix={P} />);

  expect(screen.queryByTestId(`${P}-slow`)).not.toBeInTheDocument();
  expect(screen.getByTestId(`${P}-replay`)).toBeInTheDocument();
  expect(screen.getByTestId(`${P}-playback`)).toBeInTheDocument();
  expect(screen.getByTestId(P).children.length).toBe(supportedChildren);
});

test("LC4. slow를 탭하면 togglePace, replay · playback을 탭하면 각각의 조작이 불린다", () => {
  const { control, togglePace, replay, toggle } = controlStub();
  render(<ListenPlaybackControls control={control} testIdPrefix={P} />);

  fireEvent.tap(screen.getByTestId(`${P}-slow`), {});
  fireEvent.tap(screen.getByTestId(`${P}-replay`), {});
  fireEvent.tap(screen.getByTestId(`${P}-playback`), {});

  expect(togglePace).toHaveBeenCalledTimes(1);
  expect(replay).toHaveBeenCalledTimes(1);
  expect(toggle).toHaveBeenCalledTimes(1);
});

test.each([
  ["idle", "Play"],
  ["playing", "Pause"],
  ["paused", "Resume"],
] as const)("LC1. 재생 단추의 이름은 %s에서 %s다", (playback, name) => {
  const { control } = controlStub({ playback });
  render(<ListenPlaybackControls control={control} testIdPrefix={P} />);

  expect(screen.getByTestId(`${P}-playback`)).toHaveAttribute("accessibility-label", name);
});

test.each([
  ["normal", "Slow, off"],
  ["slow", "Slow, on"],
] as const)("AX1. 속도 %s에서 slow의 이름은 %s다", (pace, name) => {
  const { control } = controlStub({ pace });
  render(<ListenPlaybackControls control={control} testIdPrefix={P} />);

  expect(screen.getByTestId(`${P}-slow`)).toHaveAttribute("accessibility-label", name);
  expect(screen.getByTestId(`${P}-slow`)).toHaveAttribute(
    "data-state",
    pace === "slow" ? "on" : "off",
  );
});
