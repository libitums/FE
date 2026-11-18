import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { EpisodeIntroEvent } from "../episode-intro/episode-intro.contract";
import { ChatEventsContext } from "./chat-events";
import { createFixtureChatSource } from "./chat-fixture-source";
import { friendsTestIds as ids } from "./chat-friends.contract";
import { clearBackHandlers, tapButtonIn } from "./chat-ui.test-support";
import type { ChatRemote } from "./chat-remote.contract";
import { createCoinWallet } from "./coin-wallet";
import { companionSeed } from "./companion-roster";
import { memoryFriendStore } from "./friend-store";
import { messengerListTestIds as listIds } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(RF-UI30 ~ UI33): 메신저 목록의 추천 친구 — 서버가 보이게 한 친구가 줄에 서고, 카드 → 프로필 시트 → Add friend면 줄에서
// 빠지고 목록에 방이 생긴다(이벤트: 보임 · 프로필 · 추가). open 친구를 성인이 처음 추가하면 확인 대화상자가 먼저 선다. 목록을 못 받으면
// 줄이 없다. 첫 입장 안내는 메모리 기록으로 끈다.

const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

async function mount(friends: ChatRemote["friends"], birthYear = 1995) {
  const events: EpisodeIntroEvent[] = [];
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    friends,
    ackAdult: async () => true,
    profile: {
      load: async () => ({ birthYear, adultAck: false }),
      saveBirthYear: async () => true,
    },
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: birthYear } },
    remote,
    friendStore: memoryFriendStore(),
  });
  render(
    <ChatEventsContext.Provider value={{ sink: (event) => events.push(event), roomId: null }}>
      <MessengerListScreen
        source={source}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn<(id: string) => void>()}
        onGoToJourney={vi.fn<() => void>()}
        onLayerChange={vi.fn<(open: boolean) => void>()}
        notice={null}
        onNoticeShown={vi.fn<() => void>()}
        access="open"
        onSignIn={vi.fn<() => void>()}
        guideStore={{ unseen: () => false, markSeen: () => undefined }}
      />
    </ChatEventsContext.Provider>,
  );
  await flush();
  return { source, events };
}

test("RF-UI30 보이는 친구가 줄에 서고 「보임」 이벤트를 한 번 낸다 — 추가 전 친구는 목록 줄이 없다", async () => {
  const { events } = await mount(async () => [{ id: "daeun", romanceTier: "standard" }]);
  expect(screen.getByTestId(ids.card("daeun"))).toBeTruthy();
  expect(screen.queryByTestId(listIds.row("daeun"))).toBeNull();
  expect(events.filter((e) => e.name === "friends_strip_shown")).toHaveLength(1);
});

test("RF-UI31 카드 → 프로필 → Add friend: 줄이 사라지고 목록에 방이 생긴다", async () => {
  const { events } = await mount(async () => [{ id: "daeun", romanceTier: "standard" }]);
  fireEvent.tap(screen.getByTestId(ids.card("daeun")), {});
  expect(screen.getByTestId(ids.sheet)).toBeTruthy();
  tapButtonIn("ui-lynx-bottom-sheet-action-add");
  await flush();
  expect(screen.queryByTestId(ids.strip)).toBeNull();
  expect(screen.getByTestId(listIds.row("daeun"))).toBeTruthy();
  expect(events.map((e) => e.name)).toEqual(
    expect.arrayContaining(["friend_profile_opened", "friend_added"]),
  );
});

test("RF-UI32 open 친구를 성인이 처음 추가하면 확인 대화상자가 먼저 — 취소해도 추가된다", async () => {
  await mount(async () => [{ id: "seoyeon", romanceTier: "open" }]);
  fireEvent.tap(screen.getByTestId(ids.card("seoyeon")), {});
  tapButtonIn("ui-lynx-bottom-sheet-action-add");
  expect(screen.getByTestId(ids.adultDialog)).toBeTruthy();
  tapButtonIn("ui-lynx-dialog-action-cancel");
  await flush();
  expect(screen.getByTestId(listIds.row("seoyeon"))).toBeTruthy();
});

test("RF-UI33 목록을 못 받으면 줄이 없다", async () => {
  await mount(async () => null);
  expect(screen.queryByTestId(ids.strip)).toBeNull();
});
