import { describe, expect, it, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { NotificationItem } from "./notifications.contract";
import { NotificationsScreen } from "./NotificationsScreen";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 로직을 다시 짓지 않습니다 — 항목
// 데이터는 이 파일 안의 fixture로 줍니다(`notification-items.ts`를 import하지
// 않습니다). `toHaveClass`·`toHaveStyle`을 쓰지 않습니다. 텍스트 질의(`getByText`)를
// 쓰지 않습니다 — testid로 질의합니다.

const messengerItem: NotificationItem = {
  id: "notification-messenger",
  message: "Jimin sent you an appointment message",
  target: { kind: "messenger", unitId: "appointment-confirmation" },
};

const phoneCallItem: NotificationItem = {
  id: "notification-phone-call",
  message: "Jimin is calling about your appointment",
  target: { kind: "phone-call", unitId: "appointment-confirmation-phone-call" },
};

const visualNovelItem: NotificationItem = {
  id: "notification-visual-novel",
  message: "Jimin has arrived at the café",
  target: { kind: "visual-novel", unitId: "cafe-arrival-visual-novel" },
};

const roleplayListItem: NotificationItem = {
  id: "notification-roleplay-list",
  message: "Practice what you learned in a roleplay",
  target: { kind: "roleplay-list" },
};

const items: readonly NotificationItem[] = [
  messengerItem,
  phoneCallItem,
  visualNovelItem,
  roleplayListItem,
];

// 나가기는 ui-lynx `RoundButton`입니다 — 탭도 접근성 채널도 그 버튼이 집니다.
// `notifications-screen-exit`은 그것을 담는 자리입니다.
function exitButton(): HTMLElement {
  return within(screen.getByTestId("notifications-screen-exit")).getByTestId(
    "ui-lynx-round-button",
  );
}

test("[NS1] notifications-screen-title이 알림을 렌더하고 header trait를 갖는다", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  const title = screen.getByTestId("notifications-screen-title");
  expect(title).toHaveTextContent("Notifications");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

test("[NS2] 나가기가 동그란 버튼으로 서고 접근성 채널이 정확하다", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  const exit = exitButton();
  expect(exit).toHaveAttribute("accessibility-element", "true");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
  expect(exit).toHaveAttribute("accessibility-label", "Back to map");
});

test("[NS3] 나가기 tap → onExit 정확히 1회, onSelectItem 0회", () => {
  const onExit = vi.fn();
  const onSelectItem = vi.fn();
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={onSelectItem}
      onDeleteItem={vi.fn()}
      onExit={onExit}
    />,
  );

  fireEvent.tap(exitButton(), {});

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onSelectItem).not.toHaveBeenCalled();
});

test("[NS4] notifications-screen-scroll에 scroll-orientation·scroll-bar-enable이 붙고 accessibility-*가 0개다", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  const scroll = screen.getByTestId("notifications-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

test("[NS5] 스크롤의 직계 요소 자식이 정확히 하나이고 notifications-screen-list다 — 목록 상자에 accessibility-* 0개", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  const scroll = screen.getByTestId("notifications-screen-scroll");
  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toHaveAttribute("data-testid", "notifications-screen-list");

  const list = screen.getByTestId("notifications-screen-list");
  expect(list).not.toHaveAttribute("accessibility-element");
  expect(list).not.toHaveAttribute("accessibility-label");
  expect(list).not.toHaveAttribute("accessibility-traits");
  expect(list).not.toHaveAttribute("accessibility-elements-hidden");
});

test("[NS6] 제목·나가기가 스크롤 밖이다", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  const scroll = screen.getByTestId("notifications-screen-scroll");
  expect(within(scroll).queryByTestId("notifications-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("notifications-screen-exit")).not.toBeInTheDocument();

  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("notifications-screen-exit")).toBeInTheDocument();
});

test("[NS7] 목록 상자 안 항목 줄 testid 순서가 items 순서와 같다 — 넷 fixture", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  const list = screen.getByTestId("notifications-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual(items.map((item) => `notification-list-item-row-${item.id}`));
});

test("[NS7] 목록 상자 안 항목 줄 testid 순서가 items 순서와 같다 — 역순 셋 fixture", () => {
  const reordered: readonly NotificationItem[] = [roleplayListItem, phoneCallItem, messengerItem];
  render(
    <NotificationsScreen
      items={reordered}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  const list = screen.getByTestId("notifications-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual(reordered.map((item) => `notification-list-item-row-${item.id}`));
});

test("[NS8] 항목 tap → onSelectItem이 정확히 1회, 인자는 그 항목", () => {
  const onSelectItem = vi.fn();
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={onSelectItem}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  fireEvent.tap(screen.getByTestId(`notification-list-item-${phoneCallItem.id}`), {});

  expect(onSelectItem).toHaveBeenCalledTimes(1);
  expect(onSelectItem).toHaveBeenCalledWith(phoneCallItem);
});

test("[NS9] header trait를 가진 요소가 notifications-screen-title 하나다", () => {
  const { container } = render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  const headers = container.querySelectorAll('[accessibility-traits="header"]');
  expect(headers).toHaveLength(1);
  expect(headers[0]).toBe(screen.getByTestId("notifications-screen-title"));
});

test("[NS10] DOM 순서 — 나가기가 제목보다 앞이다", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  const exit = screen.getByTestId("notifications-screen-exit");
  const title = screen.getByTestId("notifications-screen-title");

  expect(exit.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

// 재고정: 빈 목록은 더 이상 빈 목록 상자가 아닙니다 — 빈 상태(Figma 64-1745)가 섭니다.
test("[NS11] items=[] → 목록 상자 대신 빈 상태가 선다", () => {
  render(
    <NotificationsScreen
      items={[]}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  expect(screen.queryByTestId("notifications-screen-list")).not.toBeInTheDocument();
  expect(screen.getByTestId("notifications-screen-empty")).toBeInTheDocument();
  expect(screen.getByTestId("notifications-screen-empty-title")).toHaveTextContent(
    "No notifications yet",
  );
  expect(screen.getByTestId("notifications-screen-empty-description")).toHaveTextContent(
    "We'll let you know here when there's something new.",
  );
});

test("[NS12] 항목이 있으면 빈 상태가 없다", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  expect(screen.queryByTestId("notifications-screen-empty")).not.toBeInTheDocument();
});

function swipeLeft(id: string): void {
  const card = screen.getByTestId(`notification-list-item-${id}`);
  fireEvent.touchstart(card, { touches: [{ pageX: 300, pageY: 200 }] });
  fireEvent.touchmove(card, { touches: [{ pageX: 240, pageY: 204 }] });
}

test("[NS13] 항목을 밀면 그 항목에만 삭제 자리가 열린다", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  swipeLeft("notification-messenger");

  expect(
    screen.getByTestId("notification-list-item-delete-notification-messenger"),
  ).toBeInTheDocument();
  expect(
    screen.queryByTestId("notification-list-item-delete-notification-phone-call"),
  ).not.toBeInTheDocument();
});

test("[NS14] 다른 항목을 밀면 앞의 삭제 자리가 닫힌다", () => {
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  swipeLeft("notification-messenger");
  swipeLeft("notification-phone-call");

  expect(
    screen.queryByTestId("notification-list-item-delete-notification-messenger"),
  ).not.toBeInTheDocument();
  expect(
    screen.getByTestId("notification-list-item-delete-notification-phone-call"),
  ).toBeInTheDocument();
});

test("[NS15] 삭제 tap → onDeleteItem이 그 항목으로 1회, onSelectItem 0회", () => {
  const onDeleteItem = vi.fn<(item: NotificationItem) => void>();
  const onSelectItem = vi.fn<(item: NotificationItem) => void>();
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={onSelectItem}
      onDeleteItem={onDeleteItem}
      onExit={vi.fn()}
    />,
  );

  swipeLeft("notification-messenger");
  fireEvent.tap(screen.getByTestId("notification-list-item-delete-notification-messenger"), {});

  expect(onDeleteItem).toHaveBeenCalledTimes(1);
  expect(onDeleteItem).toHaveBeenCalledWith(messengerItem);
  expect(onSelectItem).not.toHaveBeenCalled();
});

test("[NS16] 삭제 자리가 열린 채 다른 카드를 tap하면 알림을 열지 않고 삭제 자리를 닫는다", () => {
  const onSelectItem = vi.fn<(item: NotificationItem) => void>();
  render(
    <NotificationsScreen
      items={items}
      onSelectItem={onSelectItem}
      onDeleteItem={vi.fn()}
      onExit={vi.fn()}
    />,
  );

  swipeLeft("notification-messenger");
  fireEvent.tap(screen.getByTestId("notification-list-item-notification-phone-call"), {});

  expect(onSelectItem).not.toHaveBeenCalled();
  expect(
    screen.queryByTestId("notification-list-item-delete-notification-messenger"),
  ).not.toBeInTheDocument();

  // 닫힌 뒤의 탭은 다시 알림을 엽니다.
  fireEvent.tap(screen.getByTestId("notification-list-item-notification-phone-call"), {});
  expect(onSelectItem).toHaveBeenCalledTimes(1);
  expect(onSelectItem).toHaveBeenCalledWith(phoneCallItem);
});

test("[NS17] 지운 뒤 같은 id의 알림이 다시 와도 삭제 자리가 열린 채로 서지 않는다", () => {
  const props = { onSelectItem: vi.fn(), onDeleteItem: vi.fn(), onExit: vi.fn() };
  const { rerender } = render(<NotificationsScreen items={items} {...props} />);

  swipeLeft("notification-messenger");
  fireEvent.tap(screen.getByTestId("notification-list-item-delete-notification-messenger"), {});
  rerender(<NotificationsScreen items={[phoneCallItem]} {...props} />);
  rerender(<NotificationsScreen items={items} {...props} />);

  expect(
    screen.queryByTestId("notification-list-item-delete-notification-messenger"),
  ).not.toBeInTheDocument();
});

describe("[NT1-M] 알림 화면은 문구표에서 읽는다", () => {
  it("제목 · 나가기", () => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <NotificationsScreen
          items={items}
          onSelectItem={vi.fn()}
          onDeleteItem={vi.fn()}
          onExit={vi.fn()}
        />
      </UiCopyContext.Provider>,
    );

    expect(screen.getByTestId("notifications-screen-title")).toHaveTextContent(
      "⟦notifications.title⟧",
    );
    expect(exitButton()).toHaveAttribute("accessibility-label", "⟦common.exitTo.journey⟧");
  });

  it("빈 상태", () => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <NotificationsScreen
          items={[]}
          onSelectItem={vi.fn()}
          onDeleteItem={vi.fn()}
          onExit={vi.fn()}
        />
      </UiCopyContext.Provider>,
    );

    expect(screen.getByTestId("notifications-screen-empty-title")).toHaveTextContent(
      "⟦notifications.emptyTitle⟧",
    );
    expect(screen.getByTestId("notifications-screen-empty-description")).toHaveTextContent(
      "⟦notifications.emptyBody⟧",
    );
  });
});
