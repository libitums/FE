import { describe, expect, it } from "vitest";

import { profileItems } from "./profile-items";

// PI1~PI5는 길이 단언을 먼저 둡니다 — 스텁 `[]`에서 `every`가 공허하게 통과하지
// 않도록 합니다. PI6(가드)는 길이를 보지 않습니다 — 스텁에서도 녹색이어야 합니다
// (두 호출이 똑같이 []입니다).
//
// 값 문자열(`두루 학습자` 등)은 단언하지 않습니다 — 임시 값이고 바뀌는 날 이 파일이
// 빨개질 이유가 없습니다. 수(3)·키 집합·파생 어휘 부재는 고정된 모양이라 단언합니다.

describe("profileItems", () => {
  it("PI1. 길이가 3이다", () => {
    expect(profileItems()).toHaveLength(3);
  });

  it("PI2. id 셋이 서로 다르고 비어 있지 않다", () => {
    const items = profileItems();
    expect(items).toHaveLength(3);

    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(3);

    for (const id of ids) {
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it("PI3. label·value가 전부 비어 있지 않다", () => {
    const items = profileItems();
    expect(items).toHaveLength(3);

    for (const item of items) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.value.length).toBeGreaterThan(0);
    }
  });

  it("PI4. 항목마다 키가 정확히 id·label·value 셋이다 — 파생값 필드 0건", () => {
    const items = profileItems();
    expect(items).toHaveLength(3);

    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(["id", "label", "value"]);
    }
  });

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

  // PI6 (가드) — 길이를 보지 않습니다. 스텁(빈 배열)에서도 녹색이어야 합니다.
  it("PI6. (가드) 두 번 불러 같은 값이다", () => {
    expect(profileItems()).toEqual(profileItems());
  });
});
