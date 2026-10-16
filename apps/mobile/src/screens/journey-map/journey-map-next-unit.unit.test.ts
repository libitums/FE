import { describe, expect, test } from "vitest";

import type { CatalogProgress } from "../../lib/catalog-progress";
import { catalogCoverStatus, catalogUnitDomId, catalogUnitNodesOf } from "./catalog-map";
import type {
  CatalogGate,
  CatalogMapSection,
  CatalogReadySection,
  CatalogUnavailableSection,
} from "./catalog-map.contract";
import { journeyMapSections, mapItemStatus } from "./journey-map";
import type { JourneyProgress } from "./journey-map";
import {
  catalogUnitEntries,
  mapScrollTargetOf,
  nextMapScrollTarget,
  tutorialUnitEntries,
} from "./journey-map-next-unit";
import type { MapUnitEntry } from "./journey-map-next-unit";
import { mapUnitDomId } from "./journey-map-scroll";

// `unit` 계층: 「다음에 풀 유닛」 판정의 입출력만 봅니다.

const tutorialItems = journeyMapSections[0]!.items;

const empty: JourneyProgress = {
  completedStepCount: 0,
  completedEpisodeIntroIds: [],
  completedMessengerUnitIds: [],
  completedPhoneCallUnitIds: [],
  completedVisualNovelUnitIds: [],
  completedEpisodeFinalIds: [],
};

// 끝낸 맵 항목 수 n(0 ~ 13) → 진행. 맵 순서대로 완료 기록을 적습니다(제품의 상태 함수를 쓰지 않습니다).
function progressAfter(count: number): JourneyProgress {
  if (count === 0) return empty;
  return {
    completedStepCount: Math.min(count - 1, 4) + Math.max(0, Math.min(count - 8, 4)),
    completedEpisodeIntroIds: ["tutorial-intro"],
    completedMessengerUnitIds: count >= 6 ? ["appointment-confirmation"] : [],
    completedPhoneCallUnitIds: count >= 7 ? ["appointment-confirmation-phone-call"] : [],
    completedVisualNovelUnitIds: count >= 8 ? ["cafe-arrival-visual-novel"] : [],
    completedEpisodeFinalIds: count >= 13 ? ["tutorial-final-test"] : [],
  };
}

const tutorialDone = progressAfter(13);

function ready(id: string, lessonCount: number): CatalogReadySection {
  return {
    kind: "catalog-ready",
    episodeId: id,
    ordinal: 1,
    title: `T ${id}`,
    lessonKeys: Array.from({ length: lessonCount }, (_, index) => `S${index + 1}`),
    finalKey: "RP",
  };
}

function unavailable(id: string): CatalogUnavailableSection {
  return {
    kind: "catalog-unavailable",
    episodeId: id,
    ordinal: 1,
    title: `T ${id}`,
    reason: "pending",
  };
}

const allKeys = (section: CatalogReadySection) => [
  "intro",
  ...section.lessonKeys,
  section.finalKey,
];

const u01 = ready("u01-water", 3);
const u02 = ready("u02-checkin", 3);
const u03 = ready("u03-mina", 3);
const threeSections: readonly CatalogMapSection[] = [u01, u02, u03];

function targetOf(
  progress: JourneyProgress,
  catalogSections: readonly CatalogMapSection[],
  catalogProgress: CatalogProgress,
) {
  return mapScrollTargetOf({
    tutorialSections: journeyMapSections,
    progress,
    catalogSections,
    catalogProgress,
  });
}

const unit = (domId: string) => ({ kind: "unit", domId }) as const;
const top = { kind: "top" } as const;

describe("mapScrollTargetOf", () => {
  test("N1. 진행이 없으면 top이다", () => {
    expect(targetOf(progressAfter(0), [], {})).toEqual(top);
  });

  test("N2. 표지만 끝났으면 greeting이다", () => {
    expect(targetOf(progressAfter(1), [], {})).toEqual(unit(mapUnitDomId("greeting")));
  });

  test("N3. 표지 + 스텝 넷 뒤 메신저가 대상이다(한 줄 전용도 대상)", () => {
    expect(targetOf(progressAfter(5), [], {})).toEqual(
      unit(mapUnitDomId("appointment-confirmation")),
    );
  });

  test("N4. 튜토리얼 전부 끝, 카탈로그 없음이면 최종 테스트(마지막 completed)다", () => {
    expect(targetOf(tutorialDone, [], {})).toEqual(unit(mapUnitDomId("tutorial-final-test")));
  });

  test("N5. 튜토리얼 통과 뒤 카탈로그 첫 표지가 대상이다", () => {
    expect(targetOf(tutorialDone, threeSections, {})).toEqual(
      unit(catalogUnitDomId("u01-water", "intro")),
    );
  });

  test("N6. 표지를 끝내면 첫 레슨이 대상이다", () => {
    expect(targetOf(tutorialDone, threeSections, { "u01-water": ["intro"] })).toEqual(
      unit(catalogUnitDomId("u01-water", "S1")),
    );
  });

  test("N7. 한 에피소드를 최종까지 끝내면 다음 에피소드 표지다", () => {
    expect(targetOf(tutorialDone, threeSections, { "u01-water": allKeys(u01) })).toEqual(
      unit(catalogUnitDomId("u02-checkin", "intro")),
    );
  });

  test("N8. 모두 끝내면 마지막 구획의 RP다", () => {
    const progress = {
      "u01-water": allKeys(u01),
      "u02-checkin": allKeys(u02),
      "u03-mina": allKeys(u03),
    };
    expect(targetOf(tutorialDone, threeSections, progress)).toEqual(
      unit(catalogUnitDomId("u03-mina", "RP")),
    );
  });

  test("N9. 앞 구획이 unavailable이면 길이 막혀 최종 테스트에 선다", () => {
    expect(targetOf(tutorialDone, [unavailable("u01-water"), u02], {})).toEqual(
      unit(mapUnitDomId("tutorial-final-test")),
    );
  });

  test("N10. 구멍 있는 진행은 목록 순서로 첫 available이다", () => {
    expect(targetOf(tutorialDone, threeSections, { "u01-water": ["intro", "S3"] })).toEqual(
      unit(catalogUnitDomId("u01-water", "S1")),
    );
  });

  test("N15. 튜토리얼 미통과면 카탈로그 진행이 있어도 대상은 튜토리얼 안이다", () => {
    expect(targetOf(progressAfter(1), threeSections, { "u01-water": ["intro"] })).toEqual(
      unit(mapUnitDomId("greeting")),
    );
  });
});

describe("nextMapScrollTarget", () => {
  const entry = (domId: string, status: MapUnitEntry["status"]): MapUnitEntry => ({
    domId,
    status,
  });

  test("N11. 대상이 없거나 0번이면 top이다", () => {
    expect(nextMapScrollTarget([])).toEqual(top);
    expect(nextMapScrollTarget([entry("a", "available")])).toEqual(top);
    expect(nextMapScrollTarget([entry("a", "completed")])).toEqual(top);
    expect(nextMapScrollTarget([entry("a", "locked"), entry("b", "locked")])).toEqual(top);
  });

  test("N12. 첫 available, 없으면 마지막 completed를 고른다", () => {
    expect(
      nextMapScrollTarget([
        entry("a", "completed"),
        entry("b", "available"),
        entry("c", "available"),
      ]),
    ).toEqual(unit("b"));
    expect(
      nextMapScrollTarget([entry("a", "completed"), entry("b", "completed"), entry("c", "locked")]),
    ).toEqual(unit("b"));
    expect(
      nextMapScrollTarget([entry("a", "completed"), entry("b", "locked"), entry("c", "completed")]),
    ).toEqual(unit("c"));
  });
});

describe("유닛 목록", () => {
  test("N13. 튜토리얼 목록은 항목 순서 그대로이고 상태가 mapItemStatus와 같다", () => {
    const progress = progressAfter(5);
    const entries = tutorialUnitEntries(journeyMapSections, progress);

    expect(entries.map((entry) => entry.domId)).toEqual(
      [
        "tutorial-intro",
        "greeting",
        "introduction",
        "ordering",
        "appointment",
        "appointment-confirmation",
        "appointment-confirmation-phone-call",
        "cafe-arrival-visual-novel",
        "directions",
        "tutorial-listening",
        "tutorial-speaking",
        "tutorial-writing",
        "tutorial-final-test",
      ].map(mapUnitDomId),
    );
    expect(entries.map((entry) => entry.status)).toEqual(
      tutorialItems.map((item) => mapItemStatus(item, tutorialItems, progress)),
    );
    expect(new Set(entries.map((entry) => entry.status)).size).toBe(3);
  });

  test("N14. 카탈로그 목록은 표지 → 레슨 → 최종 순이고 unavailable은 0개다", () => {
    const sections: readonly CatalogMapSection[] = [ready("a", 8), unavailable("b"), ready("c", 3)];
    const gate: CatalogGate = { tutorialPassed: true, progress: { a: ["intro", "S1"] } };
    const entries = catalogUnitEntries(sections, gate);

    expect(entries).toHaveLength(10 + 0 + 5);

    const expected: MapUnitEntry[] = [];
    sections.forEach((section, index) => {
      if (section.kind !== "catalog-ready") return;
      expected.push({
        domId: catalogUnitDomId(section.episodeId, "intro"),
        status: catalogCoverStatus(sections, index, gate),
      });
      for (const node of catalogUnitNodesOf(section, gate.progress)) {
        expected.push({
          domId: catalogUnitDomId(section.episodeId, node.key),
          status: node.status,
        });
      }
    });
    expect(entries).toEqual(expected);
    expect(new Set(entries.map((entry) => entry.domId)).size).toBe(15);
  });
});
