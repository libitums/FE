import { describe, expect, it } from "vitest";

import { termsSections } from "./terms-sections";

// TS1~TS5는 길이 단언을 먼저 둡니다 — 스텁 `[]`에서 `every`가 공허하게 통과하지
// 않도록 합니다. TS6(가드)는 길이를 보지 않습니다 — 스텁에서도 녹색이어야 합니다.
//
// 본문 문구는 단언하지 않습니다(같은 이유입니다). 절 제목 문자열도 단언하지 않습니다 —
// 고정하는 것은 수와 분량입니다.

describe("termsSections", () => {
  it("TS1. 길이가 4다", () => {
    expect(termsSections()).toHaveLength(4);
  });

  it("TS2. 절마다 paragraphs의 길이가 2이고 문단 총수가 8이다", () => {
    const sections = termsSections();
    expect(sections).toHaveLength(4);

    let totalParagraphs = 0;
    for (const section of sections) {
      expect(section.paragraphs).toHaveLength(2);
      totalParagraphs += section.paragraphs.length;
    }
    expect(totalParagraphs).toBe(8);
  });

  it("TS3. id 넷이 서로 다르고 비어 있지 않다", () => {
    const sections = termsSections();
    expect(sections).toHaveLength(4);

    const ids = sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(4);

    for (const id of ids) {
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it("TS4. title 넷이 비어 있지 않다", () => {
    const sections = termsSections();
    expect(sections).toHaveLength(4);

    for (const section of sections) {
      expect(section.title.length).toBeGreaterThan(0);
    }
  });

  it("TS5. 문단마다 문장이 2개 이상(마침표 기준)이고 본문 전체 길이가 600자 이상이다 — ADR-0022 스크롤 근거", () => {
    const sections = termsSections();
    expect(sections).toHaveLength(4);

    let totalLength = 0;
    for (const section of sections) {
      for (const paragraph of section.paragraphs) {
        const sentenceCount = paragraph.split(".").filter((s) => s.trim().length > 0).length;
        expect(sentenceCount).toBeGreaterThanOrEqual(2);
        totalLength += paragraph.length;
      }
    }
    expect(totalLength).toBeGreaterThanOrEqual(600);
  });

  // TS6 (가드) — 길이를 보지 않습니다. 스텁(빈 배열)에서도 녹색이어야 합니다.
  it("TS6. (가드) 두 번 불러 같은 값이다", () => {
    expect(termsSections()).toEqual(termsSections());
  });
});

// CE6 — 부록 C.6의 영어 초안(법무 검토 전)입니다. 절 id 넷은 불변입니다.
describe("termsSections — 영어 콘텐츠(CE6)", () => {
  it("절 넷의 id · 제목 · 문단 둘이 부록 C.6과 같다", () => {
    expect(termsSections()).toEqual([
      {
        id: "collected",
        title: "Information we collect",
        paragraphs: [
          "This app collects only the minimum information needed to provide the service. During onboarding, we ask for your name, learning language, and learning goal and use them to build your study plan. We don't ask for any other sensitive information.",
          "We also collect usage records created while you study, such as correct and incorrect answers and study time. These records are used as reference data to recommend what to study next.",
        ],
      },
      {
        id: "usage",
        title: "How we use information",
        paragraphs: [
          "We use the information we collect only to show you content that suits you. We don't sell or hand over information to other companies for advertising or marketing, and we don't share it with partners without your separate consent.",
          "Your study records are used to calculate your progress and choose the questions you'll solve next. Unless you ask us to, we don't reuse your study records for any other purpose.",
        ],
      },
      {
        id: "retention",
        title: "Storage and deletion",
        paragraphs: [
          "We keep the information we collect safely while you use the service. If you ask to delete your account, we delete your information except what the law requires us to keep for a set period.",
          "Information whose retention period has ended is destroyed so that it can't be recovered. Any records left on paper are shredded or incinerated.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        paragraphs: [
          "If you have questions about how your personal information is handled, you can contact our customer center. We accept inquiries through the Contact menu in the app or by email.",
          "A staff member reviews each inquiry and replies on business days. If you're not satisfied with the outcome, you can contact the relevant authorities.",
        ],
      },
    ]);
  });

  it("한글이 한 글자도 없다", () => {
    for (const section of termsSections()) {
      expect([section.title, ...section.paragraphs].join(" ")).not.toMatch(/[가-힣]/);
    }
  });
});
