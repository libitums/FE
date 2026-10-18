import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { TutorialEpisodeSection } from "./TutorialEpisodeSection";
import type { TutorialGuide, TutorialMapActions } from "./TutorialMapItem";
import { journeyMapSections } from "./journey-map";
import type { JourneyFilledEpisode, JourneyMapItem } from "./journey-map";
import type { JourneyProgress } from "./journey-map-progress";
import { mapRowItems, tutorialItemId, tutorialRowsOf } from "./journey-map-rows";
import { mapUnitDomId } from "./journey-map-scroll";
import { noProgress, twoStepsDone } from "./JourneyMapScreen.test-support";

// `ui` 계층: 튜토리얼 구획이 항목을 줄 › 셀 구조로 세우는지 — 구조 · 문서 순서 · 가림 · 탭이 옮겨 간 뒤에도
// 같은 일을 하는지만 봅니다. 줄을 나누는 규칙 자체는 unit이 지므로 여기서는 결과 구조만 확인합니다.
// 실제 가로 배치 · 낭독 순서는 기기(e2e)에서만 닫힙니다.

const tutorialSection = journeyMapSections[0];
if (tutorialSection === undefined || tutorialSection.episode.kind !== "filled") {
  throw new Error("튜토리얼 구획이 채워져 있어야 합니다");
}
const episode: JourneyFilledEpisode = tutorialSection.episode;
const realItems: readonly JourneyMapItem[] = tutorialSection.items;
const sectionId = "journey-map-screen-episode-tutorial";

const stepItems = realItems.filter((item) => item.kind === "standard");
const pick = (kind: JourneyMapItem["kind"]): JourneyMapItem => {
  const found = realItems.find((item) => item.kind === kind);
  if (found === undefined) {
    throw new Error(`${kind} 항목이 없습니다`);
  }
  return found;
};

function setGlobalProps(value: unknown): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
});

type Mounted = {
  readonly guide: TutorialGuide & { readonly dismiss: ReturnType<typeof vi.fn<() => void>> };
  readonly actions: {
    readonly [K in keyof TutorialMapActions]: ReturnType<typeof vi.fn<TutorialMapActions[K]>>;
  };
};

function mount(
  options: {
    readonly items?: readonly JourneyMapItem[];
    readonly progress?: JourneyProgress;
    readonly guideVisible?: boolean;
  } = {},
): Mounted {
  const guide = { visible: options.guideVisible ?? false, dismiss: vi.fn<() => void>() };
  const actions = {
    onSelectStep: vi.fn<TutorialMapActions["onSelectStep"]>(),
    onStartEpisodeIntroUnit: vi.fn<TutorialMapActions["onStartEpisodeIntroUnit"]>(),
    onStartMessengerUnit: vi.fn<TutorialMapActions["onStartMessengerUnit"]>(),
    onStartPhoneCallUnit: vi.fn<TutorialMapActions["onStartPhoneCallUnit"]>(),
    onStartVisualNovelUnit: vi.fn<TutorialMapActions["onStartVisualNovelUnit"]>(),
    onStartEpisodeFinal: vi.fn<TutorialMapActions["onStartEpisodeFinal"]>(),
  };
  render(
    <TutorialEpisodeSection
      episode={episode}
      items={options.items ?? realItems}
      progress={options.progress ?? noProgress}
      guide={guide}
      actions={actions}
    />,
  );
  return { guide, actions };
}

const sectionBox = (): Element | null => document.querySelector(`#${sectionId}`);
const rowBoxes = (): Element[] => Array.from(sectionBox()?.children ?? []);
const rowKinds = (): (string | null)[] =>
  rowBoxes().map((row) => row.getAttribute("data-row-kind"));
const cellsOf = (row: Element): Element[] =>
  Array.from(row.querySelectorAll('[data-testid^="journey-map-cell-"]'));

// 유닛 표식의 하위 장식(`-ring` 등)을 뺀 유닛 testid의 문서 순서입니다. 스텝은 `LearningUnit`,
// 특별 유닛은 `SpecialUnit`이 그립니다.
const unitTestIds = (): string[] =>
  Array.from(
    sectionBox()?.querySelectorAll(
      '[data-testid^="ui-lynx-learning-unit-"], [data-testid^="ui-lynx-special-unit-"]',
    ) ?? [],
  )
    .map((element) => element.getAttribute("data-testid") ?? "")
    .filter((id) => !/-(ring|icon|badge|shade|halo|body|face|pressed-shade)$/.test(id));

const expectedUnitTestIds = (items: readonly JourneyMapItem[]): string[] =>
  items.map(
    (item) =>
      `ui-lynx-${item.kind === "standard" ? "learning" : "special"}-unit-${tutorialItemId(item)}`,
  );

const realKinds = ["solo", "pair", "pair", "solo", "solo", "solo", "pair", "pair", "solo"];

describe("TutorialEpisodeSection", () => {
  test("UG-T1. 구획 상자는 id와 클래스를 그대로 두고 직계 자식이 줄 아홉이며 종류 열이 실데이터의 줄과 같다", () => {
    mount();

    const box = sectionBox();
    expect(box).not.toBeNull();
    expect((box?.getAttribute("class") ?? "").split(/\s+/)).toContain("journey-map-screen-episode");
    expect(rowBoxes().map((row) => row.getAttribute("data-testid"))).toEqual(
      realKinds.map(() => "journey-map-row"),
    );
    expect(rowKinds()).toEqual(realKinds);
    expect(rowKinds()).toEqual(tutorialRowsOf(realItems, 2).map((row) => row.kind));
  });

  test("UG-T2. 한 줄 전용 사이에서 남는 일반 항목은 orphan 줄이 된다(홀수 픽스처)", () => {
    const fixture = [
      pick("episode-intro"),
      ...stepItems.slice(0, 3),
      pick("messenger"),
      stepItems[4] as JourneyMapItem,
      pick("episode-final"),
    ];
    mount({ items: fixture });

    expect(rowKinds()).toEqual(["solo", "pair", "orphan", "solo", "orphan", "solo"]);
  });

  test("UG-T3. 줄마다 셀 순서가 줄 나누기의 읽는 순서와 같고 유닛의 문서 순서가 항목 순서와 같다", () => {
    mount();

    const expectedCells = tutorialRowsOf(realItems, 2).map((row) =>
      mapRowItems(row).map((item) => `journey-map-cell-${tutorialItemId(item)}`),
    );
    expect(
      rowBoxes().map((row) => cellsOf(row).map((cell) => cell.getAttribute("data-testid"))),
    ).toEqual(expectedCells);
    expect(unitTestIds()).toEqual(expectedUnitTestIds(realItems));
  });

  test("UG-T4. 셀의 id가 mapUnitDomId이고 스텝 셀 안에 stepNodeId 상자가 그대로 있다", () => {
    mount();

    for (const item of realItems) {
      const cell = screen.queryByTestId(`journey-map-cell-${tutorialItemId(item)}`);
      expect(cell).not.toBeNull();
      expect(cell?.getAttribute("id")).toBe(mapUnitDomId(tutorialItemId(item)));
    }
    // 스텝 셀마다 말풍선이 재는 표식 상자가 그 안에 그대로 있습니다.
    expect(
      stepItems.map(
        (item) =>
          item.kind === "standard" &&
          screen
            .queryByTestId(`journey-map-cell-${item.step.id}`)
            ?.querySelector(`#journey-step-node-${item.step.id}`) !== null,
      ),
    ).toEqual(stepItems.map(() => true));
  });

  test("UG-T5. 첫 유닛 가이드가 떠 있으면 표지를 뺀 열두 셀의 가림 상자만 낭독에서 가리고 줄 · 셀 상자에는 그 속성이 없다", () => {
    mount({ guideVisible: true });

    const cells = screen.queryAllByTestId(/^journey-map-cell-/);
    expect(cells).toHaveLength(13);
    for (const cell of cells) {
      const hider = cell.firstElementChild;
      const isCover = cell.getAttribute("data-testid") === "journey-map-cell-tutorial-intro";
      expect(hider?.getAttribute("accessibility-elements-hidden")).toBe(isCover ? "false" : "true");
      expect(cell.hasAttribute("accessibility-elements-hidden")).toBe(false);
    }
    expect(rowBoxes()).toHaveLength(9);
    for (const row of rowBoxes()) {
      expect(row.hasAttribute("accessibility-elements-hidden")).toBe(false);
    }
  });

  test("UG-T6. 표지를 끝낸 뒤 스텝을 탭하면 탭 높이와 함께 올리고, 가이드가 뜬 표지를 탭하면 가이드를 닫은 뒤 시작을 올린다", () => {
    const afterIntro = mount({ progress: twoStepsDone });
    const step = screen.queryByTestId("ui-lynx-learning-unit-ordering");
    expect(step).not.toBeNull();
    fireEvent.tap(step as Element, { detail: { y: 321 } });
    expect(afterIntro.actions.onSelectStep).toHaveBeenCalledTimes(1);
    expect(afterIntro.actions.onSelectStep).toHaveBeenCalledWith("ordering", 321);

    cleanup();

    const guided = mount({ guideVisible: true });
    const cover = screen.queryByTestId("ui-lynx-special-unit-tutorial-intro");
    expect(cover).not.toBeNull();
    fireEvent.tap(cover as Element, {});
    expect(guided.guide.dismiss).toHaveBeenCalledTimes(1);
    expect(guided.actions.onStartEpisodeIntroUnit).toHaveBeenCalledTimes(1);
    expect(guided.actions.onStartEpisodeIntroUnit).toHaveBeenCalledWith("tutorial-intro");
    expect(guided.guide.dismiss.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      guided.actions.onStartEpisodeIntroUnit.mock.invocationCallOrder[0] ?? -Infinity,
    );
  });

  test("UG-F1. 글자 배율 2.35 · 화면 폭 402면 줄 열셋이 전부 solo이고 유닛 순서는 그대로다", () => {
    setGlobalProps({ fontScale: 2.35, viewportWidth: 402 });
    mount();

    expect(rowKinds()).toEqual(realItems.map(() => "solo"));
    expect(unitTestIds()).toEqual(expectedUnitTestIds(realItems));
  });
});
