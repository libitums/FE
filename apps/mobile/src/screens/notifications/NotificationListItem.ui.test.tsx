import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { notificationDestinationLabel, notificationItemAccessibilityLabel } from "./notifications";
import type { NotificationItem } from "./notifications.contract";
import { NotificationListItem } from "./NotificationListItem";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 봅니다 (ADR-0006 D4). 로직을
// 다시 짓지 않습니다 — 기대값은 순수 함수(`notificationItemAccessibilityLabel`·
// `notificationDestinationLabel`)의 결과로 비교하고, 항목 데이터는 이 파일 안의
// fixture로 줍니다(`notification-items.ts`를 import하지 않습니다 — 다른 fixture로도
// 통과해야 합니다, code.md 「임시 입력값의 이음매」). `toHaveClass`·`toHaveStyle`을
// 쓰지 않습니다. 텍스트 질의(`getByText`)를 쓰지 않습니다 — testid로 질의합니다.

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

const fixtures: readonly NotificationItem[] = [
  messengerItem,
  phoneCallItem,
  visualNovelItem,
  roleplayListItem,
];

describe("NotificationListItem UI", () => {
  describe("[LI1] 루트의 접근성 채널", () => {
    for (const item of fixtures) {
      it(`${item.target.kind} — accessibility-element·traits·label이 정확하다`, () => {
        render(<NotificationListItem item={item} onSelect={vi.fn()} />);

        const root = screen.getByTestId(`notification-list-item-${item.id}`);
        expect(root).toHaveAttribute("accessibility-element", "true");
        expect(root).toHaveAttribute("accessibility-traits", "button");
        expect(root).toHaveAttribute(
          "accessibility-label",
          notificationItemAccessibilityLabel(item),
        );
      });
    }
  });

  describe("[LI2] 메시지·행선지 텍스트", () => {
    for (const item of fixtures) {
      it(`${item.target.kind} — 메시지는 item.message, 행선지는 notificationDestinationLabel(item.target.kind)`, () => {
        render(<NotificationListItem item={item} onSelect={vi.fn()} />);

        expect(screen.getByTestId(`notification-list-item-message-${item.id}`)).toHaveTextContent(
          item.message,
        );
        expect(
          screen.getByTestId(`notification-list-item-destination-${item.id}`),
        ).toHaveTextContent(notificationDestinationLabel(item.target.kind));
      });
    }
  });

  describe("[LI3] 루트 tap이 onSelect를 정확히 1회, 그 항목으로 올린다", () => {
    for (const item of fixtures) {
      it(`${item.target.kind}`, () => {
        const onSelect = vi.fn();
        render(<NotificationListItem item={item} onSelect={onSelect} />);

        fireEvent.tap(screen.getByTestId(`notification-list-item-${item.id}`), {});

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(item);
      });
    }
  });

  // LI4 — 보이는 이름을 지는 요소를 가리지 않습니다(ADR-0016 D5).
  describe("[LI4] 가림 없음", () => {
    for (const item of fixtures) {
      it(`${item.target.kind} — 글 묶음 래퍼가 루트 안에 있고, 가림 속성이 트리 어디에도 없다`, () => {
        const { container } = render(<NotificationListItem item={item} onSelect={vi.fn()} />);

        const root = screen.getByTestId(`notification-list-item-${item.id}`);
        const textWrapper = screen.getByTestId(`notification-list-item-text-${item.id}`);
        expect(root).toContainElement(textWrapper);

        const message = screen.getByTestId(`notification-list-item-message-${item.id}`);
        const destination = screen.getByTestId(`notification-list-item-destination-${item.id}`);
        expect(within(textWrapper).getByTestId(`notification-list-item-message-${item.id}`)).toBe(
          message,
        );
        expect(
          within(textWrapper).getByTestId(`notification-list-item-destination-${item.id}`),
        ).toBe(destination);

        expect(textWrapper).not.toHaveAttribute("accessibility-elements-hidden");
        expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);

        // 목적지 아이콘은 testid가 없습니다 — 클래스 셀렉터로 찾습니다. 아이콘의
        // `content` 값(시각 값)은 단언하지 않습니다.
        const icon = container.querySelector(".notification-list-item-icon");
        expect(icon).not.toBeNull();

        for (const el of [message, destination, icon]) {
          expect(el).not.toHaveAttribute("accessibility-element");
          expect(el).not.toHaveAttribute("accessibility-traits");
          expect(el).not.toHaveAttribute("accessibility-label");
          expect(el).not.toHaveAttribute("accessibility-elements-hidden");
        }
      });
    }
  });

  describe("[LI5] 읽음·배지 0건", () => {
    for (const item of fixtures) {
      it(`${item.target.kind} — data-status·data-read 없음, header·disabled trait 0건, 읽음 텍스트 0건`, () => {
        const { container } = render(<NotificationListItem item={item} onSelect={vi.fn()} />);

        const root = screen.getByTestId(`notification-list-item-${item.id}`);
        expect(root).not.toHaveAttribute("data-status");
        expect(root).not.toHaveAttribute("data-read");

        const traitsElements = container.querySelectorAll("[accessibility-traits]");
        for (const el of Array.from(traitsElements)) {
          expect(el.getAttribute("accessibility-traits")).not.toBe("header");
          expect(el.getAttribute("accessibility-traits")).not.toBe("disabled");
        }

        expect(container).not.toHaveTextContent("읽음");
      });
    }
  });

  // LI6 — 이음매입니다. 다른 fixture(긴 메시지·임의 id)에서도 LI1·LI2가 성립합니다.
  describe("[LI6] 이음매 — 임의 fixture에서도 성립한다", () => {
    const longMessageItem: NotificationItem = {
      id: "notification-long-message",
      message:
        "이것은 아주 긴 알림 메시지입니다. 목적지 낱말과 함께 접근성 이름이 얼마나 길어지든 계산 규칙은 데이터 값에 기대지 않아야 합니다.",
      target: { kind: "messenger", unitId: "appointment-confirmation" },
    };

    const arbitraryIdItem: NotificationItem = {
      id: "x-1",
      message: "임의 id fixture",
      target: { kind: "roleplay-list" },
    };

    for (const item of [longMessageItem, arbitraryIdItem]) {
      it(`id=${item.id} — LI1·LI2가 성립한다`, () => {
        render(<NotificationListItem item={item} onSelect={vi.fn()} />);

        const root = screen.getByTestId(`notification-list-item-${item.id}`);
        expect(root).toHaveAttribute("accessibility-element", "true");
        expect(root).toHaveAttribute("accessibility-traits", "button");
        expect(root).toHaveAttribute(
          "accessibility-label",
          notificationItemAccessibilityLabel(item),
        );

        expect(screen.getByTestId(`notification-list-item-message-${item.id}`)).toHaveTextContent(
          item.message,
        );
        expect(
          screen.getByTestId(`notification-list-item-destination-${item.id}`),
        ).toHaveTextContent(notificationDestinationLabel(item.target.kind));
      });
    }
  });
});
