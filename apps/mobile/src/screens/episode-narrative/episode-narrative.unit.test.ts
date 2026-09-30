import { expect, test } from "vitest";

import { episodeNarrativeFor, nextEpisodeNarrativeBeat } from "./episode-narrative";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).

const narrative = episodeNarrativeFor("tutorial");

test("[EN1] 장면마다 화자 · 대사 · 번역이 비지 않는다", () => {
  expect(narrative.beats.length).toBeGreaterThan(0);
  for (const beat of narrative.beats) {
    expect(beat.speakerName.trim()).not.toBe("");
    expect(beat.line.trim()).not.toBe("");
    expect(beat.translation.trim()).not.toBe("");
  }
});

test("[EN2] 다음 장면은 하나씩 늘고, 마지막 장면 뒤에는 null이다", () => {
  const last = narrative.beats.length - 1;
  expect(nextEpisodeNarrativeBeat(narrative, 0)).toBe(1);
  expect(nextEpisodeNarrativeBeat(narrative, last)).toBeNull();
});

test("[CE4] 화자 이름이 Yuna이고 대사 · 번역은 불변이다", () => {
  expect(narrative.beats.map((beat) => beat.speakerName)).toEqual(["Yuna", "Yuna", "Yuna"]);
  expect(narrative.beats.map((beat) => beat.line)).toEqual([
    "어서 오세요! 찾으시는 거 있으세요?",
    "처음 오셨죠? 제가 매장을 안내해 드릴게요.",
    "필요한 게 있으면 언제든 불러 주세요.",
  ]);
  expect(narrative.beats.map((beat) => beat.translation)).toEqual([
    "Welcome! Are you looking for anything?",
    "Is this your first visit? Let me show you around.",
    "Call me anytime if you need anything.",
  ]);
});
