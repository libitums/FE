import { describe, expect, it } from "vitest";

import { profileItems } from "./profile-items";

// 계약: .agent-harness/work/lib-259/spec.md §0.3 D-c · §2.8(임시 입력값의 이음매).
// 계획: .agent-harness/work/lib-259/test-plan.md unit § `screens/profile/profile-items.unit.test.ts`.
//
// PI1~PI5는 길이 단언을 먼저 둔다 — 스텁 `[]`에서 `every`가 공허하게 통과하지 않게.
// PI6(가드)는 길이를 보지 않는다 — 스텁에서도 녹색이어야 한다(두 호출이 똑같이 []다).
//
// 값 문자열(`두루 학습자` 등)은 단언하지 않는다 — 임시 값이고 바뀌는 날 이 파일이
// 빨개질 이유가 없다. 수(3) · 키 집합 · 파생 어휘 부재는 계약이 고정한 모양이라
// 단언한다.

describe("profileItems", () => {
  // PI1
  it("PI1. 길이가 3이다 — spec §0.3 D-c", () => {
    expect(profileItems()).toHaveLength(3);
  });

  // PI2
  it("PI2. id 셋이 서로 다르고 비어 있지 않다", () => {
    const items = profileItems();
    expect(items).toHaveLength(3);

    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(3);

    for (const id of ids) {
      expect(id.length).toBeGreaterThan(0);
    }
  });

  // PI3
  it("PI3. label·value가 전부 비어 있지 않다", () => {
    const items = profileItems();
    expect(items).toHaveLength(3);

    for (const item of items) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.value.length).toBeGreaterThan(0);
    }
  });

  // PI4
  it("PI4. 항목마다 키가 정확히 id·label·value 셋이다 — 파생값 필드 0건", () => {
    const items = profileItems();
    expect(items).toHaveLength(3);

    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(["id", "label", "value"]);
    }
  });

  // PI5 (가드)
  it("PI5. (가드) 파생 어휘 부재 — label 어디에도 연속·완료·진행·일째·개가 없다(docs/screens.md)", () => {
    const items = profileItems();
    expect(items).toHaveLength(3);

    const forbiddenWords = ["연속", "완료", "진행", "일째", "개"];

    for (const item of items) {
      for (const word of forbiddenWords) {
        expect(item.label).not.toContain(word);
      }
    }
  });

  // PI6 (가드) — 길이를 보지 않는다. 스텁(빈 배열)에서도 녹색이다.
  it("PI6. (가드) 두 번 불러 같은 값이다", () => {
    expect(profileItems()).toEqual(profileItems());
  });
});
