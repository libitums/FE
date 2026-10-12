import { describe, expect, test } from "vitest";

import { decodeManifest, type ManifestDecodeResult } from "./episode-manifest";

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
