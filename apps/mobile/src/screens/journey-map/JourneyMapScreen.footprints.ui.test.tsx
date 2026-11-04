import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { CATALOG_INTRO_KEY } from "../../lib/catalog-progress";
import { catalogSectionDomId } from "./catalog-map";
import { catalogMarkDomId } from "./map-footprints";
import { forgetMapCleared, rememberMapCleared } from "./journey-map-cleared-memory";
import {
  catalogProps,
  catalogReadySections,
  mapScreen,
  stubHost,
  type Rect,
} from "./JourneyMapScreen.test-support";

// `ui` 계층: 맵 화면이 끝낸 구간의 끝점 셀을 재고 발자국 층을 세우는지, 「방금 끝낸 유닛」 기억이 그 구간에만
// 등장 모션을 거는지 봅니다. 좌표 계산은 unit, 층 렌더는 `MapFootprints.ui.test.tsx`가 집니다.

afterEach(() => {
  cleanup();
  forgetMapCleared();
  vi.restoreAllMocks();
});

const u01 = "u01-water";
const sel = (id: string) => `#${id}`;
const sectionSel = sel(catalogSectionDomId(u01));
const cellSel = (key: string) => sel(catalogMarkDomId(u01, key));

// 두 열 맵의 실제 비슷한 자리 — 구획 (16, 400) · 표지 표식(halo 124) 가운데 · 레슨 표식(링 100) 두 칸 가운데.
const rects: Record<string, Rect> = {
  [sectionSel]: { left: 16, top: 400, width: 358, height: 900 },
  [cellSel(CATALOG_INTRO_KEY)]: { left: 133, top: 460, width: 124, height: 124 },
  [cellSel("S1")]: { left: 51.5, top: 644, width: 100, height: 100 },
  [cellSel("S3")]: { left: 238.5, top: 644, width: 100, height: 100 },
  [cellSel("S4")]: { left: 51.5, top: 788, width: 100, height: 100 },
};

const printsOf = (episodeId: string) =>
  Array.from(
    screen
      .getByTestId(`map-footprints-${episodeId}`)
      .querySelectorAll(`[data-testid^="map-footprint-${episodeId}-"]`),
  );

describe("JourneyMapScreen 발자국", () => {
  test("JMF1. intro · S1을 끝낸 구획은 구획 · 끝점 표식을 재고 두 구간의 발자국이 선다", () => {
    const host = stubHost({ rects });
    const catalog = catalogProps({ progress: { [u01]: [CATALOG_INTRO_KEY, "S1"] } });
    render(mapScreen({ catalog }));

    const measured = host.measured();
    expect(measured).toEqual(
      expect.arrayContaining([
        sectionSel,
        cellSel(CATALOG_INTRO_KEY),
        cellSel("S1"),
        cellSel("S3"),
      ]),
    );
    // 끝점이 아닌 S4는 재지 않는다.
    expect(measured).not.toContain(cellSel("S4"));
    const prints = printsOf(u01);
    expect(prints.length).toBeGreaterThanOrEqual(4);
    const introPrints = prints.filter((p) =>
      (p.getAttribute("data-testid") ?? "").startsWith(`map-footprint-${u01}-intro-`),
    );
    const s1Prints = prints.filter((p) =>
      (p.getAttribute("data-testid") ?? "").startsWith(`map-footprint-${u01}-S1-`),
    );
    expect(introPrints.length).toBeGreaterThanOrEqual(2);
    expect(s1Prints).toHaveLength(4);
    // 구획 원점(16, 400)을 뺀 자리 — S1 → S3 가로 구간은 y = 644 + 50 − 400 ± 5 − 7.
    const horizontal = s1Prints[0] as HTMLElement;
    expect(horizontal.style.top).toBe(`${644 + 50 - 400 - 5 - 7}px`);
    expect(horizontal.style.transform).toBe("rotate(90deg) scaleX(-1)");
    // 다른 구획은 끝낸 유닛이 없어 비어 있다.
    expect(printsOf("u02-checkin")).toHaveLength(0);
    // 기억이 없으니 등장 모션도 없다.
    expect(document.querySelector(".map-footprint-enter")).toBeNull();
  });

  test("JMF2. 끝낸 유닛이 없으면 재지 않고 층이 비어 있다", () => {
    const host = stubHost({ rects });
    render(mapScreen({ catalog: catalogProps() }));

    expect(host.measured().filter((s) => s.includes("journey-map-mark-"))).toEqual([]);
    for (const section of catalogReadySections) {
      expect(printsOf(section.episodeId)).toHaveLength(0);
    }
  });

  test("JMF3. 구획 자리를 못 재면 발자국이 없다(실패가 아니다)", () => {
    stubHost({ rects, measurable: false });
    const catalog = catalogProps({ progress: { [u01]: [CATALOG_INTRO_KEY, "S1"] } });
    render(mapScreen({ catalog }));

    expect(printsOf(u01)).toHaveLength(0);
  });

  test("JMF4. 방금 끝낸 유닛(S1)을 기억한 채 서면 S1→S3 구간만 등장 모션이고 기억은 비워진다", () => {
    stubHost({ rects });
    rememberMapCleared(u01, "S1");
    const catalog = catalogProps({ progress: { [u01]: [CATALOG_INTRO_KEY, "S1"] } });
    render(mapScreen({ catalog }));

    const entering = Array.from(document.querySelectorAll(".map-footprint-enter"));
    expect(entering).toHaveLength(4);
    for (const body of entering) {
      expect(body.closest("[data-testid^='map-footprint-u01-water-S1-']")).not.toBeNull();
    }

    cleanup();
    stubHost({ rects });
    render(mapScreen({ catalog }));
    expect(document.querySelector(".map-footprint-enter")).toBeNull();
  });

  test("JMF5. 미뤄 둔 측정 답이 오면 그때 발자국이 선다", () => {
    const host = stubHost({ rects });
    host.defer = (selector) => selector === sectionSel;
    const catalog = catalogProps({ progress: { [u01]: [CATALOG_INTRO_KEY] } });
    render(mapScreen({ catalog }));

    expect(printsOf(u01)).toHaveLength(0);
    act(() => {
      host.flush();
    });
    expect(printsOf(u01).length).toBeGreaterThanOrEqual(2);
  });
});
