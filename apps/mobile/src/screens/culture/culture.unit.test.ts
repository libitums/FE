import { describe, expect, it } from "vitest";

import type { JourneyStepId } from "../journey-map/journey-map";
import { cultureNarrativeForStep, cultureScreenTitle, type CultureNarrative } from "./culture";
import { uiCopyEn } from "../../lib/ui-copy-en";

// 기대값의 정본은 계약입니다 — 구현에서 베끼지 않습니다.
//
// DOM·컴포넌트를 import하지 않습니다 — 순수 함수 둘만 봅니다.
// toHaveClass·toHaveStyle·toBeVisible 같은 매처가 한 줄도 없습니다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).
//
// ⚠ 「내용 불변식」 블록은 서사 문자열을 단언하지 않습니다 — 값이 임시라서입니다.
// 다만 영어화(ui-language-catalog)가 노트의 영어 원문을 계약으로 고정했으므로
// 맨 아래 「영어 콘텐츠(CE2)」 블록만 리터럴을 못 박습니다.

const allStepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

describe("cultureScreenTitle", () => {
  it("서수 3은 3단계 · 문화다", () => {
    expect(cultureScreenTitle(3, uiCopyEn)).toBe("Step 3 · Culture");
  });

  it("서수 1은 1단계 · 문화다", () => {
    expect(cultureScreenTitle(1, uiCopyEn)).toBe("Step 1 · Culture");
  });

  it("여정의 마지막 서수 5도 같은 형식이다", () => {
    expect(cultureScreenTitle(5, uiCopyEn)).toBe("Step 5 · Culture");
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

// CE2 — 부록 C.5의 영어 노트입니다. 「」 안의 한국어만 남고 나머지는 영어입니다.
const cultureEnglish: Record<JourneyStepId, CultureNarrative> = {
  greeting: {
    title: "Bowing when you greet",
    paragraphs: [
      "When you meet someone for the first time, greet them with a slight bow. Hugging or waving is only for very close relationships.",
      "「안녕하세요」 works in the morning, afternoon, and evening. Unlike languages with a different greeting for each time of day, one phrase covers them all.",
    ],
  },
  introduction: {
    title: "The order for asking names",
    paragraphs: [
      "It's natural to introduce yourself before asking someone's name. Say 「저는 ○○입니다」 first, then ask for theirs.",
      "When you've just met, add a title such as 「○○ 씨」. Leaving it off doesn't sound friendly — it sounds rude.",
    ],
  },
  ordering: {
    title: "Getting attention at a café",
    paragraphs: [
      "To call a staff member, say 「저기요」. Pointing or clapping looks rude.",
      "An order ends with 「○○ 주세요」. 「주세요」 is already polite, so you don't need to add anything.",
    ],
  },
  appointment: {
    title: "Making plans politely",
    paragraphs: [
      "Set a time by first asking what works for the other person, as in 「언제가 괜찮으세요」. Naming a time first can sound pushy.",
      "If you're going to be late, let them know ahead of time instead of apologizing when you arrive. Letting them know is itself seen as polite.",
    ],
  },
  directions: {
    title: "Asking for and giving directions",
    paragraphs: [
      "Start with 「실례합니다」 when asking a stranger for directions. Jumping straight to the question sounds rude.",
      "When giving directions, name a building or shop before the direction. Use landmarks you can see, as in 「편의점에서 오른쪽」.",
    ],
  },
};

describe("cultureNarrativeForStep — 영어 콘텐츠(CE2)", () => {
  it("다섯 스텝의 제목 5 · 문단 10이 부록 C.5와 같다", () => {
    for (const id of allStepIds) {
      expect(cultureNarrativeForStep(id)).toEqual(cultureEnglish[id]);
    }
  });

  it("한글은 「」 안에만 있다", () => {
    for (const id of allStepIds) {
      const narrative = cultureNarrativeForStep(id);
      for (const text of [narrative.title, ...narrative.paragraphs]) {
        expect(text.replace(/「[^」]*」/g, "")).not.toMatch(/[가-힣]/);
      }
    }
  });
});
