import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import { episodeAssetPaths } from "./episode-assets";

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
