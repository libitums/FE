import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { JourneyMapScreen, type JourneyMapScreenProps } from "./JourneyMapScreen";
import type { CatalogProgress } from "../../lib/catalog-progress";
import { tutorialDoneProgress } from "../../app/test-helpers/progress-seed";
import type { CatalogMapSection, JourneyMapCatalogProps } from "./catalog-map.contract";
import type { JourneyMapProgressLoad } from "./journey-map-load.contract";
import { realSections } from "./JourneyMapScreen.tutorial-u00.test-support";

// `ui` 계층: 맵 화면이 progressLoad를 노드 상태와 로딩 줄로 옮기는지 봅니다. 상태 전이 · 덮기 규칙은
// unit이 지므로 여기서는 렌더 결과(data-status · 줄 · 콜백)만 봅니다. 맵은 내장 카탈로그(u00 ~ u03)입니다.

afterEach(() => {
  cleanup();
});

function handlers() {
  return {
    onStartCover: vi.fn<(episodeId: string) => void>(),
    onStartUnit: vi.fn<(episodeId: string, unitKey: string) => void>(),
  };
}
type Handlers = ReturnType<typeof handlers>;

const pendingSection: CatalogMapSection = {
  kind: "catalog-unavailable",
  episodeId: "u09-later",
  ordinal: 9,
  title: "Later",
  reason: "pending",
};

function catalogOf(
  h: Handlers,
  withUnavailable = false,
  progress: CatalogProgress = {},
): JourneyMapCatalogProps {
  return {
    sections: withUnavailable ? [...realSections, pendingSection] : realSections,
    progress,
    legacyTutorialPassed: false,
    onStartCover: h.onStartCover,
    onStartUnit: h.onStartUnit,
  };
}

type Overrides = Partial<JourneyMapScreenProps>;

function mapScreen(h: Handlers, overrides: Overrides = {}) {
  return <JourneyMapScreen catalog={catalogOf(h)} {...overrides} />;
}

// 레슨은 `LearningUnit`, 스페셜은 `SpecialUnit`이 그립니다 — 둘 다 루트에만 `data-status`가 있습니다.
const nodeSelector =
  '[data-testid^="ui-lynx-learning-unit-"][data-status], [data-testid^="ui-lynx-special-unit-"][data-status]';
const nodes = (): Element[] =>
  Array.from(screen.getByTestId("journey-map-screen").querySelectorAll(nodeSelector));
const statusOf = (testId: string): string | null =>
  screen.getByTestId(testId).getAttribute("data-status");

const coverId = (id: string) => `ui-lynx-special-unit-catalog-cover-${id}`;
const unitId = (id: string, key: string) =>
  `ui-lynx-${key === "RP" ? "special" : "learning"}-unit-catalog-unit-${id}-${key}`;
// 첫 구획(내장 튜토리얼)의 표지입니다.
const intro = coverId("u00-tutorial");

function expectEveryNode(status: string): void {
  const all = nodes();
  // 구획마다 표지 · 레슨 · 최종이 있습니다 — 비어 있으면 아래 단언이 헛돕니다.
  expect(all.length).toBeGreaterThanOrEqual(15);
  for (const node of all) {
    expect(node.getAttribute("data-status")).toBe(status);
  }
}

describe("JourneyMapScreen progressLoad — 확인 중", () => {
  test("MN1. checking이면 표지 · 레슨 · 최종 노드 전부가 checking이고 누를 수 없다", () => {
    render(mapScreen(handlers(), { progressLoad: { status: "checking" } }));

    expect(statusOf(intro)).toBe("checking");
    expect(statusOf(unitId("u00-tutorial", "S1"))).toBe("checking");
    expect(statusOf(unitId("u00-tutorial", "RP"))).toBe("checking");
    expect(statusOf(coverId("u01-water"))).toBe("checking");
    expect(statusOf(unitId("u01-water", "S1"))).toBe("checking");
    expect(statusOf(unitId("u01-water", "RP"))).toBe("checking");
    expectEveryNode("checking");
    for (const node of nodes()) {
      expect(node).toHaveAttribute("accessibility-traits", "disabled");
    }
  });

  test("MN2. checking에서 모든 노드를 탭해도 시작 콜백이 하나도 불리지 않고 말풍선도 안 열린다", () => {
    const h = handlers();
    render(mapScreen(h, { progressLoad: { status: "checking" } }));

    for (const node of nodes()) {
      fireEvent.tap(node, {});
    }

    for (const spy of Object.values(h)) {
      expect(spy).not.toHaveBeenCalled();
    }
    expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  });

  test("MN3. checking에는 로딩 줄이 없다", () => {
    render(mapScreen(handlers(), { progressLoad: { status: "checking" } }));

    expect(screen.queryByTestId("journey-progress-load-row")).not.toBeInTheDocument();
  });

  test("MN4. loading이면 줄이 loading으로 서고 노드는 여전히 checking이다", () => {
    render(mapScreen(handlers(), { progressLoad: { status: "loading" } }));

    expect(screen.getByTestId("journey-progress-load-row")).toHaveAttribute(
      "data-status",
      "loading",
    );
    expectEveryNode("checking");
  });

  test("MN7. checking에서 known + 진행으로 바뀌면 같은 노드가 진행대로 채워진다", () => {
    const h = handlers();
    const { rerender } = render(mapScreen(h, { progressLoad: { status: "checking" } }));
    const cover = screen.getByTestId(intro);

    rerender(
      mapScreen(h, {
        progressLoad: { status: "known" },
        catalog: catalogOf(h, false, { "u00-tutorial": ["intro", "S1"] }),
      }),
    );

    expect(screen.getByTestId(intro)).toBe(cover);
    expect(statusOf(intro)).toBe("clear");
    expect(statusOf(unitId("u00-tutorial", "S1"))).toBe("clear");
    expect(statusOf(unitId("u00-tutorial", "S2"))).toBe("available");
    expect(statusOf(unitId("u00-tutorial", "S3"))).toBe("default");
  });

  test("MN8. (§20) checking에서는 노드를 눌러도 말풍선이 없으니 머리 띠가 없다 (자리 막대도 없다)", () => {
    render(mapScreen(handlers(), { progressLoad: { status: "checking" } }));

    expect(screen.queryByTestId("ui-lynx-episode-header")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("ui-lynx-episode-header-count-placeholder"),
    ).not.toBeInTheDocument();
    fireEvent.tap(screen.getByTestId(unitId("u00-tutorial", "S1")), {});
    expect(screen.queryByTestId("ui-lynx-episode-header")).not.toBeInTheDocument();
  });

  test("MN8. (§20) loading에도 말풍선이 없으면 띠가 없고, 줄은 띠 자리 위 여백 없이 선다", () => {
    render(mapScreen(handlers(), { progressLoad: { status: "loading" } }));

    expect(screen.queryByTestId("ui-lynx-episode-header")).not.toBeInTheDocument();
    const rowBox = screen.getByTestId("journey-progress-load-row").parentElement as Element;
    expect(rowBox.getAttribute("style") ?? "").not.toMatch(/margin-top:\s*[1-9]/);
  });

  test("MN9. 준비 중 카탈로그 구획의 DOM은 checking이어도 known과 같다", () => {
    const h = handlers();
    const withCatalog = (progressLoad: JourneyMapProgressLoad) =>
      mapScreen(h, { catalog: catalogOf(h, true), progressLoad });
    const known = render(withCatalog({ status: "known" }));
    const knownHtml = screen.getByTestId("catalog-pending-u09-later").outerHTML;
    known.unmount();

    render(withCatalog({ status: "checking" }));

    expect(screen.getByTestId("catalog-pending-u09-later").outerHTML).toBe(knownHtml);
  });

  test.each(["checking", "loading"] as const)(
    "MN10. %s와 첫 유닛 안내가 함께 서도 서로를 깨지 않는다",
    (status) => {
      render(
        <FirstUnitGuideProvider enabled>
          {mapScreen(handlers(), { progressLoad: { status } })}
        </FirstUnitGuideProvider>,
      );

      expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();
      expect(statusOf(intro)).toBe("checking");
      expect(screen.queryByTestId("journey-progress-load-row") === null).toBe(
        status === "checking",
      );
    },
  );
});

describe("JourneyMapScreen progressLoad — 실패 · 재시도", () => {
  test("MN5. failed면 줄이 failed이고 버튼이 onRetry를 부른다", () => {
    const onRetry = vi.fn<() => void>();
    render(mapScreen(handlers(), { progressLoad: { status: "failed", onRetry } }));

    expect(screen.getByTestId("journey-progress-load-row")).toHaveAttribute(
      "data-status",
      "failed",
    );
    const button = screen
      .getByTestId("journey-progress-load-row-retry")
      .querySelector('[data-testid="ui-lynx-button"]');
    fireEvent.tap(button!, {});

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("MN5(§18). failed에서는 노드가 열린다 — 씨앗이면 첫 구획의 표지만 available, 나머지 locked", () => {
    const h = handlers();
    render(mapScreen(h, { progressLoad: { status: "failed", onRetry: vi.fn<() => void>() } }));

    expect(statusOf(intro)).toBe("available");
    for (const node of nodes()) {
      if (node === screen.getByTestId(intro)) continue;
      expect(node.getAttribute("data-status")).toBe("default");
    }
    fireEvent.tap(screen.getByTestId(intro), {});
    expect(h.onStartCover).toHaveBeenCalledWith("u00-tutorial");
  });

  test("MN11. failed 줄이 선 채 말풍선이 열리면 재시도 버튼이 낭독에서 가려진다", () => {
    const h = handlers();
    render(
      mapScreen(h, {
        catalog: catalogOf(h, false, { "u00-tutorial": ["intro"] }),
        progressLoad: { status: "failed", onRetry: vi.fn<() => void>() },
      }),
    );
    const retry = () => screen.getByTestId("journey-progress-load-row-retry");
    expect(retry()).toHaveAttribute("accessibility-elements-hidden", "false");

    fireEvent.tap(screen.getByTestId(unitId("u00-tutorial", "S1")), {});

    expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
    expect(retry()).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("MN5(§18). retrying이면 줄은 loading으로 그려지고 노드는 열려 있다", () => {
    const h = handlers();
    render(mapScreen(h, { progressLoad: { status: "retrying" } }));

    expect(screen.getByTestId("journey-progress-load-row")).toHaveAttribute(
      "data-status",
      "loading",
    );
    expect(statusOf(intro)).toBe("available");
    expect(nodes().some((node) => node.getAttribute("data-status") === "checking")).toBe(false);
    fireEvent.tap(screen.getByTestId(intro), {});
    expect(h.onStartCover).toHaveBeenCalledTimes(1);
  });
});

describe("JourneyMapScreen progressLoad — 가드", () => {
  const tables: readonly (readonly [string, CatalogProgress])[] = [
    ["빈 씨앗", {}],
    ["표지 + 첫 레슨", { "u00-tutorial": ["intro", "S1"] }],
    ["튜토리얼 전부 완료", tutorialDoneProgress()],
  ];

  test.each(tables)(
    "MN6. %s — progressLoad를 생략한 것과 known의 DOM이 같다",
    (_name, progress) => {
      const h = handlers();
      const omitted = render(mapScreen(h, { catalog: catalogOf(h, false, progress) }));
      const omittedHtml = screen.getByTestId("journey-map-screen").outerHTML;
      omitted.unmount();

      render(
        mapScreen(h, {
          catalog: catalogOf(h, false, progress),
          progressLoad: { status: "known" },
        }),
      );

      expect(screen.getByTestId("journey-map-screen").outerHTML).toBe(omittedHtml);
      expect(screen.queryByTestId("journey-progress-load-row")).not.toBeInTheDocument();
      expect(nodes().some((node) => node.getAttribute("data-status") === "checking")).toBe(false);
    },
  );

  test("MN6. 상태 표 — 빈 씨앗은 표지만 available, 표지 + 첫 레슨은 앞 둘 clear · 셋째 available", () => {
    const h = handlers();
    const empty = render(mapScreen(h));
    expect(statusOf(intro)).toBe("available");
    expect(statusOf(unitId("u00-tutorial", "S1"))).toBe("default");
    empty.unmount();

    render(mapScreen(h, { catalog: catalogOf(h, false, tables[1]?.[1] ?? {}) }));
    expect(statusOf(intro)).toBe("clear");
    expect(statusOf(unitId("u00-tutorial", "S1"))).toBe("clear");
    expect(statusOf(unitId("u00-tutorial", "S2"))).toBe("available");
  });
});
