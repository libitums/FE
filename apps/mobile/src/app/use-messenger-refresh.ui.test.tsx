import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { contentSyncEventName } from "./use-episode-content-refresh";
import { useMessengerRefresh } from "./use-messenger-refresh";

// `ui` 계층(ES-UI6 · FS-UI18): 앱이 앞으로 오거나 연결이 돌아오면(호스트 신호) 메신저의 열린 방을 다시 읽고(ADR-0138),
// 서 있는 친구 스토리 목록에도 다시 읽기를 알린다(ADR-0178 「다시 읽기」).

const refreshOpenRoom = vi.fn<() => void>();
vi.mock("./messenger-chat-wiring", () => ({
  currentMessengerChatSource: () => ({ server: { refreshOpenRoom } }),
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
