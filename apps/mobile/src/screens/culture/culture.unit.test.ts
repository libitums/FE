import { describe, expect, it } from "vitest";

import type { JourneyStepId } from "../journey-map/journey-map";
import { cultureNarrativeForStep, cultureScreenTitle, type CultureNarrative } from "./culture";

// 기대값의 정본은 계약입니다 — 구현에서 베끼지 않습니다.
//
// DOM·컴포넌트를 import하지 않습니다 — 순수 함수 둘만 봅니다.
// toHaveClass·toHaveStyle·toBeVisible 같은 매처가 한 줄도 없습니다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).
//
// ⚠ 어느 스텝이 어떤 서사를 갖는지 문자열로 단언하지 않습니다 — 값이 임시라 박으면
// 교체가 공짜가 아니게 됩니다. `learningFormForStep`의 기존 unit이 쓴 규율
// (journey-map.unit.test.ts)과 같습니다.

const allStepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

describe("cultureScreenTitle", () => {
  it("서수 3은 3단계 · 문화다", () => {
    expect(cultureScreenTitle(3)).toBe("3단계 · 문화");
  });

  it("서수 1은 1단계 · 문화다", () => {
    expect(cultureScreenTitle(1)).toBe("1단계 · 문화");
  });

  it("여정의 마지막 서수 5도 같은 형식이다", () => {
    expect(cultureScreenTitle(5)).toBe("5단계 · 문화");
  });
});

describe("cultureNarrativeForStep — 총성", () => {
  it("다섯 스텝 어느 것에도 던지지 않는다", () => {
    for (const id of allStepIds) {
      expect(() => cultureNarrativeForStep(id)).not.toThrow();
    }
  });

  it("다섯 스텝 어느 것에도 undefined를 돌려주지 않는다", () => {
    for (const id of allStepIds) {
      expect(cultureNarrativeForStep(id)).not.toBeUndefined();
    }
  });
});

describe("cultureNarrativeForStep — 내용 불변식", () => {
  // ⚠ 서사 문자열 자체는 단언하지 않습니다 — 파일 상단 주석을 참고합니다. 여기서
  // 보는 것은 「제목이 있는가·문단이 최소 하나인가·빈 문단이 없는가」뿐입니다.

  it("다섯 스텝 각각에서 title이 빈 문자열이 아니다", () => {
    for (const id of allStepIds) {
      const narrative: CultureNarrative = cultureNarrativeForStep(id);

      expect(narrative.title).not.toBe("");
    }
  });

  it("다섯 스텝 각각에서 문단이 최소 하나다", () => {
    for (const id of allStepIds) {
      const narrative = cultureNarrativeForStep(id);

      expect(narrative.paragraphs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("다섯 스텝 각각에서 모든 문단이 빈 문자열이 아니다", () => {
    for (const id of allStepIds) {
      const narrative = cultureNarrativeForStep(id);

      for (const paragraph of narrative.paragraphs) {
        expect(paragraph).not.toBe("");
      }
    }
  });
});

describe("cultureNarrativeForStep — 부수효과 없음", () => {
  it("같은 스텝을 두 번 불러도 같은 값이다", () => {
    for (const id of allStepIds) {
      expect(cultureNarrativeForStep(id)).toEqual(cultureNarrativeForStep(id));
    }
  });
});
