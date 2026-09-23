import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { NotificationItem } from "./notifications.contract";
import { NotificationsScreen } from "./NotificationsScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 로직을 다시 짓지 않습니다 — 항목
// 데이터는 이 파일 안의 fixture로 줍니다(`notification-items.ts`를 import하지
// 않습니다). `toHaveClass`·`toHaveStyle`을 쓰지 않습니다. 텍스트 질의(`getByText`)를
// 쓰지 않습니다 — testid로 질의합니다.

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

const items: readonly NotificationItem[] = [
  messengerItem,
  phoneCallItem,
  visualNovelItem,
  roleplayListItem,
];

test("[NS1] notifications-screen-title이 알림을 렌더하고 header trait를 갖는다", () => {
  render(<NotificationsScreen items={items} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const title = screen.getByTestId("notifications-screen-title");
  expect(title).toHaveTextContent("알림");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

test("[NS2] notifications-screen-exit이 맵으로를 렌더하고 접근성 채널이 정확하다", () => {
  render(<NotificationsScreen items={items} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const exit = screen.getByTestId("notifications-screen-exit");
  expect(exit).toHaveTextContent("맵으로");
  expect(exit).toHaveAttribute("accessibility-element", "true");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
  expect(exit).toHaveAttribute("accessibility-label", "맵으로");
});

test("[NS3] 나가기 tap → onExit 정확히 1회, onSelectItem 0회", () => {
  const onExit = vi.fn();
  const onSelectItem = vi.fn();
  render(<NotificationsScreen items={items} onSelectItem={onSelectItem} onExit={onExit} />);

  fireEvent.tap(screen.getByTestId("notifications-screen-exit"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onSelectItem).not.toHaveBeenCalled();
});

test("[NS4] notifications-screen-scroll에 scroll-orientation·scroll-bar-enable이 붙고 accessibility-*가 0개다", () => {
  render(<NotificationsScreen items={items} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const scroll = screen.getByTestId("notifications-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

test("[NS5] 스크롤의 직계 요소 자식이 정확히 하나이고 notifications-screen-list다 — 목록 상자에 accessibility-* 0개", () => {
  render(<NotificationsScreen items={items} onSelectItem={vi.fn()} onExit={vi.fn()} />);

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
  render(<NotificationsScreen items={items} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const scroll = screen.getByTestId("notifications-screen-scroll");
  expect(within(scroll).queryByTestId("notifications-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("notifications-screen-exit")).not.toBeInTheDocument();

  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("notifications-screen-exit")).toBeInTheDocument();
});

test("[NS7] 목록 상자 안 항목 루트 testid 순서가 items 순서와 같다 — 넷 fixture", () => {
  render(<NotificationsScreen items={items} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const list = screen.getByTestId("notifications-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual(items.map((item) => `notification-list-item-${item.id}`));
});

test("[NS7] 목록 상자 안 항목 루트 testid 순서가 items 순서와 같다 — 역순 셋 fixture", () => {
  const reordered: readonly NotificationItem[] = [roleplayListItem, phoneCallItem, messengerItem];
  render(<NotificationsScreen items={reordered} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const list = screen.getByTestId("notifications-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual(reordered.map((item) => `notification-list-item-${item.id}`));
});

test("[NS8] 항목 tap → onSelectItem이 정확히 1회, 인자는 그 항목", () => {
  const onSelectItem = vi.fn();
  render(<NotificationsScreen items={items} onSelectItem={onSelectItem} onExit={vi.fn()} />);

  fireEvent.tap(screen.getByTestId(`notification-list-item-${phoneCallItem.id}`), {});

  expect(onSelectItem).toHaveBeenCalledTimes(1);
  expect(onSelectItem).toHaveBeenCalledWith(phoneCallItem);
});

test("[NS9] header trait를 가진 요소가 notifications-screen-title 하나다", () => {
  const { container } = render(
    <NotificationsScreen items={items} onSelectItem={vi.fn()} onExit={vi.fn()} />,
  );

  const headers = container.querySelectorAll('[accessibility-traits="header"]');
  expect(headers).toHaveLength(1);
  expect(headers[0]).toBe(screen.getByTestId("notifications-screen-title"));
});

test("[NS10] DOM 순서 — 나가기가 제목보다 앞이다", () => {
  render(<NotificationsScreen items={items} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const exit = screen.getByTestId("notifications-screen-exit");
  const title = screen.getByTestId("notifications-screen-title");

  expect(exit.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("[NS11] items=[] → 목록 상자가 서고 항목 0개다", () => {
  render(<NotificationsScreen items={[]} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const list = screen.getByTestId("notifications-screen-list");
  expect(list).toBeInTheDocument();
  expect(list.children).toHaveLength(0);
});
