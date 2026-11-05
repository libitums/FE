import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";
import { catalogProps } from "./JourneyMapScreen.test-support";

// `ui` 계층 — 기기 측정(ADR-0106 후속): 셸이 그릴 때마다 지도에 새 `catalog` 객체(같은 내용 · 새 함수)를 넘겨 지도 본문
// (18편 전체)의 메모가 깨졌다 — 탭 전환마다 백그라운드 계산이 250 ~ 390 ms였다. 내용이 같으면 본문을 다시 그리지 않는다.

const slotRenders = vi.hoisted(() => ({
  count: 0,
  lastCatalog: null as null | { onStartCover: (id: string) => void },
}));
vi.mock("./JourneyMapCatalogSlot", () => ({
  JourneyMapCatalogSlot: (props: { catalog: { onStartCover: (id: string) => void } }) => {
    slotRenders.count += 1;
    slotRenders.lastCatalog = props.catalog;
    return null;
  },
}));

afterEach(() => {
  cleanup();
  slotRenders.count = 0;
});

/** 셸처럼 매번 새 객체 · 새 함수로 만든 같은 내용의 catalog입니다. */
const freshCatalog = (base: ReturnType<typeof catalogProps>) => ({
  ...base,
  progress: { ...base.progress },
  ticketUnits: { ...base.ticketUnits },
  onStartCover: (id: string) => base.onStartCover(id),
  onStartUnit: (id: string, key: string) => base.onStartUnit(id, key),
});

test("BM1. 같은 내용의 새 catalog 객체로 다시 그리면 지도 본문을 다시 그리지 않는다", () => {
  const base = catalogProps({ progress: { "u01-water": ["intro"] } });
  const view = render(<JourneyMapScreen catalog={freshCatalog(base)} />);
  const afterMount = slotRenders.count;

  act(() => {
    view.rerender(<JourneyMapScreen catalog={freshCatalog(base)} />);
  });
  act(() => {
    view.rerender(<JourneyMapScreen catalog={freshCatalog(base)} active={false} />);
  });

  expect(slotRenders.count).toBe(afterMount);
});

test("BM2. 진행이 실제로 바뀌면 본문을 다시 그린다", () => {
  const base = catalogProps({ progress: { "u01-water": ["intro"] } });
  const view = render(<JourneyMapScreen catalog={freshCatalog(base)} />);
  const afterMount = slotRenders.count;

  act(() => {
    view.rerender(
      <JourneyMapScreen
        catalog={freshCatalog({ ...base, progress: { "u01-water": ["intro", "S1"] } })}
      />,
    );
  });

  expect(slotRenders.count).toBeGreaterThan(afterMount);
});

test("BM3. 고정된 콜백은 늘 최신 함수를 부른다", () => {
  const base = catalogProps();
  const first = vi.fn();
  const second = vi.fn();
  const view = render(<JourneyMapScreen catalog={{ ...base, onStartCover: first }} />);
  act(() => {
    view.rerender(<JourneyMapScreen catalog={{ ...base, onStartCover: second }} />);
  });
  // 본문은 첫 그림의 catalog를 들고 있지만 콜백은 최신(second)을 가리켜야 합니다.
  slotRenders.lastCatalog?.onStartCover("u01-water");
  expect(second).toHaveBeenCalledWith("u01-water");
  expect(first).not.toHaveBeenCalled();
});
