import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf } from "./chat-ui.test-support";
import type { ChatSource } from "./chat-source.contract";
import { createCoinWallet } from "./coin-wallet";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";

// 리뷰 #10: 줄이 그려진 횟수를 셉니다(그리는 중 시계를 읽는 한 번이면 충분해야 한다).
const rowRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock("./ChatListRow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ChatListRow")>();
  return {
    ...actual,
    ChatListRow: (props: Parameters<typeof actual.ChatListRow>[0]) => {
      if (props.room.roomId === "mina") rowRenders.count += 1;
      return actual.ChatListRow(props);
    },
  };
});

// `ui` 계층(MC-UI8): 채팅 목록 — 줄 순서(최근 먼저 · 잠김 끝) · 안 읽은 알약 · 미리보기 tone ·
// 잠김 줄 data-locked · 탭 무동작 · 열린 줄 탭 → onOpenRoom(id) · 줄 낭독. 계산은 unit(chat-list)이 진다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

// 입력 순서를 일부러 뒤섞습니다: 잠김 → 오래된 방 → 최근 방.
const seed = () =>
  seedOf(
    fixtureRoom("clerk", {
      counterpart: { id: "clerk", name: "점원", avatarPath: null },
      access: { kind: "locked", unlockEpisode: 4 },
      messages: [],
    }),
    fixtureRoom("boss", {
      counterpart: { id: "boss", name: "사장님", avatarPath: null },
      messages: [
        { kind: "text", from: "them", text: { ko: "어서 오세요", en: "Welcome" }, minutesAgo: 300 },
      ],
    }),
    fixtureRoom("mina", {
      unread: 2,
      messages: [
        {
          kind: "text",
          from: "them",
          text: { ko: "오늘 뭐 해요?", en: "What now?" },
          minutesAgo: 2,
        },
      ],
    }),
  );

function mount(source: ChatSource = makeSource(seed())) {
  const handlers = {
    onOpenRoom: vi.fn<(id: string) => void>(),
    onGoToJourney: vi.fn<() => void>(),
    onLayerChange: vi.fn<(open: boolean) => void>(),
  };
  // 잔액은 지갑에서 온다(spec §7.2 · 1.5 — 옛 coinBalance 대체).
  render(
    <MessengerListScreen
      source={source}
      wallet={createCoinWallet({ earned: 120 })}
      {...handlers}
    />,
  );
  return { source, ...handlers };
}

const rowOrder = (): string[] =>
  Array.from(screen.getByTestId(ids.list).querySelectorAll('[data-testid^="messenger-list-row-"]'))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) => /^messenger-list-row-[^-]+$/.test(id));

test("MC-UI8. 줄 순서는 최근 대화 먼저, 잠긴 방은 맨 끝이다", () => {
  mount();

  expect(rowOrder()).toEqual([
    "messenger-list-row-mina",
    "messenger-list-row-boss",
    "messenger-list-row-clerk",
  ]);
});

test("MC-UI8. 목록 머리 제목은 Chats이고 화면 test-id가 선다", () => {
  mount();

  expect(screen.getByTestId(ids.screen)).toBeTruthy();
  expect(screen.getByTestId(ids.title).textContent).toBe("Chats");
});

test("MC-UI8. 안 읽은 알약은 안 읽은 수가 있는 줄에만 서고 수를 보인다", () => {
  mount();

  expect(screen.getByTestId(ids.rowUnread("mina")).textContent).toBe("2");
  expect(screen.queryByTestId(ids.rowUnread("boss"))).toBeNull();
  expect(screen.queryByTestId(ids.rowUnread("clerk"))).toBeNull();
});

test("MC-UI8. 미리보기 tone — 안 읽음은 unread, 읽음은 muted", () => {
  mount();

  expect(screen.getByTestId(ids.rowPreview("mina")).getAttribute("data-tone")).toBe("unread");
  expect(screen.getByTestId(ids.rowPreview("mina")).textContent).toContain("오늘 뭐 해요?");
  expect(screen.getByTestId(ids.rowPreview("boss")).getAttribute("data-tone")).toBe("muted");
});

test("MC-UI8. 상대가 입력 중이면 미리보기가 activity tone으로 바뀌고 문구가 입력 중이다", () => {
  const { source } = mount();

  act(() => {
    source.sendText("boss", "안녕하세요");
  });
  act(() => {
    vi.advanceTimersByTime(600);
  });

  const preview = screen.getByTestId(ids.rowPreview("boss"));
  expect(preview.getAttribute("data-tone")).toBe("activity");
  expect(preview.textContent).toBe("사장님 is typing…");
});

test("MC-UI8. 사진을 보내는 중이면 미리보기가 그 문구이고 activity tone이다", () => {
  const { source } = mount();

  act(() => {
    source.requestMedia("boss", "photo");
  });

  const preview = screen.getByTestId(ids.rowPreview("boss"));
  expect(preview.getAttribute("data-tone")).toBe("activity");
  expect(preview.textContent).toBe("사장님 is sending a picture…");
});

test("MC-UI8. 잠긴 줄은 data-locked이고 조건을 보이며 시간 · 안 읽은 알약이 없다", () => {
  mount();

  expect(screen.getByTestId(ids.row("clerk")).getAttribute("data-locked")).toBe("true");
  expect(screen.getByTestId(ids.row("mina")).getAttribute("data-locked")).not.toBe("true");
  expect(screen.getByTestId(ids.rowPreview("clerk")).textContent).toBe(
    "Finish Episode 4 to start chatting",
  );
  expect(screen.queryByTestId(ids.rowTime("clerk"))).toBeNull();
});

test("MC-UI8. 열린 줄의 시간은 지역 시각 h:mm이다", () => {
  mount();

  expect(screen.getByTestId(ids.rowTime("mina")).textContent).toBe("11:58");
});

test("MC-UI8. 열린 줄을 탭하면 그 roomId로 onOpenRoom이 한 번 불린다", () => {
  const { onOpenRoom } = mount();

  fireEvent.tap(screen.getByTestId(ids.row("boss")), {});

  expect(onOpenRoom).toHaveBeenCalledTimes(1);
  expect(onOpenRoom).toHaveBeenCalledWith("boss");
});

test("MC-UI8. 잠긴 줄 탭은 무동작이고 버튼 trait도 없다", () => {
  const { onOpenRoom } = mount();

  const locked = screen.getByTestId(ids.row("clerk"));
  fireEvent.tap(locked, {});

  expect(onOpenRoom).not.toHaveBeenCalled();
  expect(locked.getAttribute("accessibility-traits") ?? "").not.toContain("button");
  expect(screen.getByTestId(ids.row("mina")).getAttribute("accessibility-traits")).toBe("button");
});

test("MC-UI8. 줄은 한 요소로 읽힌다 — 이름, 미리보기, 시간, 안 읽은 수 / 잠김은 조건", () => {
  mount();

  const label = screen.getByTestId(ids.row("mina")).getAttribute("accessibility-label") ?? "";
  expect(label).toContain("미나");
  expect(label).toContain("오늘 뭐 해요?");
  expect(label).toContain("11:58");
  expect(label).toContain("2 unread");
  expect(screen.getByTestId(ids.row("mina")).getAttribute("accessibility-element")).toBe("true");
  expect(screen.getByTestId(ids.row("clerk")).getAttribute("accessibility-label")).toBe(
    "점원, locked, Finish Episode 4 to start chatting",
  );
});

test("MC-UI8. 출처가 바뀌면 목록이 따라간다 — 방을 열면 안 읽은 알약이 사라진다", () => {
  const { source } = mount();

  act(() => {
    source.openRoom("mina");
  });

  expect(screen.queryByTestId(ids.rowUnread("mina"))).toBeNull();
  expect(screen.getByTestId(ids.rowPreview("mina")).getAttribute("data-tone")).toBe("muted");
});

test("#10. 출처가 한 번 바뀌면 줄은 한 번만 다시 그려지고, 다시 그릴 때 시각 기준이 새로 잡힌다", () => {
  const { source } = mount();
  rowRenders.count = 0;

  // 시계가 움직인 뒤의 변경 — 시각을 상태로 두고 효과로 갱신하면 같은 변경에 두 번 그려진다.
  vi.setSystemTime(new Date(2026, 10, 9, 12, 10, 0));
  act(() => {
    source.openRoom("mina");
  });
  expect(rowRenders.count).toBe(1);

  vi.setSystemTime(new Date(2026, 10, 9, 12, 30, 0));
  act(() => {
    source.sendText("mina", "안녕");
  });
  expect(screen.getByTestId(ids.rowPreview("mina")).textContent).toContain("안녕");
});
