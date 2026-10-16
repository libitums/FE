import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import { JourneyMapScreen, type JourneyMapScreenProps } from "./JourneyMapScreen";
import { journeySteps } from "./journey-map";
import type { JourneyMapCatalogProps } from "./catalog-map.contract";
import type { JourneyMapProgressLoad } from "./journey-map-load.contract";

// `ui` 계층: 맵 화면이 progressLoad를 노드 상태와 로딩 줄로 옮기는지 봅니다. 상태 전이 · 덮기 규칙은
// unit이 지므로 여기서는 렌더 결과(data-status · 줄 · 콜백)만 봅니다.

afterEach(() => {
  cleanup();
});

const catalogIds = ["u01-water", "u02-checkin"] as const;
const lessonKeys = ["S1", "S3"];

function handlers() {
  return {
    onStartStep: vi.fn<(id: string) => void>(),
    onStartEpisodeIntroUnit: vi.fn<(id: EpisodeIntroUnitId) => void>(),
    onStartMessengerUnit: vi.fn<(id: MessengerUnitId) => void>(),
    onStartPhoneCallUnit: vi.fn<(id: PhoneCallUnitId) => void>(),
    onStartVisualNovelUnit: vi.fn<(id: VisualNovelUnitId) => void>(),
    onStartEpisodeFinal: vi.fn<(id: EpisodeFinalUnitId) => void>(),
    onStartCover: vi.fn<(episodeId: string) => void>(),
    onStartUnit: vi.fn<(episodeId: string, unitKey: string) => void>(),
  };
}
type Handlers = ReturnType<typeof handlers>;

function catalogOf(h: Handlers, withUnavailable = false): JourneyMapCatalogProps {
  return {
    sections: [
      ...catalogIds.map((episodeId, i) => ({
        kind: "catalog-ready" as const,
        episodeId,
        ordinal: i + 1,
        title: "Title",
        lessonKeys,
        finalKey: "RP",
      })),
      ...(withUnavailable
        ? [
            {
              kind: "catalog-unavailable" as const,
              episodeId: "u09-later",
              ordinal: 9,
              title: "Later",
              reason: "pending" as const,
            },
          ]
        : []),
    ],
    progress: {},
    onStartCover: h.onStartCover,
    onStartUnit: h.onStartUnit,
  };
}

type Overrides = Partial<JourneyMapScreenProps>;

function mapScreen(h: Handlers, overrides: Overrides = {}) {
  return (
    <JourneyMapScreen
      completedStepCount={0}
      completedEpisodeIntroIds={[]}
      completedMessengerUnitIds={[]}
      completedPhoneCallUnitIds={[]}
      completedVisualNovelUnitIds={[]}
      completedEpisodeFinalIds={[]}
      onStartStep={h.onStartStep}
      onStartEpisodeIntroUnit={h.onStartEpisodeIntroUnit}
      onStartMessengerUnit={h.onStartMessengerUnit}
      onStartPhoneCallUnit={h.onStartPhoneCallUnit}
      onStartVisualNovelUnit={h.onStartVisualNovelUnit}
      onStartEpisodeFinal={h.onStartEpisodeFinal}
      catalog={catalogOf(h)}
      {...overrides}
    />
  );
}

const nodeSelector = '[data-testid^="ui-lynx-learning-unit-"][data-status]';
const nodes = (): Element[] =>
  Array.from(screen.getByTestId("journey-map-screen").querySelectorAll(nodeSelector));
const statusOf = (testId: string): string | null =>
  screen.getByTestId(testId).getAttribute("data-status");

const intro = "ui-lynx-learning-unit-tutorial-intro";
const tutorialFinal = "ui-lynx-learning-unit-tutorial-final-test";
const specialIds = [
  "appointment-confirmation",
  "appointment-confirmation-phone-call",
  "cafe-arrival-visual-novel",
] as const;
const coverId = (id: string) => `ui-lynx-learning-unit-catalog-cover-${id}`;
const unitId = (id: string, key: string) => `ui-lynx-learning-unit-catalog-unit-${id}-${key}`;

function expectEveryNode(status: string): void {
  const all = nodes();
  // 튜토리얼 열 + 카탈로그 표지 · 레슨 · 최종 — 비어 있으면 아래 단언이 헛돕니다.
  expect(all.length).toBeGreaterThanOrEqual(10 + catalogIds.length * (1 + lessonKeys.length + 1));
  for (const node of all) {
    expect(node.getAttribute("data-status")).toBe(status);
  }
}

describe("JourneyMapScreen progressLoad — 확인 중", () => {
  test("MN1. checking이면 튜토리얼 · 특별 유닛 · 최종 · 카탈로그 노드 전부가 checking이고 누를 수 없다", () => {
    render(mapScreen(handlers(), { progressLoad: { status: "checking" } }));

    expect(statusOf(intro)).toBe("checking");
    for (const step of journeySteps) {
      expect(statusOf(`ui-lynx-learning-unit-${step.id}`)).toBe("checking");
    }
    for (const id of specialIds) {
      expect(statusOf(`ui-lynx-learning-unit-${id}`)).toBe("checking");
    }
    expect(statusOf(tutorialFinal)).toBe("checking");
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
        completedStepCount: 2,
        completedEpisodeIntroIds: ["tutorial-intro"],
      }),
    );

    expect(screen.getByTestId(intro)).toBe(cover);
    expect(statusOf(intro)).toBe("clear");
    expect(statusOf(`ui-lynx-learning-unit-${journeySteps[0]?.id}`)).toBe("clear");
    expect(statusOf(`ui-lynx-learning-unit-${journeySteps[1]?.id}`)).toBe("clear");
    expect(statusOf(`ui-lynx-learning-unit-${journeySteps[2]?.id}`)).toBe("active");
  });

  test("MN8. (§20) checking에서는 노드를 눌러도 말풍선이 없으니 머리 띠가 없다 (자리 막대도 없다)", () => {
    render(mapScreen(handlers(), { progressLoad: { status: "checking" } }));

    expect(screen.queryByTestId("ui-lynx-episode-header")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("ui-lynx-episode-header-count-placeholder"),
    ).not.toBeInTheDocument();
    fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${journeySteps[0]!.id}`), {});
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
    const knownHtml = screen.getByTestId("catalog-unavailable-u09-later").outerHTML;
    known.unmount();

    render(withCatalog({ status: "checking" }));

    expect(screen.getByTestId("catalog-unavailable-u09-later").outerHTML).toBe(knownHtml);
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

  test("MN5(§18). failed에서는 노드가 열린다 — 씨앗이면 튜토리얼 표지만 available, 나머지 locked", () => {
    const h = handlers();
    render(mapScreen(h, { progressLoad: { status: "failed", onRetry: vi.fn<() => void>() } }));

    expect(statusOf(intro)).toBe("available");
    for (const node of nodes()) {
      if (node === screen.getByTestId(intro)) continue;
      expect(node.getAttribute("data-status")).toBe("default");
    }
    fireEvent.tap(screen.getByTestId(intro), {});
    expect(h.onStartEpisodeIntroUnit).toHaveBeenCalledWith("tutorial-intro");
  });

  test("MN11. failed 줄이 선 채 스텝 말풍선이 열리면 재시도 버튼이 낭독에서 가려진다", () => {
    render(
      mapScreen(handlers(), {
        completedEpisodeIntroIds: ["tutorial-intro"],
        progressLoad: { status: "failed", onRetry: vi.fn<() => void>() },
      }),
    );
    const retry = () => screen.getByTestId("journey-progress-load-row-retry");
    expect(retry()).toHaveAttribute("accessibility-elements-hidden", "false");

    fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${journeySteps[0]!.id}`), {});

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
    expect(h.onStartEpisodeIntroUnit).toHaveBeenCalledTimes(1);
  });
});

describe("JourneyMapScreen progressLoad — 가드", () => {
  const allDone: Overrides = {
    completedStepCount: journeySteps.length,
    completedEpisodeIntroIds: ["tutorial-intro"],
    completedMessengerUnitIds: ["appointment-confirmation"],
    completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
    completedVisualNovelUnitIds: ["cafe-arrival-visual-novel"],
    completedEpisodeFinalIds: ["tutorial-final-test"],
  };
  const tables: readonly (readonly [string, Overrides])[] = [
    ["빈 씨앗", {}],
    ["스텝 2 + 표지", { completedStepCount: 2, completedEpisodeIntroIds: ["tutorial-intro"] }],
    ["전부 완료", allDone],
  ];

  test.each(tables)(
    "MN6. %s — progressLoad를 생략한 것과 known의 DOM이 같다",
    (_name, overrides) => {
      const h = handlers();
      const omitted = render(mapScreen(h, overrides));
      const omittedHtml = screen.getByTestId("journey-map-screen").outerHTML;
      omitted.unmount();

      render(mapScreen(h, { ...overrides, progressLoad: { status: "known" } }));

      expect(screen.getByTestId("journey-map-screen").outerHTML).toBe(omittedHtml);
      expect(screen.queryByTestId("journey-progress-load-row")).not.toBeInTheDocument();
      expect(nodes().some((node) => node.getAttribute("data-status") === "checking")).toBe(false);
    },
  );

  test("MN6. 상태 표 — 빈 씨앗은 표지만 available, 스텝 2는 앞 둘 clear · 셋째 active", () => {
    const h = handlers();
    const empty = render(mapScreen(h));
    expect(statusOf(intro)).toBe("available");
    expect(statusOf(`ui-lynx-learning-unit-${journeySteps[0]?.id}`)).toBe("default");
    empty.unmount();

    render(mapScreen(h, tables[1]?.[1] ?? {}));
    expect(statusOf(`ui-lynx-learning-unit-${journeySteps[1]?.id}`)).toBe("clear");
    expect(statusOf(`ui-lynx-learning-unit-${journeySteps[2]?.id}`)).toBe("active");
  });
});
