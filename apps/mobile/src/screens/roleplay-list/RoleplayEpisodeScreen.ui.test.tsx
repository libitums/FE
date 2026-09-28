import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { RoleplayItem, RoleplaySection } from "./roleplay-list.contract";
import { RoleplayEpisodeScreen } from "./RoleplayEpisodeScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 구획은 이 파일 안의 fixture로
// 줍니다. `toHaveClass`·`toHaveStyle`을 쓰지 않습니다.

const messengerItem: RoleplayItem = {
  form: "messenger",
  unitId: "appointment-confirmation",
  title: "약속 확인 메시지",
};

const phoneCallItem: RoleplayItem = {
  form: "phone-call",
  unitId: "appointment-confirmation-phone-call",
  title: "약속 확인 전화",
};

const section: RoleplaySection = {
  episodeId: "tutorial",
  label: "Episode 0.",
  title: "Tutorial.",
  unlocked: true,
  items: [messengerItem, phoneCallItem],
};

function exitButton(): HTMLElement {
  return within(screen.getByTestId("roleplay-episode-screen-exit")).getByTestId(
    "ui-lynx-round-button",
  );
}

test("[E1] 제목이 에피소드의 두 줄을 이어 그리고 header trait를 갖는다", () => {
  render(<RoleplayEpisodeScreen section={section} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const title = screen.getByTestId("roleplay-episode-screen-title");
  expect(title).toHaveTextContent("Episode 0. Tutorial.");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

test("[E2] 나가기가 동그란 버튼으로 서고 이름이 목록으로다", () => {
  render(<RoleplayEpisodeScreen section={section} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const exit = exitButton();
  expect(exit).toHaveAttribute("accessibility-traits", "button");
  expect(exit).toHaveAttribute("accessibility-label", "목록으로");
});

test("[E3] 나가기 tap → onExit 정확히 1회, onSelectItem 0회", () => {
  const onExit = vi.fn<() => void>();
  const onSelectItem = vi.fn<(item: RoleplayItem) => void>();
  render(<RoleplayEpisodeScreen section={section} onSelectItem={onSelectItem} onExit={onExit} />);

  fireEvent.tap(exitButton(), {});

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onSelectItem).not.toHaveBeenCalled();
});

test("[E4] DOM 순서 — 나가기가 제목보다 앞이고 둘 다 스크롤 밖이다", () => {
  render(<RoleplayEpisodeScreen section={section} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const exit = screen.getByTestId("roleplay-episode-screen-exit");
  const title = screen.getByTestId("roleplay-episode-screen-title");
  expect(exit.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  const scroll = screen.getByTestId("roleplay-episode-screen-scroll");
  expect(within(scroll).queryByTestId("roleplay-episode-screen-exit")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("roleplay-episode-screen-title")).not.toBeInTheDocument();
});

test("[E5] 세로 스크롤의 직계 자식이 목록 상자 하나이고, 카드가 받은 순서대로 선다", () => {
  render(<RoleplayEpisodeScreen section={section} onSelectItem={vi.fn()} onExit={vi.fn()} />);

  const scroll = screen.getByTestId("roleplay-episode-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll.children).toHaveLength(1);

  const list = screen.getByTestId("roleplay-episode-screen-list");
  expect(Array.from(list.children).map((el) => el.getAttribute("data-testid"))).toEqual([
    "roleplay-list-item-appointment-confirmation",
    "roleplay-list-item-appointment-confirmation-phone-call",
  ]);
});

test("[E6] 카드 tap → onSelectItem이 정확히 1회, 인자는 그 항목", () => {
  const onSelectItem = vi.fn<(item: RoleplayItem) => void>();
  render(<RoleplayEpisodeScreen section={section} onSelectItem={onSelectItem} onExit={vi.fn()} />);

  fireEvent.tap(screen.getByTestId("roleplay-list-item-appointment-confirmation-phone-call"), {});

  expect(onSelectItem).toHaveBeenCalledTimes(1);
  expect(onSelectItem).toHaveBeenCalledWith(phoneCallItem);
});

test("[E7] 잠긴 구획이 오면 카드가 잠겨 서고 눌러도 열리지 않는다", () => {
  const onSelectItem = vi.fn<(item: RoleplayItem) => void>();
  render(
    <RoleplayEpisodeScreen
      section={{ ...section, unlocked: false }}
      onSelectItem={onSelectItem}
      onExit={vi.fn()}
    />,
  );

  const card = screen.getByTestId("roleplay-list-item-appointment-confirmation");
  expect(card).toHaveAttribute("data-locked", "true");
  fireEvent.tap(card, {});

  expect(onSelectItem).not.toHaveBeenCalled();
});
