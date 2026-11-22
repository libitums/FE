import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { backHandlers } from "../../lib/back-handler";
import { READY_SETTLE_MS } from "./entry-basics-motion";
import { EntryBasicsReadyScreen } from "./EntryBasicsReadyScreen";
import { entryBasicsTestIds as ids } from "./entry-basics.contract";

// `ui` 계층: 준비 완료 — 가 · 너 · 도 → 너도 가?(ADR-0176).

let announced: string[];

beforeEach(() => {
  vi.useFakeTimers();
  announced = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }) => void announced.push(args.content),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(motion: "standard" | "reduced" = "standard", planeUrl: string | null = "plane") {
  const onNext = vi.fn();
  const onBack = vi.fn();
  const ui = () => (
    <MotionProvider motion={motion}>
      <EntryBasicsReadyScreen
        safeArea={{ top: 59, bottom: 34 }}
        planeUrl={planeUrl}
        onNext={onNext}
        onBack={onBack}
      />
    </MotionProvider>
  );
  const { container, rerender } = render(ui());
  return { container, rerender: () => rerender(ui()), onNext, onBack };
}

const root = () => screen.getByTestId(ids.ready);
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const sentence = "너도 가? “Are you going, too?”";

test("BR1. 3/3 막대 · header 제목 · 문장 순서의 세 칸 · 문장은 한 요소로 읽힌다", () => {
  mount();
  expect(screen.getByTestId(ids.progress)).toHaveAttribute("accessibility-label", "Step 3 of 3");
  expect(screen.getByTestId(ids.title)).toHaveTextContent("You just read Korean!");
  expect(screen.getByTestId(ids.title)).toHaveAttribute("accessibility-traits", "header");
  expect([0, 1, 2].map((i) => screen.getByTestId(ids.word(i)).textContent)).toEqual([
    "neo너",
    "do도",
    "ga가",
  ]);
  expect(screen.getByTestId(ids.sentence)).toHaveAttribute("accessibility-label", sentence);
  expect(screen.getByTestId(ids.meaning)).toHaveAttribute("accessibility-element", "false");
});

test("BR2. 재배열 전에는 moving, 끝나면 settled", () => {
  mount();
  expect(root()).toHaveAttribute("data-phase", "moving");
  advance(READY_SETTLE_MS - 1);
  expect(root()).toHaveAttribute("data-phase", "moving");
  advance(1);
  expect(root()).toHaveAttribute("data-phase", "settled");
});

test("BR3. 문장 낭독은 재배열 뒤 한 번 — 다시 그려도 늘지 않는다", () => {
  const { rerender } = mount();
  expect(announced).toEqual([]);
  advance(READY_SETTLE_MS);
  expect(announced).toEqual([sentence]);
  rerender();
  advance(READY_SETTLE_MS * 2);
  expect(announced).toEqual([sentence]);
});

test("BR4. 동작 줄이기면 처음부터 끝 모습이고 낭독도 한 번", () => {
  mount("reduced");
  advance(0);
  expect(root()).toHaveAttribute("data-phase", "settled");
  expect(root()).toHaveAttribute("data-motion", "reduced");
  expect(announced).toEqual([sentence]);
});

test("BR5. 단추는 움직이는 동안에도 눌리고 한 번만 나간다", () => {
  const { onNext } = mount();
  const button = within(screen.getByTestId(ids.next)).getByTestId("ui-lynx-button");
  expect(button).toHaveAttribute("accessibility-label", "Yes, let’s go");
  act(() => {
    fireEvent.tap(button, {});
    fireEvent.tap(button, {});
  });
  expect(onNext).toHaveBeenCalledTimes(1);
});

test("BR6. 움직이는 사이 떠나면 낭독하지 않는다", () => {
  mount();
  cleanup();
  advance(READY_SETTLE_MS * 2);
  expect(announced).toEqual([]);
});

test("BR7. 그림은 장식이고, 주소가 없으면 그림 없이 선다", () => {
  mount();
  const plane = screen.getByTestId(ids.plane);
  expect(plane).toHaveAttribute("src", "plane");
  expect(plane.closest('[accessibility-elements-hidden="true"]')).not.toBeNull();
  cleanup();

  mount("standard", null);
  expect(screen.queryByTestId(ids.plane)).not.toBeInTheDocument();
  expect(screen.getByTestId(ids.next)).toBeInTheDocument();
});

test("BR8. 가장자리는 내용이 피하고 바탕은 끝까지 간다", () => {
  const { container } = mount();
  const inner = container.querySelector(".entry-basics-ready-inner");
  expect(inner?.getAttribute("style")).toContain("59px");
  expect(inner?.getAttribute("style")).toContain("34px");
  expect(root().getAttribute("style") ?? "").not.toContain("59px");
});

test("BR9. 시스템 뒤로는 한 칸", () => {
  const { onBack } = mount();
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(onBack).toHaveBeenCalledTimes(1);
});
