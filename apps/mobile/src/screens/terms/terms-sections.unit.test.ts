import { describe, expect, it } from "vitest";

import { termsSections } from "./terms-sections";

// 계약: .agent-harness/work/lib-259/spec.md §0.3 D-c · §2.9(임시 입력값의 이음매).
// 계획: .agent-harness/work/lib-259/test-plan.md unit § `screens/terms/terms-sections.unit.test.ts`.
//
// TS1~TS5는 길이 단언을 먼저 둔다 — 스텁 `[]`에서 `every`가 공허하게 통과하지 않게.
// TS6(가드)는 길이를 보지 않는다 — 스텁에서도 녹색이어야 한다.
//
// 본문 문구는 단언하지 않는다(같은 이유). 절 제목 문자열도 단언하지 않는다 — 고정하는
// 것은 수와 분량이다.

describe("termsSections", () => {
  // TS1
  it("TS1. 길이가 4다", () => {
    expect(termsSections()).toHaveLength(4);
  });

  // TS2
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

  // TS3
  it("TS3. id 넷이 서로 다르고 비어 있지 않다", () => {
    const sections = termsSections();
    expect(sections).toHaveLength(4);

    const ids = sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(4);

    for (const id of ids) {
      expect(id.length).toBeGreaterThan(0);
    }
  });

  // TS4
  it("TS4. title 넷이 비어 있지 않다", () => {
    const sections = termsSections();
    expect(sections).toHaveLength(4);

    for (const section of sections) {
      expect(section.title.length).toBeGreaterThan(0);
    }
  });

  // TS5
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

  // TS6 (가드) — 길이를 보지 않는다. 스텁(빈 배열)에서도 녹색이다.
  it("TS6. (가드) 두 번 불러 같은 값이다", () => {
    expect(termsSections()).toEqual(termsSections());
  });
});
