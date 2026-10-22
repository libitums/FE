import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { ItemListenControls } from "./ItemListenControls";
import {
  controlStub,
  expectListenAgainAccessible,
  listenAgainParts,
} from "./listen-controls.test-support";

// `ui` 계층: 문항 곁 간이 줄(다시 듣기 · 「천천히」)이 접두 testid로 서고 조작을 위로 올린다.

const T = "word-choice-listen";

test("LC3. 다시 듣기의 이름은 안쪽 접근성 단추에 Play again이고 탭하면 replay 한 번이다", () => {
  const { control, replay } = controlStub();
  render(<ItemListenControls control={control} testId={T} />);

  expectListenAgainAccessible(T, "Play again");
  fireEvent.tap(listenAgainParts(T).button, {});

  expect(replay).toHaveBeenCalledTimes(1);
});

test("LC3. 바깥 상자는 탭을 받지 않는다 — 조작은 안쪽 단추 하나뿐이다", () => {
  const { control, replay } = controlStub();
  render(<ItemListenControls control={control} testId={T} />);

  fireEvent.tap(listenAgainParts(T).outer, {});

  expect(replay).not.toHaveBeenCalled();
});

test("LC3. 호스트가 속도 재생을 지원할 때만 slow가 서고 탭하면 togglePace다", () => {
  const supported = controlStub();
  const first = render(<ItemListenControls control={supported.control} testId={T} />);
  fireEvent.tap(screen.getByTestId(`${T}-slow`), {});
  expect(supported.togglePace).toHaveBeenCalledTimes(1);
  first.unmount();

  const unsupported = controlStub({ slowPlayback: "unsupported" });
  render(<ItemListenControls control={unsupported.control} testId={T} />);

  expect(screen.queryByTestId(`${T}-slow`)).not.toBeInTheDocument();
  expect(screen.getByTestId(`${T}-again`)).toBeInTheDocument();
});

test("LC4. 줄 루트가 testId로 서고 안에 again · slow가 이 DOM 순서로 있다", () => {
  const { control } = controlStub();
  render(<ItemListenControls control={control} testId={T} />);

  const ids = [...screen.getByTestId(T).querySelectorAll("[data-testid]")].map((element) =>
    element.getAttribute("data-testid"),
  );
  expect(ids.filter((id) => id === `${T}-again` || id === `${T}-slow`)).toEqual([
    `${T}-again`,
    `${T}-slow`,
  ]);
});

test.each([
  ["normal", "Slow, off"],
  ["slow", "Slow, on"],
] as const)("AX1. 속도 %s에서 slow의 이름은 %s다", (pace, name) => {
  const { control } = controlStub({ pace });
  render(<ItemListenControls control={control} testId={T} />);

  expect(screen.getByTestId(`${T}-slow`)).toHaveAttribute("accessibility-label", name);
});
