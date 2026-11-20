import { expect, test } from "vitest";

import { letterAudioSourceOf } from "./letters-audio";

// `unit` 계층: 글자 소리는 음성 정보 파일에 id가 있고 주소가 풀릴 때만 납니다(ADR-0169) — 아직 버킷에 없으면 unavailable.

const url = (path: string) => `https://cdn.test/content/${path}`;

test("LA1. 음성 정보 파일에 있으면 버킷 주소", () => {
  const source = letterAudioSourceOf("가", {
    imageUrlOf: url,
    audioTimingOf: (id) => (id === "letters/ga" ? { durationMs: 600 } : null),
  });
  expect(source).toBe("https://cdn.test/content/audio/letters/ga.m4a");
});

test("LA2. 음성 정보 파일에 없으면 null(아직 올리지 않은 소리)", () => {
  expect(letterAudioSourceOf("가", { imageUrlOf: url, audioTimingOf: () => null })).toBeNull();
});

test("LA3. 주소를 못 풀면 null(콘텐츠 설정 없음)", () => {
  expect(
    letterAudioSourceOf("가", { imageUrlOf: () => null, audioTimingOf: () => ({ durationMs: 1 }) }),
  ).toBeNull();
});

test("LA4. 표에 없는 음절은 null", () => {
  expect(
    letterAudioSourceOf("밥", { imageUrlOf: url, audioTimingOf: () => ({ durationMs: 1 }) }),
  ).toBeNull();
});
