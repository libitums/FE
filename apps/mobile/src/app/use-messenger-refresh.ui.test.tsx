import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { contentSyncEventName } from "./use-episode-content-refresh";
import { useMessengerRefresh } from "./use-messenger-refresh";

// `ui` 계층(ES-UI6): 앱이 앞으로 오거나 연결이 돌아오면(호스트 신호) 메신저의 열린 방을 다시 읽는다(ADR-0138).

const refreshOpenRoom = vi.fn<() => void>();
vi.mock("./messenger-chat-wiring", () => ({
  currentMessengerChatSource: () => ({ server: { refreshOpenRoom } }),
}));

afterEach(cleanup);

function Probe() {
  useMessengerRefresh();
  return <view />;
}

test("ES-UI6 contentSyncOpportunity가 오면 열린 방을 다시 읽는다", () => {
  render(<Probe />);
  expect(refreshOpenRoom).not.toHaveBeenCalled();
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(contentSyncEventName, []);
  });
  expect(refreshOpenRoom).toHaveBeenCalledTimes(1);
});
