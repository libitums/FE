import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import {
  decodeManifest,
  encodeManifestText,
  type EpisodeManifest,
  type ManifestDecodeResult,
} from "./episode-manifest";

// `unit` 계층: 순수 함수 `decodeManifest`의 입출력만 봅니다. message는 비교하지 않습니다.

type Wire = Record<string, unknown>;

const HASH = "a".repeat(64);

const entry = (id: string, order: number, extra: Wire = {}): Wire => ({
  id,
  order,
  title: `제목 ${id}`,
  schema: "delivery-2",
  version: "2026-10-12.1",
  sha256: HASH,
  bytes: 10,
  url: `episodes/${id}.json`,
  ...extra,
});

const manifest = (episodes: Wire[], extra: Wire = {}): Wire => ({
  schema: "manifest-1",
  generated_at: "2026-10-12T00:00:00Z",
  episodes,
  ...extra,
});

function failed(result: ManifestDecodeResult) {
  if (result.ok) {
    throw new Error("실패여야 하는데 ok === true 입니다");
  }
  return result.errors.map(({ code, path }) => ({ code, path }));
}

function passed(result: ManifestDecodeResult) {
  if (!result.ok) {
    throw new Error(`성공이어야 하는데 실패했습니다: ${JSON.stringify(result.errors)}`);
  }
  return result.manifest;
}

describe("decodeManifest", () => {
  test("M1. 정상 매니페스트는 order 오름차순으로 돌려준다", () => {
    const result = passed(
      decodeManifest(manifest([entry("u03-c", 3), entry("u02-b", 2), entry("u01-a", 1)])),
    );
    expect(result.generatedAt).toBe("2026-10-12T00:00:00Z");
    expect(result.episodes.map((e) => e.id)).toEqual(["u01-a", "u02-b", "u03-c"]);
    expect(result.episodes[0]).toEqual({
      id: "u01-a",
      order: 1,
      title: "제목 u01-a",
      schema: "delivery-2",
      version: "2026-10-12.1",
      sha256: HASH,
      bytes: 10,
      url: "episodes/u01-a.json",
    });
  });

  test('M2. schema가 "manifest-0"이면 schema-mismatch 하나만 돌려준다', () => {
    const errors = failed(decodeManifest(manifest([entry("u01-a", 1)], { schema: "manifest-0" })));
    expect(errors).toEqual([{ code: "schema-mismatch", path: "schema" }]);
  });

  test.each([
    ["63자", "a".repeat(63)],
    ["대문자", "A".repeat(64)],
  ])("M3. sha256이 형식에 맞지 않으면 invalid-shape (%s)", (_name, sha256) => {
    const errors = failed(decodeManifest(manifest([entry("u01-a", 1, { sha256 })])));
    expect(errors).toContainEqual({ code: "invalid-shape", path: "episodes[0].sha256" });
  });

  test("M4. 같은 id가 둘이면 duplicate-episode-id path episodes[1].id", () => {
    const errors = failed(decodeManifest(manifest([entry("u01-a", 1), entry("u01-a", 2)])));
    expect(errors).toContainEqual({ code: "duplicate-episode-id", path: "episodes[1].id" });
  });

  // 가드: 스캐폴드도 만족합니다.
  test.each([
    ["숫자", 42],
    ["null", null],
    ["빈 배열", []],
    ["문자열", "manifest-1"],
    ["undefined", undefined],
  ])("M5. 객체가 아닌 입력(%s)은 예외 없이 ok false", (_name, input) => {
    expect(decodeManifest(input).ok).toBe(false);
  });

  test("M6. 모르는 키는 버리고 min_client_level은 minClientLevel이 된다", () => {
    const withLevel = passed(
      decodeManifest(
        manifest([entry("u01-a", 1, { extra: "x" })], { extra: "y", min_client_level: 2 }),
      ),
    );
    expect(withLevel.minClientLevel).toBe(2);
    expect(JSON.stringify(withLevel)).not.toContain("extra");
    const without = passed(decodeManifest(manifest([entry("u01-a", 1)])));
    expect(without.minClientLevel).toBeUndefined();
  });
});

function parseOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

describe("decodeManifest — assets_bytes (ADR-0095 D3)", () => {
  test("EM5. assets_bytes가 0 이상 정수면 assetsBytes로 읽고, 없으면 키가 없다", () => {
    const decoded = passed(
      decodeManifest(manifest([entry("u01-a", 1, { assets_bytes: 2_500_000 }), entry("u02-b", 2)])),
    );
    expect(decoded.episodes[0]?.assetsBytes).toBe(2_500_000);
    expect(decoded.episodes[1]).not.toHaveProperty("assetsBytes");
  });

  test("EM5. 잘못된 assets_bytes(문자열 · 소수 · 음수 · null)는 그 값만 버리고 매니페스트는 받는다", () => {
    for (const bad of ["3MB", 1.5, -1, null]) {
      const decoded = passed(decodeManifest(manifest([entry("u01-a", 1, { assets_bytes: bad })])));
      expect(decoded.episodes[0]).not.toHaveProperty("assetsBytes");
    }
  });

  test("EM5. assetsBytes는 인코드로 왕복하고 bytes 다음 자리에 assets_bytes로 쓴다", () => {
    const decoded = passed(decodeManifest(manifest([entry("u01-a", 1, { assets_bytes: 1234 })])));
    const text = encodeManifestText(decoded);
    expect(decodeManifest(parseOrNull(text))).toEqual({ ok: true, manifest: decoded });
    const wire = parseOrNull(text) as { episodes: Record<string, unknown>[] };
    expect(Object.keys(wire.episodes[0] ?? {})).toEqual([
      "id",
      "order",
      "title",
      "schema",
      "version",
      "sha256",
      "bytes",
      "assets_bytes",
      "url",
    ]);
  });
});

describe("encodeManifestText", () => {
  const withLevel: EpisodeManifest = {
    generatedAt: "2026-10-12T00:00:00Z",
    minClientLevel: 2,
    episodes: [
      {
        id: "u04-x",
        order: 4,
        title: "제목",
        schema: "delivery-2",
        version: "2026-10-12.1",
        sha256: HASH,
        bytes: 10,
        url: "episodes/u04-x.json",
      },
    ],
  };

  test("EM1. 내장 · min_client_level 있는 매니페스트가 디코드로 왕복하고 키 순서가 계약대로다", () => {
    for (const manifest of [bundledCatalogInput.manifest, withLevel]) {
      const text = encodeManifestText(manifest);
      expect(decodeManifest(parseOrNull(text))).toEqual({ ok: true, manifest });
    }

    const keysOf = (manifest: EpisodeManifest): string[] =>
      Object.keys((parseOrNull(encodeManifestText(manifest)) as object | null) ?? {});
    expect(keysOf(withLevel)).toEqual(["schema", "generated_at", "min_client_level", "episodes"]);
    expect(keysOf(bundledCatalogInput.manifest)).toEqual(["schema", "generated_at", "episodes"]);
    expect(encodeManifestText(bundledCatalogInput.manifest)).not.toContain("min_client_level");
  });

  test("EM1. 항목의 키 순서는 id, order, title, schema, version, sha256, bytes, url이고 공백이 없다", () => {
    const text = encodeManifestText(withLevel);
    const parsed = parseOrNull(text) as { schema?: unknown; episodes?: object[] } | null;
    expect(parsed?.schema).toBe("manifest-1");
    expect(Object.keys(parsed?.episodes?.[0] ?? {})).toEqual([
      "id",
      "order",
      "title",
      "schema",
      "version",
      "sha256",
      "bytes",
      "url",
    ]);
    expect(text).toBe(JSON.stringify(parseOrNull(text)));
  });
});

describe("cover(표지 일러스트 경로)", () => {
  const withCover = (cover: unknown): Wire =>
    manifest([entry("u01-a", 1, { cover }), entry("u02-b", 2)]);

  test("EM-C1. cover가 있는 항목은 디코드 뒤 entry.cover로 남고 없는 항목엔 키가 없다", () => {
    const decoded = passed(decodeManifest(withCover("images/covers/u01-a.webp")));
    expect(decoded.episodes.map((e) => e.cover)).toEqual(["images/covers/u01-a.webp", undefined]);
    expect("cover" in (decoded.episodes[1] ?? {})).toBe(false);
  });

  test("EM-C2. 빈 문자열 · 공백만인 cover는 없음이고, 문자열이 아니면 invalid-shape", () => {
    for (const blank of ["", "   "]) {
      const decoded = passed(decodeManifest(withCover(blank)));
      expect("cover" in (decoded.episodes[0] ?? {})).toBe(false);
    }
    expect(failed(decodeManifest(withCover(123)))).toEqual([
      { code: "invalid-shape", path: "episodes[0].cover" },
    ]);
  });

  test("EM-C3. encode는 cover를 url 뒤에 쓰고 없으면 키를 안 쓴다 — 왕복", () => {
    const withLevel: EpisodeManifest = {
      generatedAt: "2026-10-12T00:00:00Z",
      episodes: [
        {
          id: "u04-x",
          order: 4,
          title: "제목",
          schema: "delivery-2",
          version: "2026-10-12.1",
          sha256: HASH,
          bytes: 10,
          url: "episodes/u04-x.json",
          cover: "images/covers/u04-x.webp",
        },
        {
          id: "u05-y",
          order: 5,
          title: "제목",
          schema: "delivery-2",
          version: "2026-10-12.1",
          sha256: HASH,
          bytes: 10,
          url: "episodes/u05-y.json",
        },
      ],
    };
    const text = encodeManifestText(withLevel);
    const parsed = parseOrNull(text) as { episodes?: Record<string, unknown>[] } | null;
    expect(Object.keys(parsed?.episodes?.[0] ?? {})).toEqual([
      "id",
      "order",
      "title",
      "schema",
      "version",
      "sha256",
      "bytes",
      "url",
      "cover",
    ]);
    expect("cover" in (parsed?.episodes?.[1] ?? {})).toBe(false);
    expect(decodeManifest(parseOrNull(text))).toEqual({ ok: true, manifest: withLevel });
  });
});
