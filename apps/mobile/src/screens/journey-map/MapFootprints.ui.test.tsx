import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";

import { MapFootprints } from "./MapFootprints";
import type { MapFootprintSegment } from "./map-footprints";

// `ui` 계층: 발자국 층이 구간의 발자국을 자리 · 방향대로 그리고, 「방금 끝낸」 구간만 등장 모션을 거는지 봅니다.
// 좌표 계산은 unit(`map-footprints.unit.test.ts`)이 집니다.

afterEach(() => {
  cleanup();
});

const segments: readonly MapFootprintSegment[] = [
  {
    from: "intro",
    to: "S1",
    prints: [
      { x: 100, y: 50, rotation: 206.4, flip: -1 },
      { x: 90, y: 70, rotation: 206.4, flip: 1 },
    ],
  },
  {
    from: "S1",
    to: "S2",
    prints: [
      { x: 150, y: 250, rotation: 90, flip: -1 },
      { x: 170, y: 260, rotation: 90, flip: 1 },
      { x: 190, y: 250, rotation: 90, flip: -1 },
    ],
  },
];

const printsOf = () => Array.from(document.querySelectorAll(".map-footprint"));
const bodiesOf = () => Array.from(document.querySelectorAll(".map-footprint-body"));

describe("MapFootprints", () => {
  test("MF1. 구간 둘(2 · 3개)의 발자국 다섯이 자리 · 방향 · 좌우대로 서고 층은 장식이다", () => {
    render(<MapFootprints episodeId="u01-water" segments={segments} enteringFrom={null} />);

    const layer = screen.getByTestId("map-footprints-u01-water");
    expect(layer).toHaveAttribute("accessibility-element", "false");
    expect(layer).toHaveAttribute("user-interaction-enabled", "false");
    const prints = printsOf();
    expect(prints).toHaveLength(5);
    expect(prints.map((p) => p.getAttribute("data-testid"))).toEqual([
      "map-footprint-u01-water-intro-0",
      "map-footprint-u01-water-intro-1",
      "map-footprint-u01-water-S1-0",
      "map-footprint-u01-water-S1-1",
      "map-footprint-u01-water-S1-2",
    ]);
    // 중심 (100, 50) · 12 × 14 → left 94 · top 43. 방향 206.4° · 왼발.
    const first = prints[0] as HTMLElement;
    expect(first.style.left).toBe("94px");
    expect(first.style.top).toBe("43px");
    expect(first.style.transform).toBe("rotate(206.4deg) scaleX(-1)");
    expect((prints[1] as HTMLElement).style.transform).toBe("rotate(206.4deg) scaleX(1)");
    expect(first.querySelector(".map-footprint-glyph")).not.toBeNull();
    // 정지 — 등장 클래스 · 지연 없음.
    for (const body of bodiesOf()) {
      expect(body).not.toHaveClass("map-footprint-enter");
      expect((body as HTMLElement).style.animationDelay).toBe("");
    }
  });

  test("MF2. enteringFrom = S1이면 S1→S2 구간만 등장 클래스 + 늘어나는 지연(d6, d6 + d2 …)", () => {
    render(<MapFootprints episodeId="u01-water" segments={segments} enteringFrom="S1" />);

    const bodies = bodiesOf() as HTMLElement[];
    expect(bodies.slice(0, 2).every((b) => !b.classList.contains("map-footprint-enter"))).toBe(
      true,
    );
    const entering = bodies.slice(2);
    expect(entering.every((b) => b.classList.contains("map-footprint-enter"))).toBe(true);
    const delays = entering.map((b) => Number.parseInt(b.style.animationDelay, 10));
    expect(delays[0]).toBeGreaterThan(0);
    expect(delays[1]).toBeGreaterThan(delays[0] ?? 0);
    expect(delays[2]).toBeGreaterThan(delays[1] ?? 0);
    expect((delays[2] ?? 0) - (delays[1] ?? 0)).toBe((delays[1] ?? 0) - (delays[0] ?? 0));
  });

  test("MF3. 움직임 줄이기에서는 등장 클래스 · 지연이 없다", () => {
    render(
      <MotionProvider motion="reduced">
        <MapFootprints episodeId="u01-water" segments={segments} enteringFrom="S1" />
      </MotionProvider>,
    );

    expect(printsOf()).toHaveLength(5);
    for (const body of bodiesOf()) {
      expect(body).not.toHaveClass("map-footprint-enter");
      expect((body as HTMLElement).style.animationDelay).toBe("");
    }
  });

  test("MF4. 구간이 없으면 층만 비어 있다", () => {
    render(<MapFootprints episodeId="u01-water" segments={[]} enteringFrom={null} />);
    expect(screen.getByTestId("map-footprints-u01-water")).toBeInTheDocument();
    expect(printsOf()).toHaveLength(0);
  });
});
