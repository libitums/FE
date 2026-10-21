import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { catalogUnitDomId } from "./catalog-map";
import { catalogProps, mapScreen } from "./JourneyMapScreen.test-support";

// `ui` 계층: 말풍선이 탭 좌표가 아니라 **잰 유닛 자리**에 서는지, 그리고 스크롤이 계산한
// 목적지로 가는지를 봅니다. 호스트의 질의는 jsdom에 없으므로 여기서 대역을 세웁니다 —
// 재는 값은 이 파일이 정하고, 화면이 그 값으로 무엇을 하는지만 단언합니다.

type Invocation = {
  readonly selector: string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
};

type Rect = { top: number; height: number; left?: number; width?: number };

// 첫째 유닛(S1)은 아래쪽, 둘째 유닛(S3)은 위쪽에 선다고 잰 값입니다.
const nodeOf = (unitKey: string): string => `#${catalogUnitDomId("u01-water", unitKey)}`;
const unitTestId = (unitKey: string): string =>
  `ui-lynx-learning-unit-catalog-unit-u01-water-${unitKey}`;

const rects: Record<string, Rect> = {
  [nodeOf("S1")]: { top: 700, height: 124 },
  [nodeOf("S3")]: { top: 200, height: 124 },
  "#journey-map-screen-scroll": { top: 60, height: 800 },
  "#journey-map-screen": { top: 0, height: 900 },
};

// 재는 답을 미뤄 둔 자리입니다 — 답이 늦게 오는 상황을 테스트가 손으로 만듭니다.
let deferred: (() => void)[] = [];

function stubSelectorQuery(
  measurable: boolean,
  defer = false,
  table: Record<string, Rect> = rects,
  failing: readonly string[] = [],
): Invocation[] {
  const invocations: Invocation[] = [];
  deferred = [];
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
              const answer = () => {
                if (measurable && !failing.includes(selector)) {
                  options.success?.(table[selector]);
                } else {
                  options.fail?.({ code: 5 });
                }
              };
              if (defer) {
                deferred.push(answer);
              } else {
                answer();
              }
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
  return invocations;
}

function renderMap(): void {
  // 표지와 첫 레슨(S1)을 끝낸 진행으로 엽니다 — 열린 유닛이 없으면 말풍선이 열리지 않고, 이 파일이 보는 것
  // (잰 자리 · 스크롤 목적지)이 관찰되지 않습니다.
  render(mapScreen({ catalog: catalogProps({ progress: { "u01-water": ["intro", "S1"] } }) }));
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
    fireEvent.tap(screen.getByTestId(unitTestId("S1")), { detail: { y: 705 } });
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
    fireEvent.tap(screen.getByTestId(unitTestId("S1")), { detail: { y: 705 } });
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
    fireEvent.tap(screen.getByTestId(unitTestId("S1")), { detail: { y: 750 } });
  });

  // 탭을 유닛 한가운데로 어림합니다: 750 + 반지름 50 + 간격 8.
  expect(sheetTop()).toContain("808px");
  expect(invocations).toContainEqual({
    selector: nodeOf("S1"),
    method: "scrollIntoView",
    params: { scrollIntoViewOptions: { block: "center", behavior: "smooth" } },
  });
});

function flushDeferred(): void {
  act(() => {
    deferred.splice(0).forEach((answer) => answer());
  });
}

test("재는 사이에 말풍선이 닫히면 늦게 온 답이 화면을 스크롤하지 않는다", () => {
  const invocations = stubSelectorQuery(true, true);
  renderMap();

  act(() => {
    fireEvent.tap(screen.getByTestId(unitTestId("S1")), { detail: { y: 750 } });
  });
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  });
  flushDeferred();

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(invocations.filter((call) => call.method !== "boundingClientRect")).toEqual([]);
});

test("재는 사이에 다른 유닛을 누르면 옛 유닛의 답은 버리고 새 유닛으로만 스크롤한다", () => {
  const invocations = stubSelectorQuery(true, true);
  renderMap();

  act(() => {
    fireEvent.tap(screen.getByTestId(unitTestId("S1")), { detail: { y: 750 } });
  });
  act(() => {
    fireEvent.tap(screen.getByTestId(unitTestId("S3")), { detail: { y: 250 } });
  });
  flushDeferred();

  // 둘째 유닛의 중심 250을 가운데 460으로 — 위로는 더 못 가므로 목적지는 0입니다.
  expect(invocations.filter((call) => call.method !== "boundingClientRect")).toEqual([
    {
      selector: "#journey-map-screen-scroll",
      method: "scrollTo",
      params: { offset: 0, smooth: true },
    },
  ]);
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 2");
  // 둘째 유닛의 아래 모서리 300 + 간격 8입니다.
  expect(sheetTop()).toContain("308px");
});

// 머리 카드 회피(정정 2) — 낮은 화면: 화면 800 · 스크롤 상자 높이 400이면 가운데 정렬이 표식을 위 210에 세워
// 카드(아래 228) 뒤로 보냅니다. 카드 아래 + 24(252)에 세우는 목적지는 700 − 252 = 448입니다.
const headerId = "#journey-map-screen-header";
const nodeId = nodeOf("S1");
const shortTable = (stepLeft: number): Record<string, Rect> => ({
  ...rects,
  [nodeId]: { top: 700, height: 124, left: stepLeft, width: 100 },
  "#journey-map-screen-scroll": { top: 60, height: 400 },
  "#journey-map-screen": { top: 0, height: 800 },
  [headerId]: { top: 104, height: 124, left: 16, width: 151 },
});

const scrollToOf = (invocations: Invocation[]) =>
  invocations.filter((call) => call.method === "scrollTo");

// 이 파일의 표에는 대상 셀이 없어 맵을 열 때 자동 스크롤이 폴백으로 간다 — 말풍선의 폴백만 가려 봅니다.
const stepIntoViews = (invocations: Invocation[]) =>
  invocations.filter((call) => call.method === "scrollIntoView" && call.selector === nodeId);

function tapOrdering(): void {
  act(() => {
    fireEvent.tap(screen.getByTestId(unitTestId("S1")), { detail: { y: 750 } });
  });
}

test("SH5. 왼쪽 칸 스텝이 머리 카드 뒤에 서게 되면 카드 아래 + 24로 옮기고, 말풍선이 그 스크롤을 따라 유닛에 붙는다", () => {
  renderMap();
  const scrollRef = lynx.createSelectorQuery().select("#journey-map-screen-scroll");
  const invocations = stubSelectorQuery(true, false, shortTable(52));

  tapOrdering();

  expect(scrollToOf(invocations).map((call) => call.params)).toEqual([
    { offset: 448, smooth: true },
  ]);
  expect(stepIntoViews(invocations)).toEqual([]);

  act(() => {
    fireEvent.scroll(scrollRef as unknown as Element, { detail: { scrollTop: 448 } });
  });

  // 유닛 아래 모서리 800 − 448 + 간격 8.
  expect(sheetTop()).toContain("360px");
});

test("SH6. 오른쪽 칸 스텝은 카드와 안 겹쳐 가운데 정렬의 값(490) 그대로다", () => {
  const invocations = stubSelectorQuery(true, false, shortTable(240));
  renderMap();

  tapOrdering();

  expect(scrollToOf(invocations).map((call) => call.params)).toEqual([
    { offset: 490, smooth: true },
  ]);
});

test("SH6b. 카드가 재져도 넓은 화면은 가운데 정렬의 값(290)과 말풍선 자리(566px) 그대로다", () => {
  const invocations = stubSelectorQuery(true, false, {
    ...rects,
    [nodeId]: { top: 700, height: 124, left: 52, width: 100 },
    "#journey-map-screen-scroll": { top: 60, height: 800 },
    [headerId]: { top: 104, height: 124, left: 16, width: 151 },
  });
  renderMap();

  tapOrdering();

  expect(scrollToOf(invocations).map((call) => call.params)).toEqual([
    { offset: 290, smooth: true },
  ]);
  expect(sheetTop()).toContain("566px");
});

test.each([
  ["카드 rect가 없으면", shortTable(52), []],
  ["카드 질의만 실패하면", shortTable(52), [headerId]],
] as const)(
  "SH7. %s 가운데 정렬의 값(490)으로 서고 scrollIntoView 폴백으로 떨어지지 않는다",
  (_name, table, failing) => {
    const withoutCard: Record<string, Rect> = { ...table };
    if (failing.length === 0) {
      delete withoutCard[headerId];
    }
    const invocations = stubSelectorQuery(true, false, withoutCard, failing);
    renderMap();

    tapOrdering();

    expect(scrollToOf(invocations).map((call) => call.params)).toEqual([
      { offset: 490, smooth: true },
    ]);
    expect(stepIntoViews(invocations)).toEqual([]);
  },
);

test("MO1. 필수 셋과 카드의 질의를 한꺼번에 내서 답이 한 번의 flush에 다 와 스크롤이 나간다", () => {
  const invocations = stubSelectorQuery(true, true, shortTable(52));
  renderMap();

  const beforeTap = invocations.length;
  tapOrdering();

  // 답을 주기 전에 넷이 다 나가 있어야 한 번의 flush로 끝납니다(맵을 열 때의 자동 스크롤 질의는 뺍니다).
  const queried = invocations
    .slice(beforeTap)
    .filter((call) => call.method === "boundingClientRect")
    .map((call) => call.selector);
  expect(queried).toEqual(
    expect.arrayContaining([nodeId, "#journey-map-screen-scroll", "#journey-map-screen", headerId]),
  );
  flushDeferred();

  expect(scrollToOf(invocations).map((call) => call.params)).toEqual([
    { offset: 448, smooth: true },
  ]);
});

test("MO2. 필수 가운데 하나가 실패하면 카드가 재져도 지금과 같은 scrollIntoView 폴백이다", () => {
  const invocations = stubSelectorQuery(true, false, shortTable(52), [nodeId]);
  renderMap();

  tapOrdering();

  expect(scrollToOf(invocations)).toEqual([]);
  expect(stepIntoViews(invocations)).toEqual([
    {
      selector: nodeId,
      method: "scrollIntoView",
      params: { scrollIntoViewOptions: { block: "center", behavior: "smooth" } },
    },
  ]);
});
