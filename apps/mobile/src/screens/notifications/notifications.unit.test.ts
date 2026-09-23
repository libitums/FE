import { describe, expect, it } from "vitest";

import type { NotificationItem } from "./notifications.contract";
import {
  notificationDestinationLabel,
  notificationItemAccessibilityLabel,
  notificationTappedEvent,
} from "./notifications";

// 픽스처는 `NotificationItem`(type import)으로 이 파일 안에서 넷(대상 종류마다 하나)을
// 직접 짓습니다. `notification-items.ts`를 import하지 않습니다 — 계산 규칙이 데이터
// 값에 기대지 않게 합니다.

const messengerItem: NotificationItem = {
  id: "notification-messenger",
  message: "지민이 약속 확인 메시지를 보냈어요",
  target: { kind: "messenger", unitId: "appointment-confirmation" },
};

const phoneCallItem: NotificationItem = {
  id: "notification-phone-call",
  message: "지민에게서 약속 확인 전화가 왔어요",
  target: { kind: "phone-call", unitId: "appointment-confirmation-phone-call" },
};

const visualNovelItem: NotificationItem = {
  id: "notification-visual-novel",
  message: "지민이 카페에 도착했어요",
  target: { kind: "visual-novel", unitId: "cafe-arrival-visual-novel" },
};

const roleplayListItem: NotificationItem = {
  id: "notification-roleplay-list",
  message: "배운 대화를 롤플레이로 연습해 보세요",
  target: { kind: "roleplay-list" },
};

const allItems: readonly NotificationItem[] = [
  messengerItem,
  phoneCallItem,
  visualNovelItem,
  roleplayListItem,
];

describe("notificationDestinationLabel", () => {
  it("NL1. 대상 종류 넷 각각에 고정된 행선지 낱말을 돌려준다", () => {
    expect(notificationDestinationLabel("messenger")).toBe("메신저 열기");
    expect(notificationDestinationLabel("phone-call")).toBe("전화 열기");
    expect(notificationDestinationLabel("visual-novel")).toBe("비주얼 노벨 열기");
    expect(notificationDestinationLabel("roleplay-list")).toBe("롤플레이 목록 보기");
  });

  it("NL2. 넷이 서로 다르다", () => {
    const labels = allItems.map((item) => notificationDestinationLabel(item.target.kind));

    expect(new Set(labels).size).toBe(4);
  });
});

describe("notificationItemAccessibilityLabel", () => {
  it("NL3. `<메시지>, <행선지>` 형식이다 — 넷 각각", () => {
    for (const item of allItems) {
      expect(notificationItemAccessibilityLabel(item)).toBe(
        `${item.message}, ${notificationDestinationLabel(item.target.kind)}`,
      );
    }
  });

  it("NL4. (가드) 접근성 이름에 읽음·안 읽음·새 알림이 없다", () => {
    for (const item of allItems) {
      const label = notificationItemAccessibilityLabel(item);

      expect(label).not.toContain("읽음");
      expect(label).not.toContain("안 읽음");
      expect(label).not.toContain("새 알림");
    }
  });
});

describe("notificationTappedEvent", () => {
  it("NE1. { name, notificationId, target } 페이로드다 — 넷 각각", () => {
    for (const item of allItems) {
      expect(notificationTappedEvent(item)).toEqual({
        name: "notification_item_tapped",
        notificationId: item.id,
        target: item.target.kind,
      });
    }
  });

  it("NE2. (가드) 페이로드 키가 정확히 name·notificationId·target 셋이고 message가 없다", () => {
    for (const item of allItems) {
      const event = notificationTappedEvent(item);

      expect(Object.keys(event).sort()).toEqual(["name", "notificationId", "target"]);
      expect(event).not.toHaveProperty("message");
    }
  });
});

describe("입력 불변 · 부수효과 없음 (가드)", () => {
  it("NE3. notificationItemAccessibilityLabel·notificationTappedEvent가 입력을 바꾸지 않고 같은 입력에 같은 값이다", () => {
    for (const item of allItems) {
      const before = JSON.parse(JSON.stringify(item)) as NotificationItem;

      expect(notificationItemAccessibilityLabel(item)).toEqual(
        notificationItemAccessibilityLabel(item),
      );
      expect(notificationTappedEvent(item)).toEqual(notificationTappedEvent(item));
      expect(item).toEqual(before);
    }
  });
});
