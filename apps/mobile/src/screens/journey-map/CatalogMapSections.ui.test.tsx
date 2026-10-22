import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { CatalogMapSections } from "./CatalogMapSections";
import { catalogSectionDomId, catalogUnitDomId } from "./catalog-map";
import type {
  CatalogGate,
  CatalogMapSection,
  CatalogReadySection,
  CatalogUnavailableSection,
} from "./catalog-map.contract";

// `ui` 계층: 구획 렌더 — 잠긴 노드 무동작 · 표지 상태 · 접근성 이름 · 낭독 요소 하나. 상태 파생과
// 라벨 계산은 순수 함수 unit이 지므로(여기서 다시 단언하지 않습니다) 렌더가 그 결과를 내는지만
// 봅니다. 데이터는 손으로 세운 구획입니다 — 순수 함수의 스캐폴드 상태와 무관하게 단언 실패로 서도록.

const lessonKeys = ["S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"];

function ready(episodeId: string, ordinal: number, title: string): CatalogReadySection {
  return {
    kind: "catalog-ready",
    episodeId,
    ordinal,
    title,
    lessonKeys,
    finalKey: "RP",
    completionKeys: ["RP"],
    cultureKeys: [],
  };
}

function unavailable(
  episodeId: string,
  ordinal: number,
  title: string,
  reason: CatalogUnavailableSection["reason"],
): CatalogUnavailableSection {
  return { kind: "catalog-unavailable", episodeId, ordinal, title, reason };
}

const sections: readonly CatalogMapSection[] = [
  ready("u01-water", 1, "익선동 골목 어귀 편의점"),
  ready("u02-checkin", 2, "익선 게스트하우스 프런트"),
  ready("u03-mina", 3, "익선 게스트하우스 여성 도미토리"),
  unavailable("u04-x", 4, "Ep", "pending"),
  unavailable("u05-x", 5, "Ep", "client-too-old"),
  unavailable("u06-x", 6, "Ep", "decode-failed"),
];

// 문 입력은 옛 튜토리얼 통과 기록(`legacyTutorialPassed`)과 카탈로그 진행입니다.
const gateOf = (
  legacyTutorialPassed: boolean,
  progress: CatalogGate["progress"] = {},
): CatalogGate => ({ legacyTutorialPassed, progress }) as unknown as CatalogGate;
const openGate = gateOf(true);

function mount(gate: CatalogGate = openGate) {
  const onStartCover = vi.fn<(episodeId: string) => void>();
  const onStartUnit = vi.fn<(episodeId: string, unitKey: string, tapY: number) => void>();
  render(
    <CatalogMapSections
      sections={sections}
      gate={gate}
      onStartCover={onStartCover}
      onSelectUnit={onStartUnit}
    />,
  );
  return Object.assign(onStartCover, { onStartUnit });
}

// 표지 · 문화 · 최종은 `SpecialUnit`, 레슨은 `LearningUnit`이 그립니다(testid 접두가 갈립니다).
const specialKeys = ["CULT", "RP"];
const coverId = (id: string) => `ui-lynx-special-unit-catalog-cover-${id}`;
const nodeId = (id: string, key: string) =>
  `ui-lynx-${specialKeys.includes(key) ? "special" : "learning"}-unit-catalog-unit-${id}-${key}`;
const unitKeys = [...lessonKeys, "RP"];

describe("CatalogMapSections", () => {
  test("UM1′. 진행 없이 열린 구획은 표지 아래 레슨 8 + 최종 1이 순서대로 default로 서고 낭독은 에피소드 번호로 시작해 잠김을 말한다", () => {
    mount();

    const section = screen.getByTestId("catalog-section-u01-water");
    const rendered = Array.from(section.querySelectorAll("[data-testid]"))
      .map((el) => el.getAttribute("data-testid") ?? "")
      .filter((id) => /^ui-lynx-(special|learning)-unit-catalog-(cover|unit)-/.test(id))
      .filter((id) => !/-(ring|icon|badge|shade|halo|body|face|pressed-shade)$/.test(id));
    expect(rendered).toEqual([
      coverId("u01-water"),
      ...unitKeys.map((key) => nodeId("u01-water", key)),
    ]);

    unitKeys.forEach((key, position) => {
      const node = within(section).getByTestId(nodeId("u01-water", key));
      expect(node).toHaveAttribute("data-status", "default");
      const label = node.getAttribute("accessibility-label") ?? "";
      const title = key === "RP" ? "Final test" : `Lesson ${position + 1}`;
      // 최종은 스페셜이라 `special, ` 접두가 붙고 레슨은 붙지 않습니다.
      const prefix = key === "RP" ? "special, " : "";
      expect(label.startsWith(`${prefix}Episode 1. ${title}`)).toBe(true);
      expect(label).toContain("locked");
      expect(label.toLowerCase()).not.toContain("coming soon");
    });

    const cover = within(section).getByTestId(coverId("u01-water"));
    expect(
      (cover.getAttribute("accessibility-label") ?? "").startsWith(
        "special, Episode 1. Episode intro",
      ),
    ).toBe(true);
    expect(section.textContent ?? "").not.toContain("COMING SOON");

    for (let n = 1; n <= 8; n += 1) {
      expect(within(section).getByText(`Lesson ${n}`)).toBeInTheDocument();
    }
    expect(within(section).getByText("Final test")).toBeInTheDocument();
    expect(within(section).getByText("Episode intro")).toBeInTheDocument();
  });

  test("UM2′. 진행 없이는 레슨 · 최종 노드를 탭해도 시작을 올리지 않는다", () => {
    const onStartCover = mount();

    for (const key of unitKeys) {
      fireEvent.tap(screen.getByTestId(nodeId("u01-water", key)), {});
    }

    expect(onStartCover).toHaveBeenCalledTimes(0);
    expect(onStartCover.onStartUnit).toHaveBeenCalledTimes(0);
  });

  test("UM-U1. 표지를 끝내면 첫 레슨이 열려 탭하면 에피소드 id와 키로 올리고 둘째 레슨은 여전히 닫혀 있다", () => {
    const onStartCover = mount(gateOf(true, { "u01-water": ["intro"] }));

    expect(screen.getByTestId(nodeId("u01-water", "S1"))).toHaveAttribute(
      "data-status",
      "available",
    );
    fireEvent.tap(screen.getByTestId(nodeId("u01-water", "S1")), {});
    expect(onStartCover.onStartUnit).toHaveBeenCalledTimes(1);
    expect(onStartCover.onStartUnit).toHaveBeenCalledWith("u01-water", "S1", expect.any(Number));

    expect(screen.getByTestId(nodeId("u01-water", "S3"))).toHaveAttribute("data-status", "default");
    fireEvent.tap(screen.getByTestId(nodeId("u01-water", "S3")), {});
    expect(onStartCover.onStartUnit).toHaveBeenCalledTimes(1);
    expect(onStartCover).toHaveBeenCalledTimes(0);
  });

  test("UM-U2. 첫 레슨을 끝내면 clear로 서고 다시 풀 수 있으며 다음 레슨이 열린다", () => {
    const onStartCover = mount(gateOf(true, { "u01-water": ["intro", "S1"] }));

    expect(screen.getByTestId(nodeId("u01-water", "S1"))).toHaveAttribute("data-status", "clear");
    expect(screen.getByTestId(nodeId("u01-water", "S3"))).toHaveAttribute(
      "data-status",
      "available",
    );
    fireEvent.tap(screen.getByTestId(nodeId("u01-water", "S1")), {});

    expect(onStartCover.onStartUnit).toHaveBeenCalledTimes(1);
    expect(onStartCover.onStartUnit).toHaveBeenCalledWith("u01-water", "S1", expect.any(Number));
  });

  test("UM-U3. 레슨을 모두 끝내면 최종 테스트가 열리고 이름에 special 접두가 들고 story 접미는 없으며 탭하면 RP 키로 올린다", () => {
    const onStartCover = mount(gateOf(true, { "u01-water": ["intro", ...lessonKeys] }));

    const finalNode = screen.getByTestId(nodeId("u01-water", "RP"));
    expect(finalNode).toHaveAttribute("data-status", "available");
    expect(finalNode).toHaveAttribute("accessibility-label", "special, Episode 1. Final test");
    fireEvent.tap(finalNode, {});

    expect(onStartCover.onStartUnit).toHaveBeenCalledTimes(1);
    expect(onStartCover.onStartUnit).toHaveBeenCalledWith("u01-water", "RP", expect.any(Number));
  });

  test("UM3a. 열린 첫 표지를 탭하면 에피소드 id로 한 번 올린다", () => {
    const onStartCover = mount();

    expect(screen.getByTestId(coverId("u01-water"))).toHaveAttribute("data-status", "available");
    fireEvent.tap(screen.getByTestId(coverId("u01-water")), {});

    expect(onStartCover).toHaveBeenCalledTimes(1);
    expect(onStartCover).toHaveBeenCalledWith("u01-water");
  });

  test("UM3b. 앞 에피소드를 끝내지 않은 표지는 잠겨 있고 탭해도 올리지 않는다", () => {
    const onStartCover = mount();

    expect(screen.getByTestId(coverId("u02-checkin"))).toHaveAttribute("data-status", "default");
    fireEvent.tap(screen.getByTestId(coverId("u02-checkin")), {});

    expect(onStartCover).toHaveBeenCalledTimes(0);
  });

  test("UM3c. 표지를 끝낸 에피소드는 clear로 서고 다시 열 수 있다", () => {
    const onStartCover = mount(gateOf(true, { "u01-water": ["intro"] }));

    expect(screen.getByTestId(coverId("u01-water"))).toHaveAttribute("data-status", "clear");
    fireEvent.tap(screen.getByTestId(coverId("u01-water")), {});

    expect(onStartCover).toHaveBeenCalledTimes(1);
    expect(onStartCover).toHaveBeenCalledWith("u01-water");
  });

  test("UM3d. 첫 구획의 표지는 옛 통과 기록이 없어도 열려 있고 탭하면 시작을 올린다", () => {
    const onStartCover = mount(gateOf(false));

    expect(screen.getByTestId(coverId("u01-water"))).toHaveAttribute("data-status", "available");
    fireEvent.tap(screen.getByTestId(coverId("u01-water")), {});

    expect(onStartCover).toHaveBeenCalledTimes(1);
    expect(onStartCover).toHaveBeenCalledWith("u01-water");
  });

  test("UM4a. 받는 중(pending)인 에피소드는 맨 끝 「준비 중」과 같은 그림이다 — 그 에피소드 번호의 카드 · 낭독 요소 하나", () => {
    mount();

    const section = screen.getByTestId("catalog-pending-u04-x");
    expect(section).toHaveAttribute("accessibility-element", "true");
    expect(section).toHaveAttribute(
      "accessibility-label",
      "Episode 4. Coming soon. We're preparing the next story.",
    );
    expect(within(section).getByTestId("catalog-coming-soon-label")).toHaveTextContent(
      "Episode 4.",
    );
    expect(screen.queryByTestId("catalog-unavailable-u04-x")).toBeNull();
    expect(screen.queryByTestId("catalog-unavailable-caption-u04-x")).toBeNull();
  });

  test.each([
    ["u05-x", "Episode 5. Ep, update the app to open", "UPDATE REQUIRED"],
    ["u06-x", "Episode 6. Ep, not available", "NOT AVAILABLE"],
  ])("UM4. %s 구획은 낭독 요소 하나이고 캡션을 사유별로 낸다", (id, spoken, caption) => {
    const onStartCover = mount();

    const section = screen.getByTestId(`catalog-unavailable-${id}`);
    expect(section).toHaveAttribute("accessibility-element", "true");
    expect(section).toHaveAttribute("accessibility-label", spoken);
    expect(screen.getByTestId(`catalog-unavailable-caption-${id}`)).toHaveTextContent(caption);

    // 안쪽 흐린 표식은 장식입니다 — 탭해도 아무 일도 일어나지 않습니다.
    const mark = section.querySelector('[data-testid^="ui-lynx-learning-unit"]');
    expect(mark).not.toBeNull();
    fireEvent.tap(mark as Element, {});
    expect(onStartCover).toHaveBeenCalledTimes(0);
  });

  test("UM5. 구획 루트의 id 속성은 셀렉터 안전 id다(본문 있음 · 없음 모두)", () => {
    mount();

    expect(catalogSectionDomId("u01-water")).toMatch(/^journey-map-screen-catalog-.+/);
    for (const id of ["u01-water", "u02-checkin", "u03-mina"]) {
      expect(screen.getByTestId(`catalog-section-${id}`)).toHaveAttribute(
        "id",
        catalogSectionDomId(id),
      );
    }
    for (const id of ["u05-x", "u06-x"]) {
      expect(screen.getByTestId(`catalog-unavailable-${id}`)).toHaveAttribute(
        "id",
        catalogSectionDomId(id),
      );
    }
    expect(screen.getByTestId("catalog-pending-u04-x")).toHaveAttribute(
      "id",
      catalogSectionDomId("u04-x"),
    );
  });

  test("UM6. 구획 아래에는 heading trait 요소가 없다(머리말 축은 머리 카드 하나)", () => {
    mount();

    const root = screen.getByTestId("journey-map-screen-catalog");
    expect(root.querySelectorAll('[accessibility-traits*="header"]')).toHaveLength(0);
  });

  // 눌림 막(`-shade`)은 모션 정책(ADR-0053)이 reduced에서 더 그리는 노드라 구획 구조 비교에서 뺀다.
  const structuralNodeCount = (): number =>
    [...screen.getByTestId("journey-map-screen-catalog").querySelectorAll("*")].filter(
      (el) => !(el.getAttribute("data-testid") ?? "").endsWith("-shade"),
    ).length;

  test("UM7. 모션 축소 컨텍스트에서도 눌림 막을 뺀 구획 구조가 같다", () => {
    mount();
    const standard = structuralNodeCount();
    cleanup();

    render(
      <MotionProvider motion="reduced">
        <CatalogMapSections
          sections={sections}
          gate={openGate}
          onStartCover={vi.fn<(episodeId: string) => void>()}
          onSelectUnit={vi.fn<(episodeId: string, unitKey: string, tapY: number) => void>()}
        />
      </MotionProvider>,
    );

    const reduced = structuralNodeCount();
    expect(reduced).toBe(standard);
  });
});

// 줄 › 셀 구조(여정 맵 두 열 배치): 구획 상자의 직계 자식이 구분선 → 줄이고, 셀이 유닛 DOM id와 testid를 진다.
// 줄을 나누는 규칙 자체는 unit이 지므로 여기서는 결과 구조만 봅니다.
describe("CatalogMapSections 줄 구조", () => {
  const setGlobalProps = (value: unknown): void => {
    (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
  };
  afterEach(() => {
    setGlobalProps(undefined);
  });

  const sectionChildren = (episodeId: string): Element[] =>
    Array.from(screen.getByTestId(`catalog-section-${episodeId}`).children);
  const rowKindsOf = (episodeId: string): (string | null)[] =>
    sectionChildren(episodeId)
      .filter((child) => child.getAttribute("data-testid") === "journey-map-row")
      .map((row) => row.getAttribute("data-row-kind"));
  const classesOf = (element: Element | undefined): string[] =>
    (element?.getAttribute("class") ?? "").split(/\s+/);

  const twoColumnKinds = ["solo", "pair", "pair", "pair", "pair", "solo"];

  test("UG-C1. 레슨 8 구획의 직계 자식은 구분선 뒤에 줄 여섯이고 종류는 solo(표지), pair 넷, solo(최종)다", () => {
    mount();

    const children = sectionChildren("u01-water");
    expect(classesOf(children[0])).toContain("episode-pending-divider");
    expect(children.slice(1).map((child) => child.getAttribute("data-testid"))).toEqual(
      twoColumnKinds.map(() => "journey-map-row"),
    );
    expect(rowKindsOf("u01-water")).toEqual(twoColumnKinds);
  });

  test("UG-C2. 레슨 7 구획은 solo, pair 셋, orphan, solo다", () => {
    const sevenLessons: CatalogReadySection = {
      ...ready("u01-water", 1, "익선동 골목 어귀 편의점"),
      lessonKeys: lessonKeys.slice(0, 7),
    };
    render(
      <CatalogMapSections
        sections={[sevenLessons]}
        gate={openGate}
        onStartCover={vi.fn<(episodeId: string) => void>()}
        onSelectUnit={vi.fn<(episodeId: string, unitKey: string, tapY: number) => void>()}
      />,
    );

    expect(rowKindsOf("u01-water")).toEqual(["solo", "pair", "pair", "pair", "orphan", "solo"]);
  });

  test("UCN2. 레슨 8 · 문화 · 최종 구획은 문화 노드가 한 줄 전용이라 solo, pair 넷, solo, solo다", () => {
    const withCulture: CatalogReadySection = {
      ...ready("u01-water", 1, "익선동 골목 어귀 편의점"),
      lessonKeys: [...lessonKeys.slice(0, 8), "CULT"],
      cultureKeys: ["CULT"],
    };
    render(
      <CatalogMapSections
        sections={[withCulture]}
        gate={openGate}
        onStartCover={vi.fn<(episodeId: string) => void>()}
        onSelectUnit={vi.fn<(episodeId: string, unitKey: string, tapY: number) => void>()}
      />,
    );

    expect(rowKindsOf("u01-water")).toEqual([
      "solo",
      "pair",
      "pair",
      "pair",
      "pair",
      "solo",
      "solo",
    ]);
  });

  test("UG-C3. 셀의 id가 catalogUnitDomId이고 testid가 에피소드와 키를 담는다(표지의 키는 intro)", () => {
    mount();

    const section = screen.getByTestId("catalog-section-u01-water");
    const cover = within(section).queryByTestId("journey-map-cell-catalog-u01-water-intro");
    expect(cover).not.toBeNull();
    expect(cover?.getAttribute("id")).toBe(catalogUnitDomId("u01-water", "intro"));
    for (const key of unitKeys) {
      const cell = within(section).queryByTestId(`journey-map-cell-catalog-u01-water-${key}`);
      expect(cell).not.toBeNull();
      expect(cell?.getAttribute("id")).toBe(catalogUnitDomId("u01-water", key));
    }
    expect(within(section).queryAllByTestId(/^journey-map-cell-/)).toHaveLength(
      unitKeys.length + 1,
    );
  });

  test("UG-C4. 본문 없는 구획에는 줄이 없다", () => {
    mount();

    for (const id of ["u05-x", "u06-x"]) {
      expect(
        within(screen.getByTestId(`catalog-unavailable-${id}`)).queryAllByTestId("journey-map-row"),
      ).toHaveLength(0);
    }
  });

  test("UG-F2. 글자 배율 1 · 화면 폭 300이면 줄이 전부 solo다", () => {
    setGlobalProps({ fontScale: 1, viewportWidth: 300 });
    mount();

    expect(rowKindsOf("u01-water")).toEqual(Array.from({ length: 10 }, () => "solo"));
  });

  test.each([
    ["globalProps가 없으면", undefined],
    ["글자 배율 2 · 화면 폭 320(경계)이면", { fontScale: 2, viewportWidth: 320 }],
  ])("UG-F3. %s 두 열이다", (_label, globalProps) => {
    setGlobalProps(globalProps);
    mount();

    expect(rowKindsOf("u01-water")).toEqual(twoColumnKinds);
  });
});
