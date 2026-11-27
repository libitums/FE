import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import type { ChatServerControls } from "./chat-delivery.contract";
import { clearBackHandlers, makeSource } from "./chat-ui.test-support";
import type { ChatSource } from "./chat-source.contract";
import { createCoinWallet } from "./coin-wallet";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(LS-UI1): 목록 화면에 들어오면 목록을 한 번 맞춘다(`server.syncRooms`) — 다른 탭 · 방에 있는 동안 푸시 없이 온 선톡 ·
// 스토리 반응이 목록에 서게. 서 있는 동안 다시 그려도 다시 부르지 않는다(폴링 없음, ADR-0200).

afterEach(() => {
  cleanup();
  clearBackHandlers();
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
