import { afterEach, describe, expect, test } from "vitest";

import { catalogRoleplaySectionsOf } from "../app/roleplay-story-model";
import { noLearnerProfile } from "../app/catalog-cover-wiring";
import type { EpisodeContent } from "../app/episode-content";
import {
  canStartCatalogCover,
  canStartCatalogUnit,
  catalogCoverStatus,
  catalogMapSectionsOf,
  catalogUnitStatus,
} from "../screens/journey-map/catalog-map";
import type { CatalogGate, CatalogReadySection } from "../screens/journey-map/catalog-map.contract";
import { catalogUnitTicketCost } from "./catalog-ticket-cost";
import { bundledCatalogInput } from "./episode-bundled";
import { buildEpisodeCatalog } from "./episode-catalog";
import { fillPlaceholders } from "./placeholder-fill";
import { isTesterAccessActive, setTesterAccessActive, testerAccessFrom } from "./tester-access";

// `unit` 계층: 시험 계정 표시(ADR-0085) — 토큰 읽기, 켜졌을 때 티켓 비용 0 · 모든 구획과 유닛 열림 · 롤플레이 열림.

const tokenWith = (payload: unknown): string =>
  `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url")}.sig`;

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const sections = catalogMapSectionsOf(catalog);
const gate = { legacyTutorialPassed: false, progress: {} } as unknown as CatalogGate;
const u02 = sections.find((section) => section.episodeId === "u02-checkin") as CatalogReadySection;

afterEach(() => setTesterAccessActive(false));

describe("testerAccessFrom", () => {
  test("TA1. app_metadata.duru_tester가 정확히 true일 때만 참이다", () => {
    expect(testerAccessFrom(tokenWith({ app_metadata: { duru_tester: true } }))).toBe(true);
    expect(testerAccessFrom(tokenWith({ app_metadata: { duru_tester: "true" } }))).toBe(false);
    expect(testerAccessFrom(tokenWith({ app_metadata: { provider: "google" } }))).toBe(false);
    // 사용자가 고칠 수 있는 user_metadata의 같은 키는 보지 않는다.
    expect(testerAccessFrom(tokenWith({ user_metadata: { duru_tester: true } }))).toBe(false);
    expect(testerAccessFrom("not-a-jwt")).toBe(false);
    expect(testerAccessFrom(null)).toBe(false);
  });
});

describe("시험 계정이 켜지면", () => {
  test("TA2. 기본값은 꺼져 있고, 꺼져 있으면 지금 규칙 그대로다", () => {
    expect(isTesterAccessActive()).toBe(false);
    expect(catalogUnitTicketCost({}, "u02-checkin", "S1")).toBe(1);
    expect(catalogCoverStatus(sections, sections.indexOf(u02), gate)).toBe("locked");
    expect(catalogUnitStatus(u02, u02.lessonKeys[1] ?? "", {})).toBe("locked");
  });

  test("TA3. 새 유닛도 티켓 비용이 0이다", () => {
    setTesterAccessActive(true);
    expect(catalogUnitTicketCost({}, "u02-checkin", "S1")).toBe(0);
    expect(catalogUnitTicketCost({}, "u03-mina", u02.finalKey)).toBe(0);
  });

  test("TA4. 앞을 끝내지 않은 표지 · 레슨 · 최종이 모두 열리고, 끝낸 유닛은 끝낸 색 그대로다", () => {
    setTesterAccessActive(true);
    const index = sections.indexOf(u02);
    expect(catalogCoverStatus(sections, index, gate)).toBe("available");
    expect(canStartCatalogCover(sections, "u02-checkin", gate)).toBe(true);
    for (const key of [...u02.lessonKeys, u02.finalKey]) {
      expect(catalogUnitStatus(u02, key, {})).toBe("available");
      expect(canStartCatalogUnit(sections, "u02-checkin", key, {})).toBe(true);
    }
    const first = u02.lessonKeys[0] ?? "";
    expect(catalogUnitStatus(u02, first, { "u02-checkin": [first] })).toBe("completed");
    // 사슬에 없는 키는 여전히 잠김이다.
    expect(catalogUnitStatus(u02, "없는-키", {})).toBe("locked");
  });

  test("TA5. 에피소드를 끝내지 않아도 롤플레이 구획이 열린다", () => {
    const content: EpisodeContent = {
      catalog,
      imageUrlOf: (path) => `https://cdn/${path}`,
      audioUrlOf: () => null,
      fillText: fillPlaceholders,
      audioTimingOf: () => null,
    };
    const roleplay = () =>
      catalogRoleplaySectionsOf(content, sections, {}, noLearnerProfile, (n) => `Episode ${n}`);
    const locked = roleplay();
    expect(locked.length).toBeGreaterThan(0);
    expect(locked.every((section) => !section.unlocked)).toBe(true);
    setTesterAccessActive(true);
    expect(roleplay().every((section) => section.unlocked)).toBe(true);
  });
});
