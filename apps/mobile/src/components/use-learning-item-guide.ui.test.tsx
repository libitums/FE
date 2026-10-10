import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import type {
  LearningItemGuideState,
  LearningItemGuideSubject,
} from "../lib/learning-item-guide.contract";
import { stubGuideStorage } from "../lib/learning-item-guide.storage.test-support";
import { useLearningItemGuide } from "./use-learning-item-guide";

// `ui` 계층: 훅이 화면이 설 때 한 번 판정하고, 닫을 때 저장하는가. 훅을 부르는 탐침 컴포넌트로 봅니다.
// 저장소는 `NativeModules.StorageModule` 대역이고, 순수 함수 · 저장 접점은 대역하지 않습니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const target: LearningItemGuideSubject = { form: "sentence-order", chips: ["안녕하세요"] };
const other: LearningItemGuideSubject = { form: "sentence-order", chips: ["가", "나"] };

let latest: LearningItemGuideState = { visible: false };

function Probe({ subject }: { subject: LearningItemGuideSubject | null }) {
  const state = useLearningItemGuide(subject);
  latest = state;
  return <text data-testid="probe">{state.visible ? `visible:${state.kind}` : "hidden"}</text>;
}

const probeText = () => screen.getByTestId("probe").textContent;

function dismiss(): void {
  if (!latest.visible) throw new Error("훅이 떠 있지 않아 dismiss를 부를 수 없습니다");
  const { dismiss: run } = latest;
  act(() => run());
}

test("[UH1] 안 본 저장소 + 대상 입력이면 visible이고 kind가 그 종류다", () => {
  stubGuideStorage();
  render(<Probe subject={target} />);

  expect(probeText()).toBe("visible:sentence-order");
  expect(latest).toMatchObject({ visible: true, kind: "sentence-order" });
});

test("[UH2] 그 종류를 이미 봤으면 visible이 아니고 쓰기도 없다", () => {
  const double = stubGuideStorage({ seen: ["sentence-order"] });
  render(<Probe subject={target} />);

  expect(probeText()).toBe("hidden");
  expect(double.set).not.toHaveBeenCalled();
});

test("[UH3] 저장소가 없으면 visible이 아니다", () => {
  render(<Probe subject={target} />);

  expect(probeText()).toBe("hidden");
});

test("[UH4] 비대상 입력 · null이면 visible이 아니고 저장소를 읽지 않는다", () => {
  const double = stubGuideStorage();
  const view = render(<Probe subject={other} />);
  expect(probeText()).toBe("hidden");

  act(() => view.rerender(<Probe subject={null} />));
  expect(probeText()).toBe("hidden");
  expect(double.get).not.toHaveBeenCalled();
});

test("[UH5] dismiss는 내리고 그 종류를 적으며, 두 번 불러도 쓰기는 한 번이다", () => {
  const double = stubGuideStorage();
  render(<Probe subject={target} />);
  expect(probeText()).toBe("visible:sentence-order");
  const run = (latest as { dismiss: () => void }).dismiss;

  act(() => run());
  expect(probeText()).toBe("hidden");
  expect(double.savedKinds()).toEqual(["sentence-order"]);
  expect(double.guideWrites()).toHaveLength(1);

  act(() => run());
  expect(double.guideWrites()).toHaveLength(1);
});

test("[UH6] 떠 있는 채 비대상 입력으로 다시 그려도 떠 있고, 비대상으로 선 뒤 대상 입력이 와도 뜨지 않는다", () => {
  stubGuideStorage();
  const first = render(<Probe subject={target} />);
  act(() => first.rerender(<Probe subject={other} />));
  expect(probeText()).toBe("visible:sentence-order");

  first.unmount();
  cleanup();
  const second = render(<Probe subject={other} />);
  expect(probeText()).toBe("hidden");
  act(() => second.rerender(<Probe subject={target} />));
  expect(probeText()).toBe("hidden");
});

test("[UH7] 뜨기만 하고 언마운트하면 쓰지 않는다", () => {
  const double = stubGuideStorage();
  const view = render(<Probe subject={target} />);
  expect(probeText()).toBe("visible:sentence-order");

  view.unmount();

  expect(double.set).not.toHaveBeenCalled();
});

test("[UH8] 쓰기가 던져도 dismiss는 던지지 않고 내려간다", () => {
  stubGuideStorage({ setThrows: true });
  render(<Probe subject={target} />);
  expect(probeText()).toBe("visible:sentence-order");

  expect(() => dismiss()).not.toThrow();
  expect(probeText()).toBe("hidden");
});
