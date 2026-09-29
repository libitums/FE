import { describe, expect, it } from "vitest";

import { profileItems } from "./profile-items";

// PI1~PI5는 길이 단언을 먼저 둡니다 — 스텁 `[]`에서 `every`가 공허하게 통과하지
// 않도록 합니다. PI6(가드)는 길이를 보지 않습니다 — 스텁에서도 녹색이어야 합니다
// (두 호출이 똑같이 []입니다).
//
// 값 문자열은 PI5b만 영어 자리표로 못 박습니다(ui-language-catalog 부록 C.4).
// 수(3)·키 집합·id 순서는 고정된 모양이라 단언합니다.

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

  it("PI3. value가 전부 비어 있지 않다", () => {
    const items = profileItems();
    expect(items).toHaveLength(3);

    for (const item of items) {
      expect(item.value.length).toBeGreaterThan(0);
    }
  });

  // RL22 — `label`은 문구표(`copy.profile.itemLabel[id]`)로 옮겨 갔습니다.
  it("PI4. 항목마다 키가 정확히 id·value 둘이다 — label · 파생값 필드 0건", () => {
    const items = profileItems();
    expect(items).toHaveLength(3);

    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(["id", "value"]);
    }
  });

  it("PI5. id 셋의 순서가 name → learning-language → learning-goal이다", () => {
    expect(profileItems().map((item) => item.id)).toEqual([
      "name",
      "learning-language",
      "learning-goal",
    ]);
  });

  it("PI5b. value가 부록 C.4의 영어 자리표다", () => {
    expect(profileItems().map((item) => item.value)).toEqual([
      "Duru learner",
      "Korean",
      "Daily conversation",
    ]);
  });

  // PI6 (가드) — 길이를 보지 않습니다. 스텁(빈 배열)에서도 녹색이어야 합니다.
  it("PI6. (가드) 두 번 불러 같은 값이다", () => {
    expect(profileItems()).toEqual(profileItems());
  });
});
