import { describe, expect, test } from "vitest";

import { tutorialDoneProgress } from "../../app/test-helpers/progress-seed";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import { catalogMapSectionsOf } from "./catalog-map";
import type { CatalogMapSection } from "./catalog-map.contract";
import { catalogTutorialBypassed, mapGuideTargetOf } from "./catalog-gate";

// `unit` 계층: 첫 유닛 안내의 대상과 「옛 통과로 우회된 튜토리얼」 판정 — 구획 목록만 입력으로 보는 순수 함수.

const sections = catalogMapSectionsOf(
  buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: { manifest: null, episodes: {} } }),
);

const unavailable = (episodeId: string, ordinal: number): CatalogMapSection => ({
  kind: "catalog-unavailable",
  episodeId,
  ordinal,
  title: episodeId,
  reason: "pending",
});

describe("mapGuideTargetOf", () => {
  test("CG10. 첫 구획이 준비된 u00이면 그 id다", () => {
    expect(mapGuideTargetOf(sections)).toBe(TUTORIAL_EPISODE_ID);
  });

  test("CG10. 첫 구획이 다른 id · 준비 안 됨 · 빈 목록이면 null이다", () => {
    expect(mapGuideTargetOf(sections.slice(1))).toBeNull();
    expect(
      mapGuideTargetOf([unavailable(TUTORIAL_EPISODE_ID, 0), ...sections.slice(1)]),
    ).toBeNull();
    expect(mapGuideTargetOf([])).toBeNull();
  });
});

describe("catalogTutorialBypassed", () => {
  test("CG11. 옛 통과 + u00 미완료면 true다", () => {
    expect(catalogTutorialBypassed(sections, { legacyTutorialPassed: true, progress: {} })).toBe(
      true,
    );
    expect(
      catalogTutorialBypassed(sections, {
        legacyTutorialPassed: true,
        progress: { [TUTORIAL_EPISODE_ID]: ["intro", "S1"] },
      }),
    ).toBe(true);
  });

  test("CG11. u00 완료 · 옛 통과 없음 · u00 구획 없음(또는 준비 안 됨)이면 false다", () => {
    expect(
      catalogTutorialBypassed(sections, {
        legacyTutorialPassed: true,
        progress: tutorialDoneProgress(),
      }),
    ).toBe(false);
    expect(catalogTutorialBypassed(sections, { legacyTutorialPassed: false, progress: {} })).toBe(
      false,
    );
    expect(
      catalogTutorialBypassed(sections.slice(1), { legacyTutorialPassed: true, progress: {} }),
    ).toBe(false);
    expect(
      catalogTutorialBypassed([unavailable(TUTORIAL_EPISODE_ID, 0), ...sections.slice(1)], {
        legacyTutorialPassed: true,
        progress: {},
      }),
    ).toBe(false);
  });
});
