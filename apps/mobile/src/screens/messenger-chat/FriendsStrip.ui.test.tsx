import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { friendsTestIds as ids } from "./chat-friends.contract";
import { FriendsStrip } from "./FriendsStrip";

// `ui` 계층(RF-UI1 ~ UI3): 추천 줄 — 카드(이름 · 직업 태그)가 서고, 누르면 그 친구 id로 연다. 카드가 없으면 줄이 없다. 「보임」은
// 첫 입장 안내가 없을 때(active) 한 번만 낸다. 스크롤 막대는 끈다.

afterEach(() => {
  cleanup();
});

const cards = [
  { id: "seoyeon", name: "차서연", avatarUrl: null, tag: "Tattoo artist & illustrator" },
  { id: "daeun", name: "송다은", avatarUrl: null, tag: "University student" },
];

test("RF-UI1 제목과 카드 둘(이름 · 태그)이 서고, 카드를 누르면 onOpen(id)", () => {
  const onOpen = vi.fn<(id: string) => void>();
  render(<FriendsStrip cards={cards} active={true} onOpen={onOpen} onShown={vi.fn()} />);
  expect(screen.getByTestId(ids.stripTitle).textContent).toBe("Recommended friends");
  expect(screen.getByTestId(ids.card("seoyeon")).textContent).toContain("차서연");
  expect(screen.getByTestId(ids.card("seoyeon")).getAttribute("accessibility-label")).toContain(
    "Tattoo artist",
  );
  fireEvent.tap(screen.getByTestId(ids.card("daeun")), {});
  expect(onOpen).toHaveBeenCalledWith("daeun");
});

test("RF-UI2 카드가 없으면 줄 자체가 없다", () => {
  render(<FriendsStrip cards={[]} active={true} onOpen={vi.fn()} onShown={vi.fn()} />);
  expect(screen.queryByTestId(ids.strip)).toBeNull();
});

test("RF-UI3 「보임」은 안내가 끝난 뒤(active) 한 번만 — 카드 수를 싣는다", () => {
  const onShown = vi.fn<(count: number) => void>();
  const view = render(
    <FriendsStrip cards={cards} active={false} onOpen={vi.fn()} onShown={onShown} />,
  );
  expect(onShown).not.toHaveBeenCalled();
  view.rerender(<FriendsStrip cards={cards} active={true} onOpen={vi.fn()} onShown={onShown} />);
  view.rerender(<FriendsStrip cards={cards} active={true} onOpen={vi.fn()} onShown={onShown} />);
  expect(onShown).toHaveBeenCalledTimes(1);
  expect(onShown).toHaveBeenCalledWith(2);
});
