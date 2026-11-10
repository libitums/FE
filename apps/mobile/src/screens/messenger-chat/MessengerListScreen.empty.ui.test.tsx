import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf } from "./chat-ui.test-support";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(MC-UI9): 빈 목록 — 빈 상태 · 「Go to Journey」 → onGoToJourney 한 번 · 출처 변화(방 지움)가 구독으로 반영.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function mount(seed = seedOf()) {
  const source = makeSource(seed);
  const handlers = {
    onOpenRoom: vi.fn<(id: string) => void>(),
    onGoToJourney: vi.fn<() => void>(),
    onLayerChange: vi.fn<(open: boolean) => void>(),
  };
  render(<MessengerListScreen source={source} coinBalance={0} {...handlers} />);
  return { source, ...handlers };
}

test("MC-UI9. 방이 없으면 빈 상태가 서고 제목 · 본문 · 이동 버튼이 보인다", () => {
  mount();

  const empty = screen.getByTestId(ids.empty);
  expect(empty.textContent).toContain("No chats yet");
  expect(empty.textContent).toContain(
    "Finish an episode, and the people you met will message you here.",
  );
  expect(screen.getByTestId(ids.emptyGoToJourney).textContent).toContain("Go to Journey");
  expect(screen.queryByTestId(ids.list)).toBeNull();
});

test("MC-UI9. 「Go to Journey」를 탭하면 onGoToJourney가 한 번 불린다", () => {
  const { onGoToJourney } = mount();

  fireEvent.tap(screen.getByTestId(ids.emptyGoToJourney), {});

  expect(onGoToJourney).toHaveBeenCalledTimes(1);
});

test("MC-UI9. 방이 있으면 빈 상태가 없다", () => {
  mount(seedOf(fixtureRoom("mina")));

  expect(screen.queryByTestId(ids.empty)).toBeNull();
  expect(screen.getByTestId(ids.row("mina"))).toBeTruthy();
});

test("MC-UI9. 마지막 방을 지우면 구독이 목록을 빈 상태로 바꾼다", () => {
  const { source } = mount(seedOf(fixtureRoom("mina")));
  expect(screen.getByTestId(ids.row("mina"))).toBeTruthy();

  act(() => {
    source.deleteRoom("mina");
  });

  expect(screen.queryByTestId(ids.row("mina"))).toBeNull();
  expect(screen.getByTestId(ids.empty)).toBeTruthy();
});
