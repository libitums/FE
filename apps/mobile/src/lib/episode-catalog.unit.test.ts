import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import {
  buildEpisodeCatalog,
  compareVersions,
  CONTENT_CLIENT_LEVEL,
  type CatalogEntry,
  type CatalogInput,
} from "./episode-catalog";
import { minimalRoleplayTurnWire } from "./episode-content.test-support";
import type { ManifestEntry } from "./episode-manifest";
import { sha256Hex, utf8Bytes } from "./sha256";

// `unit` 계층: 순수 함수 `buildEpisodeCatalog`의 입출력만 봅니다.

type Wire = Record<string, unknown>;

const t3 = (ko: string): Wire => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });
const prompt = (): Wire => ({ ko: "질문", en: "question" });

const options = (count: number): Wire[] =>
  Array.from({ length: count }, (_, i) => {
    const option: Wire = {
      id: `o${i + 1}`,
      ko: `보기${i + 1}`,
      roman: `bogi${i + 1}`,
      correct: i === 0,
    };
    return i === 0 ? option : { ...option, why_wrong: "이 자리에 맞는 말이 아니다" };
  });

const roleLine = (id: string): Wire => ({
  id,
  type: "ROLE_LINE",
  mode: "choice",
  event: "R",
  prompt: prompt(),
  context: t3("상대 대사"),
  options: options(3),
  feedback: { correct: { ko: "맞아요" }, wrong_option: "o2" },
});

const step = (id: string, order: number, items: Wire[]): Wire => ({ id, order, items });

/** decodeEpisode를 통과하는 최소 에피소드(와이어). */
function minimalEpisode(unitId: string): Wire {
  const cut = (kind: string): Wire => ({
    index: 1,
    kind,
    cut_kind: "narration",
    narration: t3("지문"),
    image_brief: "brief",
    image_url: "",
  });
  const line = (seq: number): Wire => ({
    seq,
    role: seq % 2 === 1 ? "counterpart" : "player",
    text: t3(`대사${seq}`),
    audio_url: "",
  });
  return {
    schema: "delivery-2",
    unit_id: unitId,
    title: "최소 에피소드",
    day: 1,
    time_of_day: "낮",
    place: "최소 에피소드",
    counterpart: "미나",
    pre_cuts: [cut("pre")],
    dialogue: [line(1), line(2)],
    post_cuts: [cut("post")],
    steps: [step("S1", 1, [roleLine("S1-01")]), step("RP", 2, [minimalRoleplayTurnWire("RP-01")])],
    words: [{ id: "voca:1", ko: "물", roman: "mul", gloss_en: "water", role: "target" }],
    patterns: [{ id: "patt:1", ko: "{명사} 주세요", roman: "juseyo", gloss_en: "please give me" }],
  };
}

type Remote = { entry: Wire; text: string };

/** 테스트가 원문을 만들고 그 해시를 계산해 매니페스트 항목에 넣습니다. */
function remote(id: string, order: number, extra: Wire = {}, text?: string): Remote {
  const body = text ?? JSON.stringify(minimalEpisode(id));
  return {
    text: body,
    entry: {
      id,
      order,
      title: `제목 ${id}`,
      schema: "delivery-2",
      version: "2026-10-13.1",
      sha256: sha256Hex(utf8Bytes(body)),
      bytes: utf8Bytes(body).length,
      url: `episodes/${id}.json`,
      ...extra,
    },
  };
}

const manifestText = (remotes: Remote[], extra: Wire = {}): string =>
  JSON.stringify({
    schema: "manifest-1",
    generated_at: "2026-10-13T00:00:00Z",
    episodes: remotes.map((r) => r.entry),
    ...extra,
  });

function cacheOf(remotes: Remote[], withBodies = true, extra: Wire = {}): CatalogInput["cache"] {
  return {
    manifest: manifestText(remotes, extra),
    episodes: withBodies
      ? Object.fromEntries(remotes.map((r) => [r.entry.id as string, r.text]))
      : {},
  };
}

const input = (cache: CatalogInput["cache"]): CatalogInput => ({
  bundled: bundledCatalogInput,
  cache,
});
const EMPTY_CACHE: CatalogInput["cache"] = { manifest: null, episodes: {} };

function find(catalog: CatalogEntry[], id: string): CatalogEntry {
  const found = catalog.find((e) => e.id === id);
  if (found === undefined) {
    throw new Error(`${id} 항목이 없습니다`);
  }
  return found;
}

const summarize = (catalog: CatalogEntry[]) =>
  catalog.map((e) => ({
    id: e.id,
    status: e.status,
    ...(e.status === "locked" ? { reason: e.reason } : {}),
    ...(e.status === "ready" ? { source: e.source } : {}),
  }));

describe("buildEpisodeCatalog", () => {
  test("C1. 내장만 있으면 네 에피소드가 order 순으로 ready/bundled", () => {
    const catalog = buildEpisodeCatalog(input(EMPTY_CACHE));
    expect(catalog).toHaveLength(4);
    expect(catalog.map((e) => e.id)).toEqual([
      "u00-tutorial",
      "u01-water",
      "u02-checkin",
      "u03-mina",
    ]);
    expect(catalog.map((e) => e.order)).toEqual([0, 1, 2, 3]);
    expect(catalog.every((e) => e.status === "ready" && e.source === "bundled")).toBe(true);
  });

  test("C2. 원격 매니페스트에만 있고 본문이 없는 항목은 pending", () => {
    const catalog = buildEpisodeCatalog(input(cacheOf([remote("u04-x", 4)], false)));
    expect(catalog).toHaveLength(5);
    expect(find(catalog, "u04-x")).toMatchObject({ status: "pending", order: 4 });
  });

  test("C3. 본문 원문이 해시 · 바이트와 맞고 디코드되면 ready/cache", () => {
    const catalog = buildEpisodeCatalog(input(cacheOf([remote("u04-x", 4)])));
    const entry = find(catalog, "u04-x");
    expect(entry).toMatchObject({ status: "ready", source: "cache", version: "2026-10-13.1" });
    expect(entry.status === "ready" && entry.episode.id).toBe("u04-x");
    expect(entry.status === "ready" && entry.warnings).toEqual([]);
  });

  test.each([
    ["해시 불일치", (r: Remote) => ({ sha256: sha256Hex(utf8Bytes(`${r.text} `)) })],
    ["바이트 불일치", (r: Remote) => ({ bytes: (r.entry.bytes as number) + 1 })],
  ])("C4. %s이면 그 항목만 locked/integrity-mismatch", (_name, tamper) => {
    const good = remote("u04-x", 4);
    const bad = { ...good, entry: { ...good.entry, ...tamper(good) } };
    const catalog = buildEpisodeCatalog(input(cacheOf([bad])));
    expect(find(catalog, "u04-x")).toMatchObject({
      status: "locked",
      reason: "integrity-mismatch",
    });
    expect(catalog.filter((e) => e.status === "ready")).toHaveLength(4);
  });

  test.each([
    ["손상 JSON", "{"],
    ["디코드 실패", JSON.stringify({ schema: "delivery-2" })],
  ])("C5. %s는 locked/decode-failed", (_name, text) => {
    const catalog = buildEpisodeCatalog(input(cacheOf([remote("u04-x", 4, {}, text)])));
    expect(find(catalog, "u04-x")).toMatchObject({ status: "locked", reason: "decode-failed" });
  });

  test("C6. 지원하지 않는 schema는 본문이 있어도 locked/unsupported-schema", () => {
    const catalog = buildEpisodeCatalog(
      input(cacheOf([remote("u04-x", 4, { schema: "delivery-9" })])),
    );
    expect(find(catalog, "u04-x")).toMatchObject({
      status: "locked",
      reason: "unsupported-schema",
    });
  });

  test("C7. 원격 min_client_level이 높으면 원격에서 온 항목만 client-too-old", () => {
    const remotes = [remote("u04-x", 4), remote("u01-water", 1, { version: "2026-10-11.9" })];
    const catalog = buildEpisodeCatalog(
      input(cacheOf(remotes, true, { min_client_level: CONTENT_CLIENT_LEVEL + 1 })),
    );
    expect(find(catalog, "u04-x")).toMatchObject({ status: "locked", reason: "client-too-old" });
    for (const id of ["u00-tutorial", "u01-water", "u02-checkin", "u03-mina"]) {
      expect(find(catalog, id)).toMatchObject({ status: "ready", source: "bundled" });
    }
  });

  // W-1: 원격이 이겼어도 문제가 있으면 같은 id의 내장본이 ready로 남는다(이미 열리던 에피소드가 닫히면 안 된다).
  test("C7b. 원격이 이긴 내장 id도 min_client_level이 높으면 내장본 ready/bundled", () => {
    const catalog = buildEpisodeCatalog(
      input(
        cacheOf([remote("u01-water", 1)], true, { min_client_level: CONTENT_CLIENT_LEVEL + 1 }),
      ),
    );
    expect(find(catalog, "u01-water")).toMatchObject({ status: "ready", source: "bundled" });
  });

  test.each([
    ["본문 없음", () => cacheOf([remote("u01-water", 1)], false)],
    [
      "본문 해시 불일치",
      () => {
        const good = remote("u01-water", 1);
        const bad = { ...good, entry: { ...good.entry, sha256: sha256Hex(utf8Bytes("x")) } };
        return cacheOf([bad]);
      },
    ],
    ["schema 미지원", () => cacheOf([remote("u01-water", 1, { schema: "delivery-9" })])],
    [
      "min_client_level 높음",
      () => cacheOf([remote("u01-water", 1)], true, { min_client_level: CONTENT_CLIENT_LEVEL + 1 }),
    ],
  ])(
    "W1. 원격 u01이 높은 version이어도 %s이면 ready/bundled(pending · locked 아님)",
    (_n, make) => {
      const catalog = buildEpisodeCatalog(input(make()));
      expect(find(catalog, "u01-water")).toMatchObject({ status: "ready", source: "bundled" });
      expect(catalog.map((e) => e.id)).toEqual([
        "u00-tutorial",
        "u01-water",
        "u02-checkin",
        "u03-mina",
      ]);
    },
  );

  test("W1. 내장에 없는 id는 기존대로 pending / locked", () => {
    const catalog = buildEpisodeCatalog(
      input(cacheOf([remote("u04-x", 4), remote("u05-y", 5, { schema: "delivery-9" })], false, {})),
    );
    expect(find(catalog, "u04-x").status).toBe("pending");
    expect(find(catalog, "u05-y")).toMatchObject({
      status: "locked",
      reason: "unsupported-schema",
    });
  });

  test.each([
    ["더 높음", "2026-10-23.2", "cache"],
    ["같음", "2026-10-23.1", "bundled"],
    ["더 낮음", "2026-10-16.1", "bundled"],
  ])("C8. u01 원격 version이 내장보다 %s이면 source %s", (_name, version, source) => {
    const catalog = buildEpisodeCatalog(input(cacheOf([remote("u01-water", 1, { version })])));
    expect(find(catalog, "u01-water")).toMatchObject({ status: "ready", source });
  });

  test.each([
    ["원격 .10 > 내장 .9", "2026-10-12.10", "2026-10-12.9", "cache"],
    ["원격 .9 < 내장 .10", "2026-10-12.9", "2026-10-12.10", "bundled"],
  ])(
    "C9. version의 숫자 조각은 숫자로 비교한다 (%s)",
    (_name, remoteVersion, bundledVersion, source) => {
      const base = bundledCatalogInput.manifest.episodes[0] as ManifestEntry;
      const bundled: CatalogInput["bundled"] = {
        manifest: {
          generatedAt: "",
          episodes: [{ ...base, id: "u01-water", version: bundledVersion }],
        },
        episodes: { "u01-water": minimalEpisode("u01-water") },
      };
      const cache = cacheOf([remote("u01-water", 1, { version: remoteVersion })]);
      const catalog = buildEpisodeCatalog({ bundled, cache });
      expect(find(catalog, "u01-water")).toMatchObject({ status: "ready", source });
    },
  );

  test.each([
    ["손상 JSON", "{not json"],
    ["모양이 틀림", JSON.stringify({ schema: "manifest-1" })],
  ])("C10. 원격 매니페스트 원문이 %s이면 무시하고 내장 넷만 낸다", (_name, manifest) => {
    const catalog = buildEpisodeCatalog(input({ manifest, episodes: {} }));
    expect(summarize(catalog)).toEqual(summarize(buildEpisodeCatalog(input(EMPTY_CACHE))));
    expect(catalog.map((e) => e.id)).toEqual([
      "u00-tutorial",
      "u01-water",
      "u02-checkin",
      "u03-mina",
    ]);
  });

  test("C11. order가 같으면 id 사전순", () => {
    const catalog = buildEpisodeCatalog(
      input(cacheOf([remote("u04-b", 4), remote("u04-a", 4)], false)),
    );
    expect(catalog.map((e) => e.id).slice(4)).toEqual(["u04-a", "u04-b"]);
  });

  // 가드: 무예외 · 결정성은 스캐폴드도 만족합니다.
  test("C12. 입력을 바꾸지 않고 두 번 호출한 결과가 같다", () => {
    const given = input(cacheOf([remote("u04-x", 4), remote("u01-water", 1)]));
    const before = structuredClone(given);
    const first = buildEpisodeCatalog(given);
    const second = buildEpisodeCatalog(given);
    expect(given).toEqual(before);
    expect(second).toEqual(first);
  });
});

// C-1: Lynx 백그라운드(PrimJS)는 localeCompare의 옵션을 무시하고 Intl이 없어, 기기에서 ".10 < .9"가 됩니다.
// Node에서는 숫자 비교가 맞게 나와 동작 검사로는 못 잡으므로 소스를 검사합니다.
describe("compareVersions", () => {
  test.each([
    ["2026-10-12.10", "2026-10-12.9", 1],
    ["2026-10-12.9", "2026-10-12.10", -1],
    ["2026-10-12.1", "2026-10-12.1", 0],
    ["2026-10-13.1", "2026-10-12.99", 1],
    ["1.2", "1.2.1", -1],
    ["a", "b", -1],
  ])("V1. compareVersions(%s, %s)의 부호는 %i", (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });

  test("V2. src/lib/episode-*.ts 본문에 localeCompare · Intl이 없다", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(dir).filter(
      (name) => /^episode-.*\.ts$/.test(name) && !/\.test\.tsx?$/.test(name),
    );
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((name) => {
      const body = readFileSync(join(dir, name), "utf8");
      return body.includes("localeCompare") || body.includes("Intl");
    });
    expect(offenders).toEqual([]);
  });
});
