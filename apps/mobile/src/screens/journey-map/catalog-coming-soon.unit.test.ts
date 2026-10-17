import { describe, expect, test } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import { catalogComingSoonOrdinal } from "./catalog-coming-soon";
import type { CatalogMapSection } from "./catalog-map.contract";

// `unit` 계층: 카탈로그 맨 끝 「다음 에피소드 준비 중」 구획의 번호와 문구입니다.

const ready = (episodeId: string, ordinal: number): CatalogMapSection => ({
  kind: "catalog-ready",
  episodeId,
  ordinal,
  title: episodeId,
  lessonKeys: ["S1"],
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: [],
});
const unavailable = (episodeId: string, ordinal: number): CatalogMapSection => ({
  kind: "catalog-unavailable",
  episodeId,
  ordinal,
  title: episodeId,
  reason: "pending",
});

describe("catalogComingSoonOrdinal", () => {
  test("CS1. 마지막 구획이 열린 에피소드면 그다음 번호다 — 에피소드가 늘면 따라 밀린다", () => {
    expect(catalogComingSoonOrdinal([ready("u01", 1), ready("u02", 2), ready("u03", 3)])).toBe(4);
    expect(catalogComingSoonOrdinal([ready("u01", 1)])).toBe(2);
  });

  test("CS2. 마지막 구획이 이미 준비 중 · 잠김이면 더 붙이지 않는다", () => {
    expect(catalogComingSoonOrdinal([ready("u01", 1), unavailable("u02", 2)])).toBeNull();
  });

  test("CS1b. 번호는 구획 수가 아니라 마지막 구획의 ordinal 다음이다 — 화면의 「Episode n.」과 같은 출처", () => {
    expect(catalogComingSoonOrdinal([ready("u03", 3)])).toBe(4);
    expect(catalogComingSoonOrdinal([ready("u01", 1), ready("u05", 5)])).toBe(6);
  });

  test("CS3. 카탈로그 구획이 없으면 붙이지 않는다", () => {
    expect(catalogComingSoonOrdinal([])).toBeNull();
  });
});

describe("catalogMap.comingSoon 문구", () => {
  test("CP1. 제목 · 안내 · 낭독 이름", () => {
    const copy = uiCopyEn.catalogMap.comingSoon;
    expect(copy.title).toBe("Coming soon");
    expect(copy.body).toBe("We're preparing the next story.");
    expect(copy.label("Episode 4.")).toBe(
      "Episode 4. Coming soon. We're preparing the next story.",
    );
  });
});
