import { describe, expect, test, vi } from "vitest";

import { catalogChipAudioOf } from "./catalog-chip-audio";
import { cdnAudioUrlOf } from "./catalog-item-audio.test-support";
import type { CatalogLessonItemPort } from "./catalog-lesson-types";

// `unit` 계층: 칩(보기 · 조각) 원문 → 그 낱말 녹음의 재생 주소(ADR-0189).

const sourceOf = (id: string): string => `https://cdn/audio/${id}.m4a`;

function portWith(
  recorded: Record<string, readonly string[]>,
  audioUrlOf: (path: string) => string | null = cdnAudioUrlOf,
): Pick<CatalogLessonItemPort, "audioUrlOf" | "recordedAudioOf"> {
  return { audioUrlOf, recordedAudioOf: (ko) => recorded[ko.trim()] ?? [] };
}

describe("catalogChipAudioOf", () => {
  test("CA1. 칩마다 녹음 주소, 녹음이 없는 칩은 null", () => {
    const port = portWith({ 물: ["u01/word-mul"], "물 주세요.": ["u01/ex-mul"] });

    expect(catalogChipAudioOf(["물", "불", "물 주세요."], port)).toEqual([
      sourceOf("u01/word-mul"),
      null,
      sourceOf("u01/ex-mul"),
    ]);
  });

  test("CA2. 낱말 하나짜리 칩도 찾는다 — 정답 뒤 음성의 낱말 제외(ADR-0172 D2)와 달리 발음을 들려주는 자리", () => {
    expect(catalogChipAudioOf(["배"], portWith({ 배: ["u05/word-bae"] }))).toEqual([
      sourceOf("u05/word-bae"),
    ]);
  });

  test("CA3. 받은 파일이 있는 첫 녹음을 쓴다", () => {
    const audioUrlOf = (path: string): string | null =>
      path.includes("u02/") ? null : cdnAudioUrlOf(path);
    const port = portWith({ 물: ["u02/word-mul", "u01/word-mul"] }, audioUrlOf);

    expect(catalogChipAudioOf(["물"], port)).toEqual([sourceOf("u01/word-mul")]);
  });

  test("CA4. 자리표시자가 남은 원문은 소리를 내지 않는다", () => {
    const port = portWith({ "{name} 씨": ["u03/name"] });

    expect(catalogChipAudioOf(["{name} 씨", "물"], port)).toBeNull();
  });

  test("CA5. 칩 하나도 소리가 없거나 색인이 없으면 null — 문항에 키를 싣지 않는다", () => {
    expect(catalogChipAudioOf(["불"], portWith({}))).toBeNull();
    const audioUrlOf = vi.fn(() => "never");
    expect(catalogChipAudioOf(["물"], { audioUrlOf })).toBeNull();
    expect(audioUrlOf).not.toHaveBeenCalled();
  });
});
