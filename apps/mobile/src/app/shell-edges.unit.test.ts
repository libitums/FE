import { describe, expect, test } from "vitest";

import { legacyCatalogInput } from "../lib/episode-legacy.test-support";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { zeroSafeAreaInsets } from "../lib/safe-area";
import type { SafeAreaInsets } from "../lib/safe-area";
import { noLearnerProfile } from "./catalog-cover-wiring";
import type { CatalogActivityForm } from "./catalog-lesson-types";
import type { EpisodeContent } from "./episode-content";
import type { Screen } from "./nav-state";
import {
  catalogActivityFormOf,
  shellEdgeModeFor,
  shellInsetsFor,
  shellInsetsOf,
} from "./shell-edges";

// `unit` 계층: 셸 가장자리 모드 · 셸 인셋 · 카탈로그 현재 활동 학습형의 입출력만 봅니다.

const asScreen = (screen: object): Screen => screen as unknown as Screen;
const lesson = (unitKey: string, activityIndex: number, episodeId = "u01-water"): Screen =>
  asScreen({ name: "catalog-lesson", episodeId, unitKey, activityIndex });

const content: EpisodeContent = {
  catalog: buildEpisodeCatalog({
    bundled: legacyCatalogInput,
    cache: { manifest: null, episodes: {} },
  }),
  imageUrlOf: (path) => `https://cdn/${path}`,
  fillText: fillPlaceholders,
  audioTimingOf: () => null,
};
const source = { episodeContent: content, learnerFill: noLearnerProfile };

const fullBleedRoutes: readonly Screen[] = [
  asScreen({ name: "journey-entry" }),
  asScreen({ name: "catalog-cover", episodeId: "u01-water" }),
  asScreen({ name: "catalog-final", episodeId: "u01-water" }),
  asScreen({ name: "catalog-epilogue", episodeId: "u01-water" }),
];
const otherForms: readonly CatalogActivityForm[] = [
  "listening",
  "sentence-order",
  "word-choice",
  "vocab-card",
  "pair-match",
  "culture-card",
  "syllable-build",
  "read-aloud",
  "speak-word",
];
const paddedRoutes: readonly Screen[] = [
  asScreen({ name: "journey-map" }),
  asScreen({ name: "settings" }),
  asScreen({ name: "notifications" }),
  asScreen({ name: "catalog-unit-complete", episodeId: "u01-water", unitKey: "S3" }),
];

const ios: SafeAreaInsets = { top: 59, bottom: 34, left: 0, right: 0 };
const threeButton: SafeAreaInsets = { top: 24, bottom: 48, left: 0, right: 0 };
const topOnly = (top: number): SafeAreaInsets => ({ top, bottom: 0, left: 0, right: 0 });

describe("shellEdgeModeFor", () => {
  test.each(fullBleedRoutes.map((screen) => [screen.name, screen] as const))(
    "SE1. %s 는 어떤 학습형이어도 full-bleed다",
    (_name, screen) => {
      expect(shellEdgeModeFor(screen, null)).toBe("full-bleed");
      expect(shellEdgeModeFor(screen, "typing")).toBe("full-bleed");
    },
  );

  test("SE1. 카탈로그 레슨은 타자일 때만 keyboard-dock이다", () => {
    expect(shellEdgeModeFor(lesson("S6", 0), "typing")).toBe("keyboard-dock");
    expect(shellEdgeModeFor(lesson("S6", 0), null)).toBe("padded");
  });

  test.each(otherForms.map((form) => [form] as const))(
    "SE1. 카탈로그 레슨 + %s 는 padded다",
    (form) => {
      expect(shellEdgeModeFor(lesson("S3", 0), form)).toBe("padded");
    },
  );

  test.each(paddedRoutes.map((screen) => [screen.name, screen] as const))(
    "SE1. %s 는 typing을 줘도 padded다",
    (_name, screen) => {
      expect(shellEdgeModeFor(screen, "typing")).toBe("padded");
    },
  );
});

describe("shellInsetsFor", () => {
  test("SE2. 모드마다 셸이 잡을 인셋을 돌려준다", () => {
    expect(shellInsetsFor("padded", ios)).toEqual(ios);
    expect(shellInsetsFor("full-bleed", ios)).toEqual(zeroSafeAreaInsets);
    expect(shellInsetsFor("keyboard-dock", ios)).toEqual(topOnly(59));
    expect(shellInsetsFor("keyboard-dock", threeButton)).toEqual(topOnly(24));
    expect(ios).toEqual({ top: 59, bottom: 34, left: 0, right: 0 });
  });
});

describe("catalogActivityFormOf", () => {
  test("SE3. 실제 카탈로그에서 현재 활동의 학습형을 돌려준다", () => {
    const forms = [0, 1, 2, 3].map((index) =>
      catalogActivityFormOf(lesson("S4", index), content, noLearnerProfile),
    );

    expect(forms).toEqual(["vocab-card", "word-choice", "typing", "word-choice"]);
    expect(catalogActivityFormOf(lesson("S6", 0), content, noLearnerProfile)).toBe("typing");
  });

  test("SE3. 범위 밖 · 없는 에피소드 · 레슨이 아닌 route는 null이다", () => {
    expect(catalogActivityFormOf(lesson("S4", 99), content, noLearnerProfile)).toBeNull();
    expect(catalogActivityFormOf(lesson("S4", 0, "nope"), content, noLearnerProfile)).toBeNull();
    expect(
      catalogActivityFormOf(asScreen({ name: "journey-map" }), content, noLearnerProfile),
    ).toBeNull();
    expect(
      catalogActivityFormOf(
        asScreen({ name: "catalog-final", episodeId: "u01-water" }),
        content,
        noLearnerProfile,
      ),
    ).toBeNull();
  });
});

describe("shellInsetsOf", () => {
  test("SE4. 모드 판정과 인셋 계산을 합성한다", () => {
    expect(shellInsetsOf(lesson("S4", 2), ios, source)).toEqual(topOnly(59));
    expect(shellInsetsOf(lesson("S4", 1), ios, source)).toEqual(ios);
    expect(shellInsetsOf(fullBleedRoutes[0] as Screen, ios, source)).toEqual(zeroSafeAreaInsets);
    expect(shellInsetsOf(asScreen({ name: "settings" }), ios, source)).toEqual(ios);
  });
});
