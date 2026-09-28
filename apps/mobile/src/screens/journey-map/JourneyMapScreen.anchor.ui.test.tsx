import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";
import { initialCompletedStepCount } from "./journey-map";

// `ui` 계층: 말풍선이 탭 좌표가 아니라 **잰 유닛 자리**에 서는지, 그리고 스크롤이 계산한
// 목적지로 가는지를 봅니다. 호스트의 질의는 jsdom에 없으므로 여기서 대역을 세웁니다 —
// 재는 값은 이 파일이 정하고, 화면이 그 값으로 무엇을 하는지만 단언합니다.

type Invocation = {
  readonly selector: string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
};

const rects: Record<string, { top: number; height: number }> = {
  "#journey-step-node-ordering": { top: 700, height: 124 },
  "#journey-map-screen-scroll": { top: 60, height: 800 },
  "#journey-map-screen": { top: 0, height: 900 },
};

function stubSelectorQuery(measurable: boolean): Invocation[] {
  const invocations: Invocation[] = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (options: {
            method: string;
            params?: Record<string, unknown>;
            success?: (res: unknown) => void;
            fail?: (res: unknown) => void;
          }) => ({
            exec: () => {
              invocations.push({ selector, method: options.method, params: options.params });
              if (options.method !== "boundingClientRect") {
                return;
              }
              if (measurable) {
                options.success?.(rects[selector]);
              } else {
                options.fail?.({ code: 5 });
              }
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
  return invocations;
}

function renderMap(): void {
  render(
    <JourneyMapScreen
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={() => {}}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={() => {}}
      onOpenNotifications={() => {}}
    />,
  );
}

function sheetTop(): string | null {
  return screen.getByTestId("step-sheet-panel").parentElement?.getAttribute("style") ?? null;
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("말풍선이 탭 좌표가 아니라 잰 유닛의 아래 모서리 밑에 선다", () => {
  stubSelectorQuery(true);
  renderMap();

  // 손가락이 유닛의 위쪽 끝을 눌렀습니다 — 탭 좌표만 믿으면 말풍선이 유닛에 걸칩니다.
  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), { detail: { y: 705 } });
  });

  // 유닛 아래 모서리 800 + 간격 8입니다. 끝(900 − 68 − 16 − 250 = 566)에 걸려 가둡니다 —
  // 스크롤이 유닛을 올리기 전의 자리입니다.
  expect(sheetTop()).toContain("566px");
});

test("유닛을 스크롤 가운데로 옮기고, 말풍선이 그 스크롤을 따라 유닛에 붙어 있다", () => {
  // `<scroll-view>`는 jsdom이 아는 태그라 요소를 그대로 넘기면 fireEvent가 거부합니다 —
  // NodesRef를 거칩니다. 대역을 세우기 전에 진짜 질의로 만들어 둡니다.
  renderMap();
  const scrollRef = lynx.createSelectorQuery().select("#journey-map-screen-scroll");
  const invocations = stubSelectorQuery(true);

  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), { detail: { y: 705 } });
  });

  // 유닛 중심 750을 가운데 460으로 — 스크롤 목적지는 290입니다.
  expect(invocations).toContainEqual({
    selector: "#journey-map-screen-scroll",
    method: "scrollTo",
    params: { offset: 290, smooth: true },
  });

  act(() => {
    fireEvent.scroll(scrollRef as unknown as Element, { detail: { scrollTop: 290 } });
  });

  // 유닛 아래 모서리는 이제 510에 있습니다.
  expect(sheetTop()).toContain("518px");
});

test("자리를 못 재면 탭 좌표로 서고 가운데 정렬을 호스트에 맡긴다", () => {
  const invocations = stubSelectorQuery(false);
  renderMap();

  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), { detail: { y: 750 } });
  });

  // 탭을 유닛 한가운데로 어림합니다: 750 + 반지름 50 + 간격 8.
  expect(sheetTop()).toContain("808px");
  expect(invocations).toContainEqual({
    selector: "#journey-step-node-ordering",
    method: "scrollIntoView",
    params: { scrollIntoViewOptions: { block: "center", behavior: "smooth" } },
  });
});
