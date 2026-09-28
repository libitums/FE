import { describe, expect, it } from "vitest";

import { premiumRoleplayItemsFor } from "./roleplay-premium-items";

// `unit` 계층: 조회 함수의 입출력만 봅니다 (ADR-0006 D4). 값(제목 · 개수)은 임시라
// 단언하지 않습니다 — 단언하는 것은 값이 바뀌어도 지켜져야 하는 형태입니다.
describe("premiumRoleplayItemsFor", () => {
  it("튜토리얼 에피소드에 결제 롤플레이가 하나 이상 있다", () => {
    expect(premiumRoleplayItemsFor("tutorial").length).toBeGreaterThan(0);
  });

  it("항목마다 id · 제목 · 상황이 비어 있지 않다", () => {
    for (const item of premiumRoleplayItemsFor("tutorial")) {
      expect(item.id.trim()).not.toBe("");
      expect(item.title.trim()).not.toBe("");
      expect(item.situation.trim()).not.toBe("");
    }
  });

  it("id가 서로 겹치지 않는다", () => {
    const ids = premiumRoleplayItemsFor("tutorial").map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("없는 에피소드는 던지지 않고 빈 목록을 낸다", () => {
    expect(premiumRoleplayItemsFor("no-such-episode")).toEqual([]);
  });
});
