import { expect, test } from "vitest";

import {
  episodeNarrativeFor,
  episodeNarrativeProgressLabel,
  nextEpisodeNarrativeBeat,
} from "./episode-narrative";

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

test("[EN3] 진행 문구는 1부터 센다", () => {
  expect(episodeNarrativeProgressLabel(narrative, 0)).toBe(`1 / ${narrative.beats.length}`);
});
