import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { RefreshSummary } from "../lib/episode-refresh";
import {
  episodeContentRefreshedEventOf,
  mergeCatalogForSession,
  noEpisodeContent,
  refreshChangesCatalog,
} from "./episode-content";

// `unit` 계층: 세션 병합 · 갱신 변화 판정 · 갱신 이벤트 변환의 입출력만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const baseReady = realCatalog[0] as ReadyEntry;

function ready(
  id: string,
  order: number,
  version: string,
  source: "bundled" | "cache" = "bundled",
): ReadyEntry {
  return { ...baseReady, id, order, version, source };
}

function pending(id: string, order: number): CatalogEntry {
  return { status: "pending", id, order, title: `제목 ${id}`, version: "v1" };
}

function summary(overrides: Partial<RefreshSummary> = {}): RefreshSummary {
  return {
    manifest: "unchanged",
    fetched: [],
    locked: [],
    failed: [],
    removed: [],
    persisted: false,
    ...overrides,
  };
}

describe("mergeCatalogForSession", () => {
  test("EC1′. 이미 ready였던 항목은 next의 새 버전이 와도 prev를 유지하고 order → id로 정렬된다", () => {
    const prevU01 = ready("u01-water", 1, "v1");
    const prevU04 = ready("u04-x", 4, "v1", "cache");
    const nextU01 = ready("u01-water", 1, "v2");
    const nextU02 = pending("u02-checkin", 2);

    const merged = mergeCatalogForSession([prevU01, prevU04], [nextU01, nextU02]);

    expect(merged.map((entry) => entry.id)).toEqual(["u01-water", "u02-checkin", "u04-x"]);
    expect(merged[0]).toBe(prevU01);
    expect((merged[0] as ReadyEntry).version).toBe("v1");
    expect(merged[1]?.status).toBe("pending");
    expect(merged[2]).toBe(prevU04);
  });

  test("EC1″. prev에서 pending이던 항목이 next에서 ready면 next의 ready를 쓴다", () => {
    const nextU05 = ready("u05-x", 5, "v1", "cache");

    const merged = mergeCatalogForSession([pending("u05-x", 5)], [nextU05]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(nextU05);
  });

  test("EC1. order가 같으면 id 순으로 정렬한다", () => {
    const merged = mergeCatalogForSession(
      [ready("b-x", 2, "v1")],
      [ready("c-x", 2, "v1"), ready("a-x", 2, "v1")],
    );

    expect(merged.map((entry) => entry.id)).toEqual(["a-x", "b-x", "c-x"]);
  });

  test("EC2. next에서 같은 id가 pending이면 prev의 ready를 유지한다", () => {
    const prevU04 = ready("u04-x", 4, "v1", "cache");

    const merged = mergeCatalogForSession([prevU04], [pending("u04-x", 4)]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(prevU04);
  });

  test("EC2. next에서 같은 id가 locked여도 prev의 ready를 유지한다", () => {
    const prevU04 = ready("u04-x", 4, "v1", "cache");
    const locked: CatalogEntry = {
      status: "locked",
      id: "u04-x",
      order: 4,
      title: "제목",
      version: "v2",
      reason: "decode-failed",
    };

    const merged = mergeCatalogForSession([prevU04], [locked]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(prevU04);
  });

  test("EC3. prev에서 ready가 아니던 항목은 next에 없으면 결과에 없다", () => {
    const merged = mergeCatalogForSession([pending("u05-x", 5)], [ready("u01-water", 1, "v1")]);

    expect(merged.map((entry) => entry.id)).toEqual(["u01-water"]);
  });
});

describe("refreshChangesCatalog", () => {
  test.each([
    ["updated · 비어 있음", summary({ manifest: "updated" }), true],
    ["unchanged · fetched 있음", summary({ fetched: ["x"] }), true],
    ["unchanged · removed 있음", summary({ removed: ["x"] }), true],
    ["unchanged · 전부 빔", summary(), false],
    ["unavailable · 전부 빔", summary({ manifest: "unavailable" }), false],
    ["invalid · 전부 빔", summary({ manifest: "invalid" }), false],
  ])("EC4. %s", (_label, input, expected) => {
    expect(refreshChangesCatalog(input)).toBe(expected);
  });
});

describe("episodeContentRefreshedEventOf", () => {
  test("EC5. unavailable이면 null", () => {
    expect(episodeContentRefreshedEventOf(summary({ manifest: "unavailable" }))).toBeNull();
  });

  test("EC5. unchanged이고 fetched · locked · failed · removed가 모두 비면 null", () => {
    expect(episodeContentRefreshedEventOf(summary())).toBeNull();
    expect(episodeContentRefreshedEventOf(summary({ persisted: true }))).toBeNull();
  });

  test("EC6. 수는 10진 문자열, 사유는 중복 제거 · 사전순 · 쉼표 연결로 낸다", () => {
    const event = episodeContentRefreshedEventOf(
      summary({
        manifest: "updated",
        fetched: ["u04-x"],
        locked: [
          { id: "u05", reason: "decode-failed" },
          { id: "u06", reason: "client-too-old" },
          { id: "u07", reason: "decode-failed" },
        ],
        failed: [
          { id: "u08", reason: "network" },
          { id: "u09", reason: "http" },
        ],
        persisted: true,
      }),
    );

    expect(event).toStrictEqual({
      name: "episode_content_refreshed",
      manifest: "updated",
      fetchedCount: "1",
      lockedCount: "3",
      failedCount: "2",
      lockReasons: "client-too-old,decode-failed",
      failReasons: "http,network",
      persisted: true,
    });
  });

  test("EC6. 같은 실패 사유가 여럿이어도 한 번만 적는다", () => {
    const event = episodeContentRefreshedEventOf(
      summary({
        manifest: "updated",
        failed: [
          { id: "a", reason: "network" },
          { id: "b", reason: "network" },
        ],
      }),
    );

    expect(event?.failedCount).toBe("2");
    expect(event?.failReasons).toBe("network");
  });

  test("EC6. unchanged여도 removed가 있으면 이벤트를 낸다", () => {
    const event = episodeContentRefreshedEventOf(summary({ removed: ["u09"] }));

    expect(event?.manifest).toBe("unchanged");
    expect(event?.fetchedCount).toBe("0");
  });

  test("EC7. invalid는 수 0 · 사유 빈 문자열로 낸다", () => {
    const event = episodeContentRefreshedEventOf(summary({ manifest: "invalid" }));

    expect(event).toStrictEqual({
      name: "episode_content_refreshed",
      manifest: "invalid",
      fetchedCount: "0",
      lockedCount: "0",
      failedCount: "0",
      lockReasons: "",
      failReasons: "",
      persisted: false,
    });
  });
});

describe("noEpisodeContent", () => {
  test("EC8. 빈 카탈로그 · 경로 없음 · 무치환 포트다", () => {
    expect(noEpisodeContent.catalog).toEqual([]);
    expect(noEpisodeContent.imageUrlOf("a")).toBeNull();
    expect(noEpisodeContent.fillText("{이름}", {}, "ko")).toBe("{이름}");
  });
});

describe("순수성", () => {
  test("EC9. 입력을 바꾸지 않고 같은 입력이면 같은 결과다", () => {
    const prev = [ready("u01-water", 1, "v1"), ready("u04-x", 4, "v1", "cache")];
    const next = [ready("u01-water", 1, "v2"), pending("u02-checkin", 2)];
    const refreshed = summary({
      manifest: "updated",
      fetched: ["u04-x"],
      locked: [{ id: "u05", reason: "decode-failed" }],
      failed: [{ id: "u08", reason: "http" }],
      removed: ["u09"],
      persisted: true,
    });
    const snapshot = structuredClone({ prev, next, refreshed });

    const first = mergeCatalogForSession(prev, next);
    const second = mergeCatalogForSession(prev, next);
    const eventFirst = episodeContentRefreshedEventOf(refreshed);
    const eventSecond = episodeContentRefreshedEventOf(refreshed);

    expect({ prev, next, refreshed }).toEqual(snapshot);
    expect(second).toEqual(first);
    expect(eventSecond).toEqual(eventFirst);
    expect(refreshChangesCatalog(refreshed)).toBe(refreshChangesCatalog(refreshed));
  });
});
