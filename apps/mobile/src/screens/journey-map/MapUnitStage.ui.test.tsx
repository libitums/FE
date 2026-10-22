import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { MapUnitEntranceProvider, MapUnitStage } from "./MapUnitStage";
import { mapUnitBurstRayCount, type SheetEntranceMotion } from "./journey-map-sheet-motion";

// `ui` 계층: 노드 무대가 열린 노드에만 튕김 · 반짝임을 붙이는지, 측정 상자를 건드리지 않는지 봅니다. 단계 파생의 값은
// unit이 집니다.

afterEach(() => {
  cleanup();
});

const A = "catalog:u01-water:S1";
const B = "catalog:u01-water:S2";

function map(entrance: SheetEntranceMotion) {
  return (
    <MapUnitEntranceProvider value={{ targetId: A, entrance }}>
      <view data-testid="cell-a">
        <MapUnitStage targetId={A}>
          <view data-testid="mark-a" />
        </MapUnitStage>
      </view>
      <view data-testid="cell-b">
        <MapUnitStage targetId={B}>
          <view data-testid="mark-b" />
        </MapUnitStage>
      </view>
      <view data-testid="cell-none">
        <MapUnitStage targetId={null}>
          <view data-testid="mark-none" />
        </MapUnitStage>
      </view>
    </MapUnitEntranceProvider>
  );
}

const popOf = (markId: string): HTMLElement | null => screen.getByTestId(markId).parentElement;
const classOf = (element: Element | null): string => element?.getAttribute("class") ?? "";
const burstIn = (cellId: string): Element | null =>
  screen.getByTestId(cellId).querySelector(".journey-step-node-burst");
const count = (selector: string): number => document.querySelectorAll(selector).length;

describe("MapUnitStage 열린 노드만", () => {
  test("NS1. awaiting: 열린 노드의 튕김 래퍼에만 등장 클래스가 붙고 반짝임은 없다", () => {
    render(map("awaiting"));

    expect(classOf(popOf("mark-a"))).toBe("journey-step-node-pop journey-step-node-pop-enter");
    expect(classOf(popOf("mark-b"))).toBe("journey-step-node-pop");
    expect(classOf(popOf("mark-none"))).toBe("journey-step-node-pop");
    expect(count(".journey-step-node-burst")).toBe(0);
  });

  test("NS1. expressive: 열린 노드에만 튕김과 반짝임 묶음이 하나 선다", () => {
    render(map("expressive"));

    expect(classOf(popOf("mark-a"))).toBe("journey-step-node-pop journey-step-node-pop-enter");
    expect(classOf(popOf("mark-b"))).toBe("journey-step-node-pop");
    expect(classOf(popOf("mark-none"))).toBe("journey-step-node-pop");
    expect(count(".journey-step-node-burst")).toBe(1);
    expect(burstIn("cell-a")).not.toBeNull();
    expect(burstIn("cell-b")).toBeNull();
    expect(burstIn("cell-none")).toBeNull();
  });

  test("NS1. 반짝임 묶음: 후광 하나, 축 8개(0 ~ 315도), 조각은 짝수 사각 · 홀수 원", () => {
    render(map("expressive"));

    const burst = burstIn("cell-a");
    expect(burst?.querySelectorAll(".journey-step-node-halo")).toHaveLength(1);
    const rays = Array.from(burst?.querySelectorAll(".journey-step-node-ray") ?? []);
    expect(rays).toHaveLength(mapUnitBurstRayCount);
    rays.forEach((ray, index) => {
      expect(ray.getAttribute("style")).toContain(`rotate(${String(index * 45)}deg)`);
      const spark = ray.querySelector(".journey-step-node-spark");
      expect(spark).not.toBeNull();
      const shape =
        index % 2 === 0 ? "journey-step-node-spark-square" : "journey-step-node-spark-round";
      expect(classOf(spark)).toContain(shape);
    });
  });

  test("NS2. 대기에서 등장으로 바뀌어도 튕김 래퍼는 같은 노드이고 클래스도 같다", () => {
    const view = render(map("awaiting"));
    const pop = popOf("mark-a");
    const before = classOf(pop);

    view.rerender(map("expressive"));

    expect(popOf("mark-a")).toBe(pop);
    expect(classOf(popOf("mark-a"))).toBe(before);
    expect(before).toContain("journey-step-node-pop-enter");
  });

  test.each(["fade", "none"] as const)(
    "NS3. %s: 어느 노드에도 튕김 · 반짝임이 없다",
    (entrance) => {
      render(map(entrance));

      expect(count(".journey-step-node-pop-enter")).toBe(0);
      expect(count(".journey-step-node-burst")).toBe(0);
      expect(count(".journey-step-node-pop")).toBe(3);
    },
  );

  test("NS3. Provider 밖에서는 모션 없음이다", () => {
    render(
      <MapUnitStage targetId={A}>
        <view data-testid="mark-a" />
      </MapUnitStage>,
    );

    expect(classOf(popOf("mark-a"))).toBe("journey-step-node-pop");
    expect(count(".journey-step-node-burst")).toBe(0);
  });

  test("NS4. 무대 > [반짝임, 튕김 > 표식] 순서이고 장식은 접근성 트리에 오르지 않는다", () => {
    render(map("expressive"));

    const pop = popOf("mark-a");
    const stage = pop?.parentElement ?? null;
    expect(classOf(stage)).toContain("journey-step-node-stage");
    const kids = Array.from(stage?.children ?? []);
    expect(kids.map(classOf)).toEqual([
      "journey-step-node-burst",
      "journey-step-node-pop journey-step-node-pop-enter",
    ]);
    const burst = burstIn("cell-a");
    expect(burst).not.toBeNull();
    for (const part of [burst, ...Array.from(burst?.querySelectorAll("*") ?? [])]) {
      const names = Array.from(part?.attributes ?? []).map((attribute) => attribute.name);
      expect(names.filter((name) => name.startsWith("accessibility-"))).toEqual([]);
      expect(part?.getAttribute("user-interaction-enabled")).toBe("false");
    }
    expect(count("[accessibility-elements-hidden]")).toBe(0);
  });
});
