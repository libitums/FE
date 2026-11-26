import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { pushReceivedEventName } from "./foreground-push";
import { contentSyncEventName } from "./use-episode-content-refresh";
import { useMessengerRefresh } from "./use-messenger-refresh";

// `ui` 계층(ES-UI6 · FS-UI18): 앱이 앞으로 오거나 연결이 돌아오면(호스트 신호) 메신저의 열린 방을 다시 읽고(ADR-0138),
// 서 있는 친구 스토리 목록에도 다시 읽기를 알린다(ADR-0178 「다시 읽기」). 앱이 앞에 있을 때 온 인물의 채팅 푸시(FP-UI1, ADR-0200
// 개정)는 그 인물의 방만 다시 읽는다.

const refreshOpenRoom = vi.fn<() => void>();
const pullRoom = vi.fn<(roomId: string) => void>();
vi.mock("./messenger-chat-wiring", () => ({
  currentMessengerChatSource: () => ({ server: { refreshOpenRoom, pullRoom } }),
}));
vi.mock("./foreground-push", () => ({
  pushReceivedEventName: "pushNotificationReceived",
  foregroundChatPushRoom: (_source: unknown, raw: unknown) => (raw === "mina" ? "room-mina" : null),
}));
const notifyFriendStoriesReload = vi.fn<() => void>();
vi.mock("./friend-stories-wiring", () => ({
  notifyFriendStoriesReload: () => notifyFriendStoriesReload(),
}));

afterEach(cleanup);

function Probe() {
  useMessengerRefresh();
  return <view />;
}

test("ES-UI6 · FS-UI18 contentSyncOpportunity가 오면 열린 방을 다시 읽고 스토리 목록에 알린다", () => {
  render(<Probe />);
  expect(refreshOpenRoom).not.toHaveBeenCalled();
  expect(notifyFriendStoriesReload).not.toHaveBeenCalled();
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(contentSyncEventName, []);
  });
  expect(refreshOpenRoom).toHaveBeenCalledTimes(1);
  expect(notifyFriendStoriesReload).toHaveBeenCalledTimes(1);
});

test("FP-UI1 앞에서 받은 채팅 푸시는 그 인물의 방만 다시 읽고, 모르는 인물이면 아무것도 하지 않는다", () => {
  vi.clearAllMocks();
  render(<Probe />);
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(pushReceivedEventName, ["mina"]);
    lynx.getJSModule("GlobalEventEmitter").emit(pushReceivedEventName, ["nobody"]);
  });
  expect(pullRoom).toHaveBeenCalledTimes(1);
  expect(pullRoom).toHaveBeenCalledWith("room-mina");
  expect(notifyFriendStoriesReload).not.toHaveBeenCalled();
});
