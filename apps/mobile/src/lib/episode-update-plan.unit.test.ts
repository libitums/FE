import { describe, expect, test } from "vitest";

import { contentAssetsKey } from "./episode-asset-sync";
import { contentEpisodeKey } from "./episode-cache";
import type { EpisodeManifest, ManifestEntry } from "./episode-manifest";
import {
  activeReadyIds,
  matchesEntry,
  planEpisodeUpdates,
  splashEpisodeIds,
  winsOverBundled,
  type EpisodeUpdatePlanInput,
  type PlannedEpisode,
} from "./episode-update-plan";
import { fakeStore, remote } from "./episode-refresh.test-support";
import { entryOf, manifestOf, markerText, versioned } from "./episode-update.test-support";

// `unit` 계층: 받은 매니페스트의 항목을 new · changed · current · bundled로 가르고 받을 차례를 정하는
// 순수 함수와, 활성 셋에서 「지금 열리는 id」를 읽는 함수를 봅니다.

const OLD = "2026-10-13.1";
const NEW = "2026-10-14.1";

const bundledEntry = entryOf(remote("u01-water", 1, { version: "2026-10-12.1" }));
const bundled: EpisodeManifest = { generatedAt: "2026-10-12T00:00:00Z", episodes: [bundledEntry] };

const X1 = versioned("u04-x", 4, OLD, "옛 제목", "without");
const X2 = versioned("u04-x", 4, NEW, "새 제목", "without");

function input(over: Partial<EpisodeUpdatePlanInput>): EpisodeUpdatePlanInput {
  return {
    bundled,
    received: manifestOf([]),
    active: null,
    activeReady: new Set(),
    ...over,
  };
}

const summarize = (plan: readonly PlannedEpisode[]) =>
  plan.map((planned) => `${planned.entry.id}:${planned.kind}`);

const kindOf = (plan: readonly PlannedEpisode[], id: string) =>
  plan.find((planned) => planned.entry.id === id)?.kind;

describe("planEpisodeUpdates", () => {
  test("PL1. 내장에 없는 원격 항목을 활성에서도 열지 않았으면 new다", () => {
    const plan = planEpisodeUpdates(input({ received: manifestOf([X2]) }));

    expect(kindOf(plan, "u04-x")).toBe("new");
    expect(plan.find((planned) => planned.entry.id === "u04-x")?.entry).toEqual(entryOf(X2));
  });

  test("PL2. 활성이 원격 ready이고 받은 항목의 sha가 다르면 changed다", () => {
    const plan = planEpisodeUpdates(
      input({
        received: manifestOf([X2]),
        active: manifestOf([X1]),
        activeReady: new Set(["u04-x"]),
      }),
    );

    expect(kindOf(plan, "u04-x")).toBe("changed");
    expect(plan.find((planned) => planned.entry.id === "u04-x")?.entry).toEqual(entryOf(X2));
  });

  test("PL3. 내장 id의 원격 version이 더 높으면 내장이 열고 있으므로 changed다", () => {
    const higher = remote("u01-water", 1, { version: "2099-01-01.1" });

    const plan = planEpisodeUpdates(input({ received: manifestOf([higher]) }));

    expect(kindOf(plan, "u01-water")).toBe("changed");
  });

  test("PL4. 활성 ready이고 같은 sha면 current다", () => {
    const plan = planEpisodeUpdates(
      input({
        received: manifestOf([X1]),
        active: manifestOf([X1]),
        activeReady: new Set(["u04-x"]),
      }),
    );

    expect(kindOf(plan, "u04-x")).toBe("current");
  });

  test("PL5. 원격이 내장보다 낮거나 같으면 bundled이고, 내장에만 있는 id도 bundled로 남는다", () => {
    const same = remote("u01-water", 1, { version: "2026-10-12.1" });
    const lower = remote("u01-water", 1, { version: "2000-01-01.1" });

    expect(kindOf(planEpisodeUpdates(input({ received: manifestOf([same]) })), "u01-water")).toBe(
      "bundled",
    );
    expect(kindOf(planEpisodeUpdates(input({ received: manifestOf([lower]) })), "u01-water")).toBe(
      "bundled",
    );
    expect(summarize(planEpisodeUpdates(input({ received: manifestOf([X2]) })))).toContain(
      "u01-water:bundled",
    );
  });

  test("PL5. 원격에만 있고 활성에 항목은 있지만 ready가 아니면(자산이 덜 왔음) new다", () => {
    const plan = planEpisodeUpdates(
      input({
        received: manifestOf([X2]),
        active: manifestOf([X1]),
        activeReady: new Set(),
      }),
    );

    expect(kindOf(plan, "u04-x")).toBe("new");
  });

  test("PL6. 차례는 new · changed가 order 순으로 먼저, 그다음 current · bundled가 order 순이고 같은 order는 id 사전순이다", () => {
    const current = versioned("u04-c", 4, OLD, "그대로", "without");
    const changedOld = versioned("u05-h", 5, OLD, "옛", "without");
    const changedNew = versioned("u05-h", 5, NEW, "새", "without");
    const newer = versioned("u06-n", 6, OLD, "새 에피소드", "without");
    const twinB = versioned("u07-b", 7, OLD, "쌍둥이 b", "without");
    const twinA = versioned("u07-a", 7, OLD, "쌍둥이 a", "without");
    const bundledSame = remote("u01-water", 1, { version: "2026-10-12.1" });

    const plan = planEpisodeUpdates(
      input({
        received: manifestOf([bundledSame, current, changedNew, newer, twinB, twinA]),
        active: manifestOf([current, changedOld]),
        activeReady: new Set(["u04-c", "u05-h"]),
      }),
    );

    expect(summarize(plan)).toEqual([
      "u05-h:changed",
      "u06-n:new",
      "u07-a:new",
      "u07-b:new",
      "u01-water:bundled",
      "u04-c:current",
    ]);
  });

  test("PL7. 지원하지 않는 schema · client-too-old 항목은 계획에 넣지 않는다", () => {
    const unsupported = remote("u08-z", 8, { schema: "delivery-9" });

    const withUnsupported = planEpisodeUpdates(input({ received: manifestOf([X2, unsupported]) }));
    expect(withUnsupported.map((planned) => planned.entry.id)).not.toContain("u08-z");
    expect(kindOf(withUnsupported, "u04-x")).toBe("new");

    const tooOld = planEpisodeUpdates(
      input({ received: manifestOf([X2], { min_client_level: 99 }) }),
    );
    expect(tooOld.map((planned) => planned.entry.id)).not.toContain("u04-x");
  });
});

describe("splashEpisodeIds", () => {
  const plan: readonly PlannedEpisode[] = [
    { entry: entryOf(X1), kind: "changed" },
    { entry: entryOf(versioned("u05-n", 5, OLD, "새", "without")), kind: "new" },
    { entry: entryOf(versioned("u06-c", 6, OLD, "그대로", "without")), kind: "current" },
    { entry: bundledEntry, kind: "bundled" },
  ];

  test("PL7. available면 new · changed의 id를 계획 순서대로 내고 unavailable이면 빈 목록이다", () => {
    expect(splashEpisodeIds(plan, "available")).toEqual(["u04-x", "u05-n"]);
    expect(splashEpisodeIds(plan, "unavailable")).toEqual([]);
    expect(splashEpisodeIds([], "available")).toEqual([]);
  });
});

describe("activeReadyIds · matchesEntry · winsOverBundled", () => {
  const entry = (item: typeof X1): ManifestEntry => entryOf(item);

  function seed(opts: { body?: string; marker?: string | null }) {
    const data: Record<string, string> = {
      [contentEpisodeKey("u04-x")]: opts.body ?? X1.text,
    };
    if (opts.marker !== null) {
      data[contentAssetsKey("u04-x")] = opts.marker ?? markerText(X1);
    }
    return fakeStore(data).store;
  }
  const active = manifestOf([X1]);

  test("PL8. 본문이 sha와 맞고 표시가 그 sha면 두 모드 모두 포함한다", () => {
    const store = seed({});

    expect([...activeReadyIds(store, active, bundled, "required")]).toEqual(["u04-x"]);
    expect([...activeReadyIds(store, active, bundled, "not-required")]).toEqual(["u04-x"]);
  });

  test("PL8. 표시가 옛 sha면 required에서 빠지고 not-required에서는 포함한다", () => {
    const store = seed({ marker: markerText(X2) });

    expect(activeReadyIds(store, active, bundled, "required").has("u04-x")).toBe(false);
    expect(activeReadyIds(store, active, bundled, "not-required").has("u04-x")).toBe(true);
  });

  test("PL8. 본문 바이트가 항목과 다르거나 본문이 없으면 빠지고 활성이 null이면 비어 있다", () => {
    const changedBody = seed({ body: `${X1.text} ` });
    expect(activeReadyIds(changedBody, active, bundled, "not-required").has("u04-x")).toBe(false);

    const missingBody = fakeStore({ [contentAssetsKey("u04-x")]: markerText(X1) }).store;
    expect(activeReadyIds(missingBody, active, bundled, "not-required").has("u04-x")).toBe(false);

    expect(activeReadyIds(seed({}), null, bundled, "required").size).toBe(0);
  });

  test("PL8. 내장이 이기는 항목은 본문이 맞아도 빠진다", () => {
    const loser = remote("u01-water", 1, { version: "2000-01-01.1" });
    const store = fakeStore({
      [contentEpisodeKey("u01-water")]: loser.text,
      [contentAssetsKey("u01-water")]: markerText(loser),
    }).store;

    expect(
      activeReadyIds(store, manifestOf([loser]), bundled, "not-required").has("u01-water"),
    ).toBe(false);
  });

  test("PL8. matchesEntry는 바이트와 sha가 모두 맞을 때만 참이다", () => {
    expect(matchesEntry(entry(X1), X1.text)).toBe(true);
    expect(matchesEntry(entry(X1), X2.text)).toBe(false);
    expect(matchesEntry({ ...entry(X1), bytes: entry(X1).bytes + 1 }, X1.text)).toBe(false);
    expect(matchesEntry({ ...entry(X1), sha256: entry(X2).sha256 }, X1.text)).toBe(false);
  });

  test("PL8. winsOverBundled: 내장에 없거나 version이 높으면 참이고 같거나 낮으면 거짓이다", () => {
    const own = (version: string): ManifestEntry => ({ ...bundledEntry, version });

    expect(winsOverBundled(entry(X1), bundled)).toBe(true);
    expect(winsOverBundled(own("2026-10-12.2"), bundled)).toBe(true);
    expect(winsOverBundled(own("2026-10-12.10"), bundled)).toBe(true);
    expect(winsOverBundled(own("2026-10-12.1"), bundled)).toBe(false);
    expect(winsOverBundled(own("2026-10-11.9"), bundled)).toBe(false);
  });
});
