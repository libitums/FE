import { describe, expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { MapUnitCell, MapUnitRow } from "./MapUnitRow";
import type { MapRowKind } from "./journey-map-rows";

// `ui` 계층: 줄 상자와 셀 상자가 속성과 자식을 어떻게 내는지만 봅니다. 줄을 어떻게 나누는지는
// unit(`journey-map-rows`)이 지고, 구획이 이 상자를 어떻게 쌓는지는 구획 테스트가 봅니다.
// 기기에서만 닫히는 것(낭독 순서 · 실제 정렬)은 이 파일의 몫이 아닙니다.

const kinds: readonly MapRowKind[] = ["pair", "solo", "orphan"];

const classesOf = (element: Element): string[] =>
  (element.getAttribute("class") ?? "").split(/\s+/).filter((name) => name !== "");

const accessibilityAttributes = (element: Element): [string, string][] =>
  Array.from(element.attributes)
    .filter((attribute) => attribute.name.startsWith("accessibility-"))
    .map((attribute) => [attribute.name, attribute.value]);

function renderRow(kind: MapRowKind): void {
  render(
    <MapUnitRow kind={kind}>
      <view data-testid="child-a" />
      {kind === "pair" ? <view data-testid="child-b" /> : null}
    </MapUnitRow>,
  );
}

describe("MapUnitRow", () => {
  test.each(kinds)(
    "UR1. %s 줄은 종류를 data-row-kind와 클래스로 내고 자식을 그대로 담는다",
    (kind) => {
      renderRow(kind);

      const row = screen.queryByTestId("journey-map-row");
      expect(row).not.toBeNull();
      expect(row?.getAttribute("data-row-kind")).toBe(kind);
      expect(classesOf(row as Element)).toEqual(
        expect.arrayContaining(["journey-map-row", `journey-map-row-${kind}`]),
      );
      expect(
        kinds.filter((other) => classesOf(row as Element).includes(`journey-map-row-${other}`)),
      ).toEqual([kind]);
      expect(row?.querySelector('[data-testid="child-a"]')).not.toBeNull();
      expect(row?.querySelector('[data-testid="child-b"]') !== null).toBe(kind === "pair");
    },
  );

  test.each(kinds)(
    "UR2. %s 줄 상자의 접근성 속성은 accessibility-element=false 하나뿐이다",
    (kind) => {
      renderRow(kind);

      const row = screen.queryByTestId("journey-map-row");
      expect(row).not.toBeNull();
      expect(accessibilityAttributes(row as Element)).toEqual([["accessibility-element", "false"]]);
    },
  );
});

describe("MapUnitCell", () => {
  test("UR3. 셀은 id와 testid를 지고 접근성 속성 없이 자식을 그대로 담는다", () => {
    render(
      <MapUnitCell domId="x" testKey="k">
        <view data-testid="cell-child" />
      </MapUnitCell>,
    );

    const cell = screen.queryByTestId("journey-map-cell-k");
    expect(cell).not.toBeNull();
    expect(cell?.getAttribute("id")).toBe("x");
    expect(accessibilityAttributes(cell as Element)).toEqual([]);
    expect(cell?.querySelector('[data-testid="cell-child"]')).not.toBeNull();
  });
});
