import { describe, expect, it } from "vitest";

import { notificationItems } from "./notification-items";

// 모든 케이스가 길이 단언을 먼저 둡니다 — 스텁 `[]`에서 `every`가 공허하게 통과하지
// 않도록 합니다.
//
// 메시지 문구 리터럴은 단언하지 않습니다 — 임시 값이고, 바뀌는 날 이 파일이 빨개질
// 이유가 없습니다(「임시 입력값의 이음매」). 수(4)·대상·unitId는 고정된 모양이라
// 단언합니다.

describe("notificationItems", () => {
  it("ND1. 길이가 4다 — 계약이 고정한 수", () => {
    expect(notificationItems()).toHaveLength(4);
  });

  it("ND2. target.kind의 다중집합이 messenger·phone-call·visual-novel·roleplay-list 각 1회다", () => {
    const items = notificationItems();
    expect(items).toHaveLength(4);

    const kinds = items.map((item) => item.target.kind).sort();

    expect(kinds).toEqual(["messenger", "phone-call", "roleplay-list", "visual-novel"]);
  });

  it("ND3. 순서가 messenger → phone-call → visual-novel → roleplay-list다", () => {
    const items = notificationItems();
    expect(items).toHaveLength(4);

    expect(items.map((item) => item.target.kind)).toEqual([
      "messenger",
      "phone-call",
      "visual-novel",
      "roleplay-list",
    ]);
  });

  it("ND4. 특별 유닛 대상의 unitId가 계약이 고정한 값이다", () => {
    const items = notificationItems();
    expect(items).toHaveLength(4);

    const messenger = items.find((item) => item.target.kind === "messenger");
    const phoneCall = items.find((item) => item.target.kind === "phone-call");
    const visualNovel = items.find((item) => item.target.kind === "visual-novel");

    expect(messenger?.target.kind === "messenger" ? messenger.target.unitId : null).toBe(
      "appointment-confirmation",
    );
    expect(phoneCall?.target.kind === "phone-call" ? phoneCall.target.unitId : null).toBe(
      "appointment-confirmation-phone-call",
    );
    expect(visualNovel?.target.kind === "visual-novel" ? visualNovel.target.unitId : null).toBe(
      "cafe-arrival-visual-novel",
    );
  });

  it("ND5. id 넷이 서로 다르고 비어 있지 않으며, message 넷이 비어 있지 않다", () => {
    const items = notificationItems();
    expect(items).toHaveLength(4);

    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(4);

    for (const item of items) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.message.length).toBeGreaterThan(0);
    }
  });

  it("ND6. 항목마다 키가 정확히 id·message·target 셋이다 — 읽음 필드 없음", () => {
    const items = notificationItems();
    expect(items).toHaveLength(4);

    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(["id", "message", "target"]);
    }
  });

  it("ND7. (가드) 두 번 불러도 같은 값이다", () => {
    expect(notificationItems()).toEqual(notificationItems());
  });
});
