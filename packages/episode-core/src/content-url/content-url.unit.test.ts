import { describe, expect, test, vi } from "vitest";

import {
  CONTENT_AUDIO_DIR,
  CONTENT_BUCKET_PATH,
  contentAudioPathOf,
  contentAudioSourceOf,
  contentBaseUrl,
  hasContentPlaceholder,
  resolveContentUrlSafe,
} from "./index";

// `unit` 계층: 콘텐츠 버킷 주소 · 음성 주소 규약.

const base = "https://x.supabase.co/storage/v1/object/public/content/";

describe("contentBaseUrl · resolveContentUrlSafe", () => {
  test("CU1. 프로젝트 주소 끝의 / 여럿을 걷고 버킷 경로를 붙인다", () => {
    expect(CONTENT_BUCKET_PATH).toBe("/storage/v1/object/public/content/");
    expect(contentBaseUrl("https://x.supabase.co//")).toBe(base);
    expect(contentBaseUrl("https://x.supabase.co")).toBe(base);
  });

  test("CU1. 선두 content/는 한 번만 뗀다", () => {
    expect(resolveContentUrlSafe(base, "content/images/a.webp")).toBe(`${base}images/a.webp`);
    expect(resolveContentUrlSafe(base, "images/a.webp")).toBe(`${base}images/a.webp`);
    expect(resolveContentUrlSafe(base, "content/content/a.webp")).toBe(`${base}content/a.webp`);
  });

  test("CU1. 빈 경로 · 선두 / · .. 조각 · 스킴은 null", () => {
    expect(resolveContentUrlSafe(base, "")).toBeNull();
    expect(resolveContentUrlSafe(base, "content/")).toBeNull();
    expect(resolveContentUrlSafe(base, "/images/a.webp")).toBeNull();
    expect(resolveContentUrlSafe(base, "images/../secret")).toBeNull();
    expect(resolveContentUrlSafe(base, "https://evil.test/a.m4a")).toBeNull();
  });
});

describe("contentAudioPathOf · contentAudioSourceOf", () => {
  test("CU2. 규약에 맞는 id는 audio/<id>.m4a를 contentUrlOf에 넘긴 값", () => {
    const contentUrlOf = vi.fn<(path: string) => string | null>((path) => `${base}${path}`);
    expect(contentAudioSourceOf("u00-tutorial/d-01", "안녕", contentUrlOf)).toBe(
      `${base}audio/u00-tutorial/d-01.m4a`,
    );
    expect(contentUrlOf).toHaveBeenCalledWith("audio/u00-tutorial/d-01.m4a");
    expect(CONTENT_AUDIO_DIR).toBe("audio/");
    expect(contentAudioPathOf("u00-tutorial/d-01")).toBe("audio/u00-tutorial/d-01.m4a");
  });

  test.each([
    ["빈 id", ""],
    ["undefined", undefined],
    ["대문자", "A/b"],
    ["점", "a.b"],
    ["공백", "a b"],
  ] as const)("CU2. %s이면 null이고 contentUrlOf를 부르지 않는다", (_name, id) => {
    const contentUrlOf = vi.fn<(path: string) => string | null>((path) => `${base}${path}`);
    expect(contentAudioSourceOf(id, "안녕", contentUrlOf)).toBeNull();
    expect(contentUrlOf).not.toHaveBeenCalled();
  });

  test("CU2. 자리표시자 {name}이 든 줄은 null이고 contentUrlOf를 부르지 않는다", () => {
    const contentUrlOf = vi.fn<(path: string) => string | null>((path) => `${base}${path}`);
    expect(hasContentPlaceholder("저는 {name}이에요")).toBe(true);
    expect(hasContentPlaceholder("저는 {}이에요")).toBe(false);
    expect(contentAudioSourceOf("u01-water/d-01", "저는 {name}이에요", contentUrlOf)).toBeNull();
    expect(contentUrlOf).not.toHaveBeenCalled();
  });

  test("CU2. 규약 밖 id는 contentAudioPathOf도 null", () => {
    expect(contentAudioPathOf("A/b")).toBeNull();
    expect(contentAudioPathOf("a.b")).toBeNull();
    expect(contentAudioPathOf("")).toBeNull();
  });
});
