import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import {
  CONTENT_AUDIO_DIR,
  contentAudioPathOf,
  contentAudioSourceOf,
  hasContentPlaceholder,
} from "./content-audio";
import { contentBaseUrl, resolveContentUrlSafe } from "./episode-remote";

// `unit` 계층: 음성 id → 재생 주소 순수 함수의 입출력만 봅니다.

describe("contentAudioPathOf", () => {
  test("CA1. 규약에 맞는 id는 audio/<id>.m4a 이다", () => {
    expect(CONTENT_AUDIO_DIR).toBe("audio/");
    expect(contentAudioPathOf("u01-water/d-01")).toBe("audio/u01-water/d-01.m4a");
    expect(contentAudioPathOf("u01-water/pre-3")).toBe("audio/u01-water/pre-3.m4a");
    expect(contentAudioPathOf("greeting-1")).toBe("audio/greeting-1.m4a");
  });

  test.each([
    "",
    "/u01-water/d-01",
    "u01-water/d-01/",
    "u01-water//d-01",
    "../d-01",
    "u01-water/../d-01",
    "u01-water/./d-01",
    "u01-water/d-01.m4a",
    "https://evil.example/x",
    "u01:water/d-01",
    "U01-water/d-01",
    "u01-water/d 01",
    " u01-water/d-01",
    "u01-water\\d-01",
    "-u01/d-01",
    "u01-/d-01",
  ])("CA2. 규약 밖 id %j는 null이다", (id) => {
    expect(contentAudioPathOf(id)).toBeNull();
  });
});

describe("hasContentPlaceholder", () => {
  test.each(["{이름}(으)로 예약했어요.", "저는 {나라}에서 왔어요."])(
    "CA3. 자리표시자가 있으면 true: %s",
    (text) => {
      expect(hasContentPlaceholder(text)).toBe(true);
    },
  );

  test.each(["봉투 드릴까요?", "{}", ""])("CA3. 자리표시자가 없으면 false: %j", (text) => {
    expect(hasContentPlaceholder(text)).toBe(false);
  });
});

describe("contentAudioSourceOf", () => {
  test.each([
    ["id 없음", undefined, "봉투 드릴까요?"],
    ["빈 id", "", "봉투 드릴까요?"],
    ["자리표시자 줄", "u02-checkin/d-02", "{이름}(으)로 예약했어요."],
    ["규약 밖 id", "../d-01", "봉투 드릴까요?"],
  ])("CA4. %s이면 null이고 해석기를 부르지 않는다", (_name, id, ko) => {
    const resolver = vi.fn((path: string) => `https://cdn/${path}`);
    expect(contentAudioSourceOf(id, ko, resolver)).toBeNull();
    expect(resolver).not.toHaveBeenCalled();
  });

  test("CA4. 정상이면 해석기를 한 번 부르고 그 값을 그대로 돌려준다", () => {
    const resolver = vi.fn((path: string) => `https://cdn/${path}`);
    expect(contentAudioSourceOf("u01-water/d-02", "네, 있어요.", resolver)).toBe(
      "https://cdn/audio/u01-water/d-02.m4a",
    );
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledWith("audio/u01-water/d-02.m4a");
  });

  test("CA4. 해석기가 null이면 null이다", () => {
    expect(contentAudioSourceOf("u01-water/d-02", "네, 있어요.", () => null)).toBeNull();
  });

  test("CA5. 실제 해석기와 합성하면 버킷 공개 주소가 된다", () => {
    const base = contentBaseUrl("https://abc.supabase.co/");
    expect(
      contentAudioSourceOf("u01-water/pre-3", "어서 오세요.", (path) =>
        resolveContentUrlSafe(base, path),
      ),
    ).toBe("https://abc.supabase.co/storage/v1/object/public/content/audio/u01-water/pre-3.m4a");
  });
});

describe("content-audio 모듈 원문", () => {
  test("CA6. import · background-only · localeCompare · Intl이 없다", () => {
    const text = readFileSync(resolve(process.cwd(), "src/lib/content-audio.ts"), "utf8");
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bimport\b/);
    expect(code).not.toContain("background-only");
    expect(code).not.toContain("localeCompare");
    expect(code).not.toMatch(/\bIntl\b/);
  });
});
