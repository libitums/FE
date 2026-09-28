import { describe, expect, it } from "vitest";

import { episodeFinalTestFor } from "../screens/episode-final/episode-final-tests";
import { journeyMapSections } from "../screens/journey-map/journey-map";
import { episodePrologueFor } from "./episode-prologues";

// `unit` 계층: 조회 함수의 입출력만 봅니다 (ADR-0006 D4). 대본의 값은 임시라 단언하지
// 않습니다 — 단언하는 것은 형식과 모양입니다.

describe("episodePrologueFor", () => {
  it("R1. 튜토리얼의 서사는 비주얼 노벨이고 장면이 있다", () => {
    const prologue = episodePrologueFor("tutorial");

    expect(prologue?.kind).toBe("visual-novel");
    if (prologue?.kind === "visual-novel") {
      expect(prologue.narrative.beats.length).toBeGreaterThan(0);
    }
  });

  it("R2. 서사가 없는 에피소드는 던지지 않고 undefined다", () => {
    expect(episodePrologueFor("no-such-episode")).toBeUndefined();
  });
});

describe("서사 형식과 최종 테스트 형식", () => {
  // 최종 테스트의 형식은 그 에피소드의 서사 형식을 따릅니다(2026-09-28 결정). 두 표가 따로
  // 있어 어긋날 수 있으므로 여기서 맞춰 봅니다. 메신저 서사의 최종 테스트 형식은 아직 없습니다.
  it("R3. 서사가 통화 · 비주얼 노벨인 에피소드는 최종 테스트도 같은 형식이다", () => {
    for (const section of journeyMapSections) {
      const prologue = episodePrologueFor(section.episode.id);
      for (const item of section.items) {
        if (item.kind !== "episode-final" || prologue === undefined) {
          continue;
        }
        if (prologue.kind === "call" || prologue.kind === "visual-novel") {
          expect(episodeFinalTestFor(item.id).format).toBe(prologue.kind);
        }
      }
    }
  });
});
