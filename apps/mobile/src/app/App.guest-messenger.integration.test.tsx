import { afterEach, beforeEach, expect, test } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import { messengerAccessTestIds as access } from "../screens/messenger-chat/messenger-access";
import {
  messengerChatTestIds as room,
  messengerListTestIds as list,
} from "../screens/messenger-chat/messenger-chat.contract";
import { suggestedFriendsTestIds as sf } from "../screens/messenger-chat/suggested-friends.contract";
import {
  resetMessengerChatSourceForTests,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import {
  flush,
  flushRounds,
  guestMarkerKey,
  installGuestHost,
  present,
  renderGuestApp,
  resetGuestHost,
  tapButtonIn,
} from "./test-helpers/guest-entry";
import { openTab, tapId, tapKeys } from "./test-helpers/messenger-chat-app";

// `integration` 계층(GM1 ~ GM6): 비회원 메신저(ADR-0166) — 회원과 같은 목록(덕수쌤 · 추천 친구 · 첫 입장 안내)을 서버 요청 없이 보고,
// 방에서 보내면 「로그인 필요」 대화상자, 주 단추는 설정 탭 Sign in과 같은 로그인 화면이며 성공하면 같은 방으로 돌아와 회원으로 보낸다.

beforeEach(() => {
  resetMessengerChatSourceForTests();
});
afterEach(() => {
  cleanup();
  resetGuestHost();
  resetMessengerChatSourceForTests();
});

async function bootGuest(unlocked: readonly string[] = []) {
  setMessengerChatStoresForTests({ unlock: memoryUnlockStore(unlocked), now: () => Date.now() });
  const host = installGuestHost({
    store: new Map([
      [guestMarkerKey, "1"],
      [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ]),
  });
  const events: { name: string; [key: string]: unknown }[] = [];
  await renderGuestApp(host, {
    platform: "ios",
    appProps: { episodeIntroEventSink: (event) => void events.push(event as never) },
  });
  openTab("messenger");
  await flush();
  return { host, events };
}

/** 안내 단추는 catchtap입니다. */
const skipGuide = () =>
  void fireEvent.tap(screen.getByTestId(room.guideListSkip), { eventType: "catchEvent" });

const companionRequests = (host: { requests: readonly { url: string }[] }) =>
  host.requests.filter((request) => request.url.includes("companion"));

test("GM1 비회원 메신저 탭 = 회원과 같은 목록 — 덕수쌤 첫 입장 안내, 건너뛰면 덕수쌤 줄 · 추천 친구 줄, 데모 방 · 가입 권유 없음, 서버 요청 0", async () => {
  const { host } = await bootGuest();

  expect(present(access.gate)).toBe(false);
  expect(present(room.guideList)).toBe(true);
  skipGuide();
  await flush();

  expect(screen.getByTestId(list.row("duksu")).textContent).toContain("안녕하세요! 덕수쌤이에요.");
  expect(present(list.row("guesthouse"))).toBe(false);
  expect(present(list.row("owner"))).toBe(false);
  expect(present(sf.row)).toBe(true);
  expect(present(list.coins)).toBe(true);
  expect(companionRequests(host)).toEqual([]);
});

test("GM2 덕수쌤 방을 열면 첫 인사를 읽고, 보내면 대화상자 — Not now는 닫고 이벤트(send · later)가 난다", async () => {
  const { host, events } = await bootGuest();
  skipGuide();
  await flush();
  fireEvent.tap(screen.getByTestId(list.row("duksu")), {});
  await flush();

  expect(screen.getByTestId(room.screen).textContent).toContain("안녕하세요! 덕수쌤이에요.");
  fireEvent.tap(screen.getByTestId(room.field), {});
  tapKeys("ㅇ", "ㅏ", "ㄴ");
  tapId(room.send);
  await flush();

  expect(present(access.prompt)).toBe(true);
  expect(screen.queryAllByTestId(room.outgoing)).toHaveLength(0);
  tapButtonIn("ui-lynx-dialog-action-later");
  await flush();
  expect(present(access.prompt)).toBe(false);
  expect(events.filter((event) => event.name === "chat_sign_in_prompt_closed")).toEqual([
    expect.objectContaining({ surface: "chat", trigger: "send", choice: "later" }),
  ]);
  expect(companionRequests(host)).toEqual([]);
});

test("GM3 주 단추 → 로그인 화면(Google) → 성공하면 같은 방으로 돌아와 회원으로 보낸다", async () => {
  await bootGuest(["mina"]);
  skipGuide();
  await flush();
  fireEvent.tap(screen.getByTestId(list.row("mina")), {});
  await flush();
  fireEvent.tap(screen.getByTestId(room.field), {});
  tapKeys("ㅇ", "ㅏ", "ㄴ");
  tapId(room.send);
  await flush();
  tapButtonIn("ui-lynx-dialog-action-sign-in");
  await flush();

  expect(present("login-screen-title")).toBe(true);
  tapButtonIn("login-screen-method-google");
  await flushRounds();

  expect(present("login-screen-title")).toBe(false);
  expect(screen.getByTestId(room.title).textContent).toBe("미나");
  expect(present(access.prompt)).toBe(false);
  fireEvent.tap(screen.getByTestId(room.field), {});
  tapKeys("ㅇ", "ㅏ", "ㄴ");
  tapId(room.send);
  await flush();
  expect(present(access.prompt)).toBe(false);
  expect(screen.queryAllByTestId(room.outgoing)).toHaveLength(1);
});

test("GM4 추천 친구 Start chatting은 대화상자(add_friend) — 친구가 목록에 추가되지 않는다", async () => {
  const { events } = await bootGuest();
  skipGuide();
  await flush();
  fireEvent.tap(screen.getByTestId(sf.avatar("daeun")), {});
  await flush();
  tapId(sf.sheetStart);
  await flush();

  expect(present(access.prompt)).toBe(true);
  tapButtonIn("ui-lynx-dialog-action-later");
  await flush();
  expect(present(list.row("daeun"))).toBe(false);
  expect(events.filter((event) => event.name === "chat_sign_in_prompt_closed")).toEqual([
    expect.objectContaining({ trigger: "add_friend", choice: "later" }),
  ]);
});

// ---------------------------------------------------------------- 2026-11-20 결정(ADR-0166 확인 필요 1 · 2)

test("GM5 비회원이 방을 열면 생년 시트 없이 첫 인사와 입력 줄 — 대화상자 제목은 누른 자리(≡ → 대화 설정)", async () => {
  await bootGuest();
  skipGuide();
  await flush();
  fireEvent.tap(screen.getByTestId(list.row("duksu")), {});
  await flush();

  expect(present(room.birthYearSheet)).toBe(false);
  expect(present(room.field)).toBe(true);
  tapId(room.settings);
  await flush();
  expect(screen.getByTestId("ui-lynx-dialog-title").textContent).toBe("Chat settings");
});

test("GM6 비회원 티켓 모달 Get more tickets → 로그인 권유(tickets) — 「coming soon」 안내 · 무료 지급 없음, 주 단추는 로그인 화면", async () => {
  const { events } = await bootGuest();
  skipGuide();
  await flush();
  openTab("journey");
  await flush();
  fireEvent.tap(screen.getByTestId("top-bar-tickets"), {});
  await flush();
  fireEvent.tap(screen.getByTestId("ticket-modal-more"), {});
  await flush();

  expect(present(access.prompt)).toBe(true);
  expect(screen.getByTestId("ui-lynx-dialog-title").textContent).toBe("Get more tickets");
  expect(present("ticket-modal-more-notice")).toBe(false);
  expect(events.filter((event) => event.name === "ticket_more_tapped")).toEqual([]);
  tapButtonIn("ui-lynx-dialog-action-sign-in");
  await flush();
  expect(present("login-screen-title")).toBe(true);
  expect(events.filter((event) => event.name === "chat_sign_in_prompt_closed")).toEqual([
    expect.objectContaining({ trigger: "tickets", choice: "sign_in" }),
  ]);
});
