import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { controlStub } from "./listen-controls.test-support";
import { ListenControls, ListenPlaybackControls } from "./ListenPlaybackControls";

// `ui` 계층: 듣기 조작 부품(다시 듣기 · 재생 · 천천히)과 3열 줄이 접두 testid로 서고 조작을 위로 올린다.
// 이름 · 탭은 안쪽 RoundButton이 지고 바깥 상자는 testid만 갖는다.

const P = "item-listen";

const orderedIds = (root: Element): string[] =>
  [...root.querySelectorAll("[data-testid]")]
    .map((element) => element.getAttribute("data-testid") ?? "")
    .filter((id) => [`${P}-replay`, `${P}-playback`, `${P}-slow`].includes(id));

function roundButtonIn(testId: string): HTMLElement {
  const outer = screen.getByTestId(testId);
  const button = outer.querySelector<HTMLElement>('[data-testid="ui-lynx-round-button"]');
  if (button === null) throw new Error(`${testId} 안에 RoundButton이 없음`);
  return button;
}

test("LC1. Replay는 바깥 testid만 갖고 안쪽 RoundButton(l)이 이름과 탭을 진다", () => {
  const { control, replay } = controlStub();
  render(<ListenControls.Replay control={control} testId="part-replay" />);

  const outer = screen.getByTestId("part-replay");
  expect(outer).not.toHaveAttribute("accessibility-label");
  expect(outer).not.toHaveAttribute("accessibility-traits");
  const button = roundButtonIn("part-replay");
  expect(button).toHaveAttribute("accessibility-label", "Play from the start");
  expect(button).toHaveClass("ui-lynx-round-button-l");

  fireEvent.tap(button, {});

  expect(replay).toHaveBeenCalledTimes(1);
});

test.each([
  ["idle", "Play"],
  ["playing", "Pause"],
  ["paused", "Resume"],
] as const)(
  "LC2. Playback은 RoundButton(xl)이고 %s에서 이름이 %s이며 탭하면 toggle이다",
  (playback, name) => {
    const { control, toggle } = controlStub({ playback });
    render(<ListenControls.Playback control={control} testId="part-playback" />);

    const outer = screen.getByTestId("part-playback");
    expect(outer).not.toHaveAttribute("accessibility-label");
    const button = roundButtonIn("part-playback");
    expect(button).toHaveAttribute("accessibility-label", name);
    expect(button).toHaveClass("ui-lynx-round-button-xl");

    fireEvent.tap(button, {});

    expect(toggle).toHaveBeenCalledTimes(1);
  },
);

test("LC3. Slow는 지원하면 토글을 testId에 세우고 탭하면 togglePace, 지원하지 않으면 그리지 않는다", () => {
  const supported = controlStub();
  const first = render(<ListenControls.Slow control={supported.control} testId="part-slow" />);

  fireEvent.tap(screen.getByTestId("part-slow"), {});
  expect(supported.togglePace).toHaveBeenCalledTimes(1);
  first.unmount();

  const unsupported = controlStub({ slowPlayback: "unsupported" });
  render(<ListenControls.Slow control={unsupported.control} testId="part-slow" />);

  expect(screen.queryByTestId("part-slow")).not.toBeInTheDocument();
});

test("LC4. 3열 줄은 접두 아래 replay · playback · slow 순이다", () => {
  const { control } = controlStub();
  render(<ListenPlaybackControls control={control} testIdPrefix={P} />);

  expect(orderedIds(screen.getByTestId(P))).toEqual([`${P}-replay`, `${P}-playback`, `${P}-slow`]);
});

test("LC4. 호스트가 속도 재생을 지원하지 않으면 slow가 없고 줄 구조는 그대로다", () => {
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
  // 미지원 경로에서는 다시 듣기가 `.listening-prompt-replay` 상자(빈 칸과 같은 폭)에 담깁니다.
  expect(screen.getByTestId(`${P}-replay`).parentElement?.getAttribute("class")).toBe(
    "listening-prompt-replay",
  );
});

test("LC4. 줄에서 slow · replay · playback을 탭하면 각각의 조작이 불린다(안쪽 RoundButton)", () => {
  const { control, togglePace, replay, toggle } = controlStub();
  render(<ListenPlaybackControls control={control} testIdPrefix={P} />);

  fireEvent.tap(screen.getByTestId(`${P}-slow`), {});
  fireEvent.tap(roundButtonIn(`${P}-replay`), {});
  fireEvent.tap(roundButtonIn(`${P}-playback`), {});

  expect(togglePace).toHaveBeenCalledTimes(1);
  expect(replay).toHaveBeenCalledTimes(1);
  expect(toggle).toHaveBeenCalledTimes(1);
});

test.each([
  ["idle", "Play"],
  ["playing", "Pause"],
  ["paused", "Resume"],
] as const)("AX1. 줄의 재생 단추 이름은 %s에서 %s다(안쪽 RoundButton)", (playback, name) => {
  const { control } = controlStub({ playback });
  render(<ListenPlaybackControls control={control} testIdPrefix={P} />);

  expect(roundButtonIn(`${P}-playback`)).toHaveAttribute("accessibility-label", name);
  expect(screen.getByTestId(`${P}-playback`)).not.toHaveAttribute("accessibility-label");
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
