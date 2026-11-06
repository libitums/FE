import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import { episodeAssetGroups, episodeAssetPaths } from "./episode-assets";

// `unit` 계층: 본문 와이어에서 받을 자산 경로(버킷 상대)를 뽑습니다.

describe("episodeAssetPaths", () => {
  test("EA1. `*image_url`은 선두 `content/`를 뗀 이미지 경로, `*audio_url`은 `audio/<id>.m4a`다 — 나온 순서대로 중복 없이", () => {
    const wire = {
      cover: { background_image_url: "content/images/u09/cover.jpg" },
      cuts: [
        { image_url: "images/u09/pre-1.jpg", audio_url: "u09/pre-1" },
        { image_url: "content/images/u09/cover.jpg", audio_url: "u09/pre-1" },
      ],
      roleplay: { turns: [{ player_audio_url: "u09/rp-2", example_audio_url: "u09/ex-1" }] },
      closing_image_url: "content/images/items/bag.jpg",
    };

    expect(episodeAssetPaths(wire)).toEqual([
      "images/u09/cover.jpg",
      "images/u09/pre-1.jpg",
      "audio/u09/pre-1.m4a",
      "audio/u09/rp-2.m4a",
      "audio/u09/ex-1.m4a",
      "images/items/bag.jpg",
    ]);
  });

  test("EA2. 빈 값 · 문자열 아님 · 규약 밖 음성 id · 위험한 이미지 경로는 빠진다", () => {
    const wire = {
      a: { image_url: "", audio_url: "" },
      b: { image_url: null, audio_url: 3 },
      c: { audio_url: "U09/Pre 1" },
      d: { image_url: "../secret.jpg" },
      e: { image_url: "/abs.jpg" },
      f: { image_url: "https://evil.example/x.jpg" },
      g: { image_brief: "not a path", audio: { ko: "말" } },
    };

    expect(episodeAssetPaths(wire)).toEqual([]);
  });

  test("EA3. 내장 u01-water — 이미지 16개(아바타 포함)와 음성이 모두 나오고 겹치지 않는다", () => {
    const paths = episodeAssetPaths(bundledCatalogInput.episodes["u01-water"]);
    const images = paths.filter((path) => path.startsWith("images/"));
    const audio = paths.filter((path) => path.startsWith("audio/"));

    expect(images).toHaveLength(16);
    expect(images).toContain("images/items/bag.webp");
    expect(images).toContain("images/u01-water/avatar.webp");
    expect(audio.length).toBeGreaterThan(0);
    expect(audio.every((path) => /^audio\/[a-z0-9/-]+\.m4a$/.test(path))).toBe(true);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test("EA4. 와이어가 객체가 아니면 빈 목록이다", () => {
    expect(episodeAssetPaths(null)).toEqual([]);
    expect(episodeAssetPaths("text")).toEqual([]);
  });
});

describe("episodeAssetGroups", () => {
  test("[U-EA5] steps[i] 아래 자산은 그 유닛, 그 밖의 자리는 common이고 스텝 순서가 유지된다", () => {
    const wire = {
      counterpart_avatar: "content/images/u09/avatar.webp",
      pre_cuts: [{ image_url: "images/u09/pre.jpg", audio_url: "u09/pre" }],
      dialogue: [{ audio_url: "u09/d1" }],
      post_cuts: [{ image_url: "images/u09/post.jpg" }],
      interlude: { cuts: [{ image_url: "images/u09/int.jpg" }] },
      words: [{ image_url: "images/u09/word.jpg", audio_url: "u09/word" }],
      steps: [
        { id: "S2", items: [{ image_url: "images/u09/s2.jpg" }] },
        {
          id: "S1",
          items: [{ audio_url: "u09/s1", options: [{ image_url: "images/u09/s1.jpg" }] }],
        },
      ],
    };

    const groups = episodeAssetGroups(wire);

    expect(groups.units.map((unit) => unit.key)).toEqual(["S2", "S1"]);
    expect(groups.units[0]?.paths).toEqual(["images/u09/s2.jpg"]);
    expect(groups.units[1]?.paths).toEqual(["audio/u09/s1.m4a", "images/u09/s1.jpg"]);
    expect(new Set(groups.common)).toEqual(
      new Set([
        "images/u09/avatar.webp",
        "images/u09/pre.jpg",
        "audio/u09/pre.m4a",
        "audio/u09/d1.m4a",
        "images/u09/post.jpg",
        "images/u09/int.jpg",
        "images/u09/word.jpg",
        "audio/u09/word.m4a",
      ]),
    );
    expect(groups.common).not.toContain("images/u09/s2.jpg");
  });

  test("[U-EA6] id 없는 스텝 · 객체 아닌 스텝은 common, steps가 배열이 아니면 전부 common, 객체가 아니면 빈 묶음", () => {
    const mixed = {
      steps: [
        { id: "S1", items: [{ image_url: "images/a/s1.jpg" }] },
        { items: [{ image_url: "images/a/noid.jpg" }] },
        { id: "", items: [{ image_url: "images/a/empty-id.jpg" }] },
        "text",
        null,
      ],
    };
    const groups = episodeAssetGroups(mixed);
    expect(groups.units).toEqual([{ key: "S1", paths: ["images/a/s1.jpg"] }]);
    expect([...groups.common].sort()).toEqual(["images/a/empty-id.jpg", "images/a/noid.jpg"]);

    const notArray = episodeAssetGroups({
      steps: { id: "S1", image_url: "images/a/x.jpg" },
      cover: { image_url: "images/a/c.jpg" },
    });
    expect(notArray.units).toEqual([]);
    expect([...notArray.common].sort()).toEqual(["images/a/c.jpg", "images/a/x.jpg"]);

    for (const bad of [null, undefined, "text", 3]) {
      expect(episodeAssetGroups(bad)).toEqual({ common: [], units: [] });
    }
  });

  test("[U-EA7] 같은 경로가 S1 · S2에 나오면 둘 다에 들고 묶음 안에서는 한 번, 공통과 유닛에 겹쳐도 각각이다", () => {
    const wire = {
      cover: { image_url: "images/a/shared.jpg" },
      steps: [
        {
          id: "S1",
          items: [
            { image_url: "images/a/shared.jpg" },
            { image_url: "images/a/shared.jpg" },
            { audio_url: "a/v2" },
          ],
        },
        { id: "S2", items: [{ audio_url: "a/v2" }] },
      ],
    };

    const groups = episodeAssetGroups(wire);

    expect(groups.common).toEqual(["images/a/shared.jpg"]);
    expect(groups.units[0]?.paths).toEqual(["images/a/shared.jpg", "audio/a/v2.m4a"]);
    expect(groups.units[1]?.paths).toEqual(["audio/a/v2.m4a"]);
  });

  test("[U-EA8] 내장 u01-water — common과 모든 유닛의 합집합이 episodeAssetPaths와 같고, 유닛 키는 S1~S8 · INT · CULT · RP이며 INT는 비어 있다", () => {
    // The test-support bundled fixture (2026-10-23) predates the INT step, so this case reads
    // the shipped episode file itself.
    const wire: unknown = JSON.parse(
      readFileSync(resolve(process.cwd(), "content/episodes/u01-water.json"), "utf8"),
    );

    const groups = episodeAssetGroups(wire);

    expect(new Set([...groups.common, ...groups.units.flatMap((unit) => unit.paths)])).toEqual(
      new Set(episodeAssetPaths(wire)),
    );
    expect(groups.units.map((unit) => unit.key).sort()).toEqual(
      ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "INT", "CULT", "RP"].sort(),
    );
    expect(groups.units.find((unit) => unit.key === "INT")?.paths).toEqual([]);
    expect(groups.common.length).toBeGreaterThan(0);
  });
});
