import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import { chatFixtureSeed } from "../screens/messenger-chat/chat-fixture";
import { createFixtureChatSource } from "../screens/messenger-chat/chat-fixture-source";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { COMPANION_FRIENDS } from "../screens/messenger-chat/companion-friends-roster";
import { companionSeed } from "../screens/messenger-chat/companion-roster";
import type { VisibleFriend } from "../screens/messenger-chat/friend-catalog.contract";
import { suggestedFriendsTestIds as ids } from "../screens/messenger-chat/suggested-friends.contract";
import { App } from "./App";
import {
  messengerUnlockStore,
  resetMessengerChatSourceForTests,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { setAdultAckAskedStoreForTests, setEarlyAccessRemote } from "./suggested-friends-wiring";
import { openTab, present, renderTesterApp, tapId } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(FI1 ~ FI5, ADR-0164 「앱 인계」): 실제 App · 메신저 탭 · 추천 친구 결선(`suggested-friends-wiring`) · 가짜 서버
// 포트(`companion_friends` · `companion_load_profile` · `companion_ack_adult`). 친구 방은 서버 씨앗과 같은 에피소드 없는 잠긴 방이고,
// 앱 인물 표(정본 JSON)의 소개 · 태그가 시트에 선다. FI5는 출처 + 서버 포트 경계 — 친구를 추가하면 `companion-greet` trigger unlock.
// FI6(ADR-0164 D2 개정): 탭을 떠났다 돌아오면 다시 읽기가 끝나기 전에도 앞서 읽은 친구가 첫 프레임부터 줄 맨 앞에 선다.

type Profile = { readonly birthYear: number | null; readonly adultAck: boolean };

function serverRemote(visible: readonly VisibleFriend[], profile: Profile) {
  const ackAdult = vi.fn(async () => true);
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: { offers: async () => [], unlock: async () => null },
        profile: {
          load: async () => ({ ...profile, replySuggestions: null }),
          saveBirthYear: async () => true,
        },
        friends: { visible: async () => visible, ackAdult },
      }) as unknown as ChatRemote,
  );
  return { ackAdult };
}

const BOTH: readonly VisibleFriend[] = [
  { id: "seoyeon", romanceTier: "open" },
  { id: "daeun", romanceTier: "standard" },
];

let asked = false;

beforeEach(() => {
  asked = false;
  resetMessengerChatSourceForTests({
    ...chatFixtureSeed,
    rooms: [...chatFixtureSeed.rooms, ...companionSeed(COMPANION_FRIENDS).rooms],
    birthYear: { kind: "set", year: 2000 },
  });
  setMessengerChatStoresForTests({ unlock: memoryUnlockStore([]), now: () => Date.now() });
  setAdultAckAskedStoreForTests({
    asked: () => asked,
    markAsked: () => {
      asked = true;
    },
  });
});
afterEach(() => {
  setEarlyAccessRemote(null);
  setAdultAckAskedStoreForTests(null);
  cleanup();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
});

async function settle() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

async function openMessenger() {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  await settle();
}

const rowAvatars = (): (string | null)[] =>
  Array.from(
    screen.queryByTestId(ids.row)?.querySelectorAll('[data-testid^="suggested-friends-avatar-"]') ??
      [],
  ).map((el) => el.getAttribute("data-testid"));

test("FI1. 서버가 보인 친구가 줄 맨 앞에 서고, 시트에 정본의 소개 · 직업 · 나이 · MBTI · 첫 말이 선다", async () => {
  serverRemote(BOTH, { birthYear: 1990, adultAck: false });
  await openMessenger();
  expect(rowAvatars().slice(0, 2)).toEqual([ids.avatar("seoyeon"), ids.avatar("daeun")]);
  fireEvent.tap(screen.getByTestId(ids.avatar("daeun")), {});
  expect(screen.getByTestId(ids.sheetIntro).textContent).toBe(
    "CS junior. I love games and idols. I want to make a foreign friend!",
  );
  expect(screen.getByTestId(ids.sheetTags).textContent).toBe(
    "University student (Computer Science, 3rd year)23 years oldINFP",
  );
  expect(screen.getByTestId(ids.sheetOpening).textContent).toContain("안녕하세요! 송다은이에요.");
});

test("FI2. 성인 · 동의 없음 · open 친구 → Get closer → Sounds good: 동의 RPC 후 방이 열리고 해금 저장 · 토스트", async () => {
  const { ackAdult } = serverRemote(BOTH, { birthYear: 1990, adultAck: false });
  await openMessenger();
  fireEvent.tap(screen.getByTestId(ids.avatar("seoyeon")), {});
  tapId(ids.sheetStart);
  await settle();
  expect(screen.getByTestId(ids.adultAck).textContent).toContain("Get closer with 차서연?");
  tapId(ids.adultAckConfirm);
  await settle();
  expect(ackAdult).toHaveBeenCalledTimes(1);
  expect(asked).toBe(true);
  expect(present("messenger-list-row-seoyeon")).toBe(true);
  expect(messengerUnlockStore().read().has("seoyeon")).toBe(true);
  expect(screen.getByTestId(ids.toast).textContent).toContain("차서연 added to your chats");
});

test("FI3. Just friends for now · standard 친구는 동의 RPC 없이 추가한다", async () => {
  const { ackAdult } = serverRemote(BOTH, { birthYear: 1990, adultAck: false });
  await openMessenger();
  fireEvent.tap(screen.getByTestId(ids.avatar("seoyeon")), {});
  tapId(ids.sheetStart);
  await settle();
  tapId(ids.adultAckDecline);
  await settle();
  fireEvent.tap(screen.getByTestId(ids.avatar("daeun")), {});
  tapId(ids.sheetStart);
  await settle();
  expect(ackAdult).not.toHaveBeenCalled();
  expect(messengerUnlockStore().read().has("seoyeon")).toBe(true);
  expect(messengerUnlockStore().read().has("daeun")).toBe(true);
  expect(present(ids.adultAck)).toBe(false);
});

test("FI4. 나이 모름(생년 없음)은 open 친구라도 시트 없이 추가 · 빈 목록이면 친구가 줄에 없다", async () => {
  const { ackAdult } = serverRemote(BOTH, { birthYear: null, adultAck: false });
  await openMessenger();
  fireEvent.tap(screen.getByTestId(ids.avatar("seoyeon")), {});
  tapId(ids.sheetStart);
  await settle();
  expect(present(ids.adultAck)).toBe(false);
  expect(ackAdult).not.toHaveBeenCalled();
  expect(present("messenger-list-row-seoyeon")).toBe(true);
  cleanup();

  serverRemote([], { birthYear: 1990, adultAck: false });
  await openMessenger();
  expect(rowAvatars()).not.toContain(ids.avatar("seoyeon"));
  expect(rowAvatars()).not.toContain(ids.avatar("daeun"));
});

test("FI5. 서버 방 출처에서 친구를 추가하면 companion-greet를 trigger unlock으로 부른다", async () => {
  const greet = vi.fn<ChatRemote["greet"]>(async () => null);
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
    greet,
    openTurn: () => ({ cancel: () => undefined }),
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => 1_000,
    remote,
  });
  expect(source.unlockCharacter("geonwoo")).toEqual({ kind: "unlocked", roomId: "geonwoo" });
  await settle();
  expect(greet).toHaveBeenCalledWith("geonwoo", "unlock");
  source.dispose();
});

test("FI6. 메신저 탭을 떠났다 돌아오면 다시 읽기가 끝나기 전에도 앞서 읽은 친구가 줄 맨 앞에 그대로 선다", async () => {
  let calls = 0;
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: { offers: async () => [], unlock: async () => null },
        friends: {
          visible: () => {
            calls += 1;
            return calls === 1 ? Promise.resolve(BOTH) : new Promise<never>(() => undefined);
          },
          ackAdult: async () => true,
        },
      }) as unknown as ChatRemote,
  );
  await openMessenger();
  expect(rowAvatars().slice(0, 2)).toEqual([ids.avatar("seoyeon"), ids.avatar("daeun")]);
  openTab("journey");
  await settle();
  openTab("messenger");
  expect(rowAvatars().slice(0, 2)).toEqual([ids.avatar("seoyeon"), ids.avatar("daeun")]);
  await settle();
  expect(calls).toBe(2);
  expect(rowAvatars().slice(0, 2)).toEqual([ids.avatar("seoyeon"), ids.avatar("daeun")]);
});
