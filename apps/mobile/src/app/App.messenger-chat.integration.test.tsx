import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { CHAT_PLACEHOLDERS } from "../screens/messenger-chat/chat-placeholders";
import { App } from "./App";
import {
  advance,
  appChatSource,
  isTabSelected,
  listRowOrder,
  openTab,
  present,
  renderTesterApp,
  resetMessengerChatSource,
  tapButtonIn,
  tapId,
  tapKeys,
  tapRound,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed, legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(MC-I3 · MC-I4 · MC-I5): 가짜 출처 싱글턴이 목록 ↔ 방 사이에 상태를 잇는지 봅니다 —
// 방에서 보낸 글 · 답 · 사진 요청이 목록 줄의 순서 · 미리보기 · activity에 나타나고, 방 지우기가 목록에서 줄을
// 빼며, 방이 하나도 없으면 빈 목록이 여정으로 이어진다. 실제 App · 두 화면 · 출처가 맞물리고 타이머는 가짜입니다.
// 출처 씨앗(chat-fixture.ts): 사장님 · 익선 게스트하우스(안 읽음 1)는 열려 있고 미나(에피소드 3 최종 통과 전) · 점원은 잠겨 있다.
// 1.5단계: 미나가 잠겼으므로 열린 방 둘이 최근 먼저, 잠긴 둘이 입력 순서(미나 · 점원)로 맨 끝에 온다.
// 사장님의 첫 정해 둔 답은 「네, 오후 세 시부터예요.」 / "Yes, from three in the afternoon."이다.

const timing = CHAT_PLACEHOLDERS.timing;
const OWNER_REPLY_KO = "네, 오후 세 시부터예요.";
const OWNER_REPLY_EN = "Yes, from three in the afternoon.";
// 잠긴 방(미나 · 점원)은 목록에 없다 — 해금되면 생긴다(HL, 2026-11-13).
const INITIAL_ORDER = ["guesthouse", "owner"];

const row = (id: string) => `messenger-list-row-${id}`;
const preview = (id: string) => `messenger-list-row-${id}-preview`;
const unread = (id: string) => `messenger-list-row-${id}-unread`;

beforeEach(async () => {
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** 가짜 타이머로 부팅해 메신저 탭의 목록까지 갑니다. */
async function bootToList(coins = 0): Promise<void> {
  await renderTesterApp(<App progressSeed={legacyPassedSeedWithCoins(coins)} />, {
    keepFakeTimers: true,
  });
  openTab("messenger");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
}

/** 목록의 줄을 열어 방까지 갑니다. */
function openRoom(id: string): void {
  tapId(row(id));
  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
}

function leaveRoom(): void {
  tapRound("messenger-chat-back");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
}

/** 학습 키보드로 「안」을 쓰고 보냅니다. */
function sendAn(): void {
  // 방은 키보드가 닫힌 채 열리므로(사용자 결정 2026-11-09) 입력 칸을 눌러 학습 키보드를 먼저 엽니다.
  tapId("messenger-chat-field");
  tapKeys("ㅇ", "ㅏ", "ㄴ");
  tapRound("messenger-chat-send");
}

// ------------------------------------------------------------------ MC-I3 · 보내기 → 답 → 목록

test("MC-I3. 방에서 글을 보내면 내 줄이 서고, 답이 오면 상대 줄이 정해 둔 글과 번역으로 선다", async () => {
  await bootToList();
  openRoom("owner");
  expect(screen.getAllByTestId("messenger-chat-incoming")).toHaveLength(1);
  expect(present("messenger-chat-outgoing")).toBe(false);

  sendAn();
  expect(screen.getAllByTestId("messenger-chat-outgoing")).toHaveLength(1);

  advance(timing.typingDelayMs);
  expect(present("messenger-chat-typing")).toBe(true);
  advance(timing.replyDelayMs);

  expect(present("messenger-chat-typing")).toBe(false);
  const incoming = screen.getAllByTestId("messenger-chat-incoming");
  expect(incoming).toHaveLength(2);
  expect(incoming[1]?.textContent).toContain(OWNER_REPLY_KO);
  expect(incoming[1]?.textContent).toContain(OWNER_REPLY_EN);
});

test("MC-I3. 답까지 받고 목록으로 돌아오면 그 줄이 맨 위이고 미리보기는 상대의 답이며 안 읽은 알약은 없다", async () => {
  await bootToList();
  expect(listRowOrder()).toEqual(INITIAL_ORDER);
  openRoom("owner");
  sendAn();
  advance(timing.typingDelayMs + timing.replyDelayMs);

  leaveRoom();

  expect(listRowOrder()).toEqual(["owner", "guesthouse"]);
  expect(textOf(preview("owner"))).toContain(OWNER_REPLY_KO);
  expect(screen.getByTestId(preview("owner")).getAttribute("data-tone")).toBe("muted");
  expect(present(unread("owner"))).toBe(false);
});

test("MC-I3. 보내자마자 목록으로 나오면 그 줄은 이미 맨 위이고 미리보기는 「You: 안」이다", async () => {
  await bootToList();
  openRoom("owner");
  sendAn();

  leaveRoom();

  expect(listRowOrder()[0]).toBe("owner");
  expect(textOf(preview("owner"))).toContain("You: 안");
});

test("MC-I3. 방에서 나온 뒤 상대가 입력 중이 되면 목록 줄의 미리보기가 입력 중 activity로 바뀐다", async () => {
  await bootToList();
  openRoom("owner");
  sendAn();
  leaveRoom();

  advance(timing.typingDelayMs);

  const line = screen.getByTestId(preview("owner"));
  expect(line.getAttribute("data-tone")).toBe("activity");
  expect(line.textContent).toContain("사장님 is typing…");
});

test("MC-I3. 목록으로 나갔다 같은 방을 다시 열면 보낸 글과 받은 답이 그대로 로그에 있다", async () => {
  await bootToList();
  openRoom("owner");
  sendAn();
  advance(timing.typingDelayMs + timing.replyDelayMs);
  leaveRoom();

  openRoom("owner");

  expect(screen.getAllByTestId("messenger-chat-outgoing")).toHaveLength(1);
  expect(screen.getAllByTestId("messenger-chat-incoming")).toHaveLength(2);
});

test("MC-I3. 방을 열면 그 방의 안 읽은 알약이 사라진다(게스트하우스 1 → 0), 다른 방의 것은 그대로다", async () => {
  await bootToList();
  const source = await appChatSource();
  // 미나는 잠겨 있어 안 읽음이 없다(1.5단계) — 해금해 두 번째 안 읽음(opening 1)을 만든다.
  act(() => {
    source?.unlockCharacter("mina");
  });
  expect(textOf(unread("guesthouse"))).toBe("1");
  expect(textOf(unread("mina"))).toBe("1");

  openRoom("guesthouse");
  leaveRoom();

  expect(present(unread("guesthouse"))).toBe(false);
  expect(textOf(unread("mina"))).toBe("1");
});

// ------------------------------------------------------------------ MC-I4 · 사진 요청 → 목록

test("MC-I4. 사진을 요청하고 곧바로 목록으로 나오면 그 줄이 「… is sending a picture…」 activity이고, 3초 뒤 미리보기는 Photo다", async () => {
  await bootToList(120);
  openRoom("owner");
  tapId("messenger-chat-feature-snapshot");
  expect(screen.getByTestId("messenger-chat-ask").getAttribute("data-plan")).toBe("ask");
  tapRound("messenger-chat-ask-confirm");
  expect(present("messenger-chat-photo-pending")).toBe(true);

  leaveRoom();

  const line = screen.getByTestId(preview("owner"));
  expect(line.getAttribute("data-tone")).toBe("activity");
  expect(line.textContent).toContain("사장님 is sending a picture…");

  advance(timing.photoArrivalMs);

  const arrived = screen.getByTestId(preview("owner"));
  expect(arrived.getAttribute("data-tone")).not.toBe("activity");
  expect(arrived.textContent).toContain("Photo");
  expect(arrived.textContent).not.toContain("sending a picture");
});

test("MC-I4. 잔액이 0이면 사진 요청은 보내지 않고 「Get coins」 길로 간다 — 목록 줄은 변하지 않는다", async () => {
  await bootToList(0);
  openRoom("owner");

  tapId("messenger-chat-feature-snapshot");

  expect(screen.getByTestId("messenger-chat-ask").getAttribute("data-plan")).toBe("top-up");
  expect(textOf("messenger-chat-ask-balance")).toBe("You have 0 coins");
  expect(present("messenger-chat-photo-pending")).toBe(false);
  leaveRoom();
  expect(screen.getByTestId(preview("owner")).getAttribute("data-tone")).not.toBe("activity");
});

test("MC-I4. 방의 사진 요청 대화상자의 잔액은 앱의 엽전 잔액이다", async () => {
  await bootToList(100);
  openRoom("owner");

  tapId("messenger-chat-feature-snapshot");

  expect(textOf("messenger-chat-ask-balance")).toBe("You have 100 coins");
});

// ------------------------------------------------------------------ MC-I5 · 지우기 · 빈 목록

async function deleteOpenedRoom(id: string): Promise<void> {
  openRoom(id);
  tapRound("messenger-chat-settings");
  tapId("messenger-chat-sidebar-delete");
  tapButtonIn("ui-lynx-dialog-action-delete");
  // 방이 출처에서 사라진 것을 본 화면이 나가는 길을 한 틱 안에서 마칩니다.
  await act(async () => {
    await Promise.resolve();
  });
}

test("MC-I5. 사이드바 › Delete chat › 확인하면 목록으로 돌아오고 그 줄만 사라진다", async () => {
  await bootToList();

  await deleteOpenedRoom("guesthouse");

  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
  expect(present("messenger-chat-screen")).toBe(false);
  expect(present(row("guesthouse"))).toBe(false);
  expect(listRowOrder()).toEqual(["owner"]);
  expect(screen.getByTestId("ui-lynx-bottom-navigator")).toBeInTheDocument();
  expect(isTabSelected("messenger")).toBe(true);
});

test("MC-I5. 지우기 확인을 Cancel하면 방도 줄도 그대로 남는다", async () => {
  await bootToList();
  openRoom("guesthouse");
  tapRound("messenger-chat-settings");
  tapId("messenger-chat-sidebar-delete");

  tapButtonIn("ui-lynx-dialog-action-cancel");

  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
  leaveRoom();
  expect(listRowOrder()).toEqual(INITIAL_ORDER);
});

test("MC-I5. 열 수 있는 방을 모두 지우면 잠긴 방만 남아 빈 목록이 선다(HL-I1 — 잠긴 방은 줄이 없다)", async () => {
  await bootToList();

  for (const id of ["guesthouse", "owner"]) await deleteOpenedRoom(id);

  expect(screen.getByTestId("messenger-list-empty")).toBeInTheDocument();
  expect(present(row("mina"))).toBe(false);
  expect(present(row("clerk"))).toBe(false);
});

test("MC-I5. 출처가 비면 빈 목록이 서고, 「Go to Journey」를 누르면 여정 탭의 맵이 선다", async () => {
  await bootToList();
  const source = await appChatSource();
  expect(source).not.toBeNull();

  act(() => {
    for (const id of ["mina", "guesthouse", "owner", "clerk"]) source?.deleteRoom(id);
  });

  expect(screen.getByTestId("messenger-list-empty")).toBeInTheDocument();
  expect(present("messenger-list-list") ? listRowOrder() : []).toEqual([]);

  fireEvent.tap(screen.getByTestId("messenger-list-empty-go"), {});

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(present("messenger-list-screen")).toBe(false);
  expect(isTabSelected("journey")).toBe(true);
});
