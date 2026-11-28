import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import type { ChatServerControls } from "./chat-delivery.contract";
import { clearBackHandlers, makeSource } from "./chat-ui.test-support";
import type { ChatSource } from "./chat-source.contract";
import { createCoinWallet } from "./coin-wallet";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(LS-UI1): 목록 화면에 들어오면 목록을 한 번 맞춘다(`server.syncRooms`) — 다른 탭 · 방에 있는 동안 푸시 없이 온 선톡 ·
// 스토리 반응이 목록에 서게. 다시 그려도 다시 부르지 않는다. LS-UI3 ~ UI5: 보이는 동안 30초마다 · 떠나면 · 앱이 뒤로 가면 멈춤(ADR-0213 개정 2).

afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function serverSource(): { source: ChatSource; syncRooms: ReturnType<typeof vi.fn> } {
  const base = makeSource();
  const syncRooms = vi.fn<() => void>();
  const server: ChatServerControls = {
    resend: () => undefined,
    discard: () => undefined,
    reload: () => undefined,
    refreshOpenRoom: () => undefined,
    pullRoom: () => undefined,
    syncRooms,
  };
  return { source: { ...base, server }, syncRooms };
}

const mount = (source: ChatSource) =>
  render(
    <MessengerListScreen
      source={source}
      wallet={createCoinWallet({ earned: 0 })}
      onOpenRoom={() => undefined}
      onGoToJourney={() => undefined}
      onLayerChange={() => undefined}
      notice={null}
      onNoticeShown={() => undefined}
      access="open"
      onSignIn={() => undefined}
    />,
  );

test("LS-UI1 목록 화면에 들어오면 목록을 한 번 맞추고, 다시 그려도 다시 부르지 않는다", () => {
  const { source, syncRooms } = serverSource();
  const view = mount(source);
  expect(syncRooms).toHaveBeenCalledTimes(1);
  view.rerender(
    <MessengerListScreen
      source={source}
      wallet={createCoinWallet({ earned: 0 })}
      onOpenRoom={() => undefined}
      onGoToJourney={() => undefined}
      onLayerChange={() => undefined}
      notice={null}
      onNoticeShown={() => undefined}
      access="open"
      onSignIn={() => undefined}
    />,
  );
  expect(syncRooms).toHaveBeenCalledTimes(1);
});

test("LS-UI2 서버가 없는 출처(가짜 · 비회원)에서는 아무것도 부르지 않는다", () => {
  expect(() => mount(makeSource())).not.toThrow();
});

const emit = (name: string) =>
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(name, []);
  });

test("LS-UI3 목록이 서 있는 동안 30초마다 한 번씩 맞춘다", () => {
  vi.useFakeTimers();
  const { source, syncRooms } = serverSource();
  mount(source);
  vi.advanceTimersByTime(29_999);
  expect(syncRooms).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1);
  expect(syncRooms).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(60_000);
  expect(syncRooms).toHaveBeenCalledTimes(4);
});

test("LS-UI4 목록을 떠나면(언마운트) 더 부르지 않는다", () => {
  vi.useFakeTimers();
  const { source, syncRooms } = serverSource();
  const view = mount(source);
  view.unmount();
  vi.advanceTimersByTime(120_000);
  expect(syncRooms).toHaveBeenCalledTimes(1);
});

test("LS-UI5 앱이 뒤로 가면 멈추고, 앞으로 오면 30초 주기를 다시 건다", () => {
  vi.useFakeTimers();
  const { source, syncRooms } = serverSource();
  mount(source);
  emit("appDidEnterBackground");
  vi.advanceTimersByTime(120_000);
  expect(syncRooms).toHaveBeenCalledTimes(1);
  emit("contentSyncOpportunity");
  emit("contentSyncOpportunity");
  vi.advanceTimersByTime(30_000);
  expect(syncRooms).toHaveBeenCalledTimes(2);
});
