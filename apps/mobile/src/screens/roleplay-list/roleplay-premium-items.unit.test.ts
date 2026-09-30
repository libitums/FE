import { describe, expect, it } from "vitest";

import type { RoleplayEpisodeId } from "./roleplay-list.contract";
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

  it("CE5. 제목 · 상황이 부록 C.3의 영어다 — id 불변", () => {
    expect(
      premiumRoleplayItemsFor("tutorial").map(({ id, title, situation }) => ({
        id,
        title,
        situation,
      })),
    ).toEqual([
      {
        id: "premium-wrong-order",
        title: "My order came out wrong",
        situation: "Talk politely to the café staff",
      },
      {
        id: "premium-shared-table",
        title: "Can I share this table?",
        situation: "Share a table with another customer",
      },
      {
        id: "premium-regular-chat",
        title: "The owner of my regular café",
        situation: "Make some small talk",
      },
    ]);
  });

  it("id가 서로 겹치지 않는다", () => {
    const ids = premiumRoleplayItemsFor("tutorial").map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  // ⚠ 「없는 에피소드」는 닫힌 `RoleplayEpisodeId`(= `JourneyEpisodeId`)로 **표현할 수
  // 없는** 입력이라 캐스트로 짓습니다. 제품 코드는 닫힌 union에서 타입 안전을 얻고
  // (에피소드 id 오타가 `tsc`에 섭니다), 이 케이스는 **다른 것**을 봅니다 — 표에 없는
  // 키가 와도 던지지 않고 빈 목록을 낸다는 총함수 성질입니다. 캐스트를 제품 코드에
  // 두지 않습니다.
  it("없는 에피소드는 던지지 않고 빈 목록을 낸다", () => {
    expect(premiumRoleplayItemsFor("no-such-episode" as RoleplayEpisodeId)).toEqual([]);
  });
});
