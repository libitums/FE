import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import { createFixtureChatSource } from "./chat-fixture-source";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatRemote } from "./chat-remote.contract";
import { chatTurnsTestIds as turnIds } from "./chat-turns.contract";
import {
  advance,
  clearBackHandlers,
  fixtureRoom,
  imageUrlOf,
  KEYS_AN,
  mountChat,
  mountChatOpen,
  outgoingCount,
  seedOf,
  slotContent,
  systemBack,
  tapId,
  tapKeys,
  textOf,
} from "./chat-ui.test-support";
import { createCoinWallet } from "./coin-wallet";
import { TRIAL_CHARACTER_ID } from "./free-turns";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { createTrialStore } from "./trial-store";

// `ui` 계층(CP-UI1 ~ UI12): 방 화면의 요금은 서버 규칙을 따른다(ADR-0155) — 체험 인물(덕수쌤)은 체험 20통(남은 수 → 마지막 무료 띠 →
// 다 쓴 판 한 번 → 엽전), 그 밖의 인물은 첫 통부터 엽전 보내기. 하루 무료 수 · 자정 초기화는 없다. 서버 방은 앱 지갑에서 빼지 않는다.
// 무제한 티켓은 학습 전용이라(2026-11-10 결정) 띠 · 판 어디에도 Go unlimited가 없다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

const timing = CHAT_PLACEHOLDERS.timing;
const restore = (): ReturnType<typeof vi.fn> => vi.mocked(inputFocus.restoreAccessibilityFocus);

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

/** 체험 인물 방(덕수쌤) 또는 그 밖의 인물 방(미나) — 메모리 지갑 · 체험 저장. */
function room(
  over: {
    earned?: number;
    trial?: number | null;
    tier?: "free" | "unlimited";
    character?: "trial" | "other";
  } = {},
) {
  const roomId = over.character === "other" ? "mina" : TRIAL_CHARACTER_ID;
  return {
    roomId,
    wallet: createCoinWallet({ earned: over.earned ?? 100 }),
    trial: createTrialStore(over.trial === undefined ? 20 : over.trial),
    seed: seedOf(fixtureRoom(roomId)),
    tier: over.tier ?? "free",
  };
}

const lineText = (): string => textOf(turnIds.line);
/** 글자 「안」을 쳐서 보내고, 답이 올 때까지 시간을 흘립니다. */
function sendFree(): void {
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  advance(timing.typingDelayMs + timing.replyDelayMs);
}
const sendCoin = (): void => {
  tapKeys(...KEYS_AN);
  tapId(turnIds.coinSend);
  advance(timing.typingDelayMs + timing.replyDelayMs);
};
const flushFrame = (): void => {
  act(() => {
    vi.advanceTimersByTime(16);
  });
};

// ------------------------------------------------------------------ 체험 인물

test("CP-UI1. 체험 인물: 처음엔 「20 of 20 free messages left」 · 보내기 단추 · 띠 · 판이 없다", () => {
  mountChatOpen(room());

  expect(lineText()).toBe("20 of 20 free messages left");
  expect(screen.getByTestId(ids.send)).toBeTruthy();
  expect(screen.queryByTestId(turnIds.strip)).toBeNull();
  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.queryByTestId(turnIds.coinSend)).toBeNull();
});

test("CP-UI1. 한 통 보내면 체험이 하나 줄고(19) 엽전은 쓰지 않는다 — 「today」 · 남은 시간이 없다", () => {
  const env = room();
  mountChatOpen(env);

  sendFree();

  expect(lineText()).toBe("19 of 20 free messages left");
  expect(env.trial.remaining()).toBe(19);
  expect(outgoingCount()).toBe(1);
  expect(env.wallet.balance()).toBe(100);
});

test("CP-UI2. 체험 수를 아직 모르면 수 없이 「Free trial messages」이고 무료로 보낸다", () => {
  const env = room({ trial: null });
  mountChatOpen(env);
  expect(lineText()).toBe("Free trial messages");

  sendFree();

  expect(outgoingCount()).toBe(1);
  expect(env.wallet.balance()).toBe(100);
  expect(env.trial.remaining()).toBeNull();
});

test("CP-UI3. 체험이 하나 남으면 「Last free message」와 입력 줄 위 띠가 선다", () => {
  const env = room({ trial: 2 });
  mountChatOpen(env);

  sendFree();

  expect(lineText()).toBe("Last free message");
  expect(screen.getByTestId(turnIds.strip).textContent).toContain(
    "After this, 3 coins per message",
  );
  expect(screen.getByTestId(ids.send)).toBeTruthy();
});

test("CP-UI4. 마지막 체험을 보내면 판이 독을 대신한다 — 입력 · 기능 줄이 사라지고 로그는 보이며 키보드가 접힌다", () => {
  const env = room({ trial: 1 });
  mountChatOpen(env);
  expect(slotContent()).toBe("learning-keyboard");

  sendFree();

  expect(screen.getByTestId(turnIds.panel)).toBeTruthy();
  expect(screen.getByTestId(turnIds.panel).textContent).toContain("Your 20 free messages are used");
  expect(screen.queryByTestId(ids.composer)).toBeNull();
  expect(screen.queryByTestId(ids.featureRow)).toBeNull();
  expect(screen.queryByTestId(ids.slot)).toBeNull();
  expect(screen.getByTestId(ids.log)).toBeTruthy();
  expect(lineText()).toBe("Free messages used");
  expect(textOf(turnIds.panelBalance)).toBe("You have 100 coins");
  expect(env.trial.remaining()).toBe(0);
});

test("CP-UI4. 마지막 체험에서 같은 렌더 안에 보내기를 두 번 눌러도 한 통만 나가고 엽전은 쓰지 않는다", () => {
  const env = room({ trial: 1 });
  mountChatOpen(env);
  tapKeys(...KEYS_AN);

  act(() => {
    const send = screen.getByTestId(ids.send);
    fireEvent.tap(send, {});
    fireEvent.tap(send, {});
  });
  advance(timing.typingDelayMs + timing.replyDelayMs);

  expect(outgoingCount()).toBe(1);
  expect(env.wallet.balance()).toBe(100);
  expect(screen.getByTestId(turnIds.panel)).toBeTruthy();
});

test("CP-UI5. Keep chatting → 머리가 「3 coins per message」이고 엽전 보내기가 서며 키보드는 닫혀 있다", () => {
  mountChatOpen(room({ trial: 1 }));
  sendFree();

  tapId(turnIds.panelKeep);

  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.getByTestId(ids.composer)).toBeTruthy();
  expect(lineText()).toBe("3 coins per message");
  expect(screen.getByTestId(turnIds.coinSend)).toBeTruthy();
  expect(screen.queryByTestId(ids.send)).toBeNull();
  expect(slotContent()).toBe("closed");
});

test("CP-UI5. 체험을 이미 다 쓴 채 들어오면 판 없이 바로 엽전 보내기다(판은 다 쓰는 순간 한 번)", () => {
  mountChat(room({ trial: 0 }));
  flushFrame();

  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.getByTestId(turnIds.coinSend)).toBeTruthy();
  expect(lineText()).toBe("3 coins per message");
});

// ------------------------------------------------------------------ 그 밖의 인물

test("CP-UI6. 체험 인물이 아닌 방은 첫 통부터 엽전 보내기 — 체험이 남아 있어도 판 · 띠가 없다", () => {
  mountChatOpen(room({ character: "other", trial: 20 }));

  expect(lineText()).toBe("3 coins per message");
  expect(screen.getByTestId(turnIds.coinSend)).toBeTruthy();
  expect(screen.queryByTestId(ids.send)).toBeNull();
  expect(screen.queryByTestId(turnIds.strip)).toBeNull();
  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
});

test("CP-UI6. 앱 안 방(가짜 출처)의 엽전 보내기는 지갑 −3 · 체험은 그대로", () => {
  const env = room({ character: "other", trial: 20 });
  mountChatOpen(env);

  sendCoin();

  expect(env.wallet.balance()).toBe(97);
  expect(env.trial.remaining()).toBe(20);
  expect(outgoingCount()).toBe(1);
});

test("CP-UI7. 잔액이 딱 3이면 보내고 0이 된다(경계)", () => {
  const env = room({ character: "other", earned: 3 });
  mountChatOpen(env);

  sendCoin();

  expect(env.wallet.balance()).toBe(0);
  expect(outgoingCount()).toBe(1);
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
});

test("CP-UI7. 잔액이 모자라면 보내지 않고 엽전 상점이 열리며 글은 남는다", () => {
  const env = room({ character: "other", earned: 2 });
  mountChatOpen(env);
  tapKeys(...KEYS_AN);

  tapId(turnIds.coinSend);

  expect(screen.getByTestId("coin-shop-screen")).toBeTruthy();
  expect(outgoingCount()).toBe(0);
  expect(env.wallet.balance()).toBe(2);
  expect(textOf(ids.display)).toBe("안");
});

test("CP-UI7. 상점을 닫으면 방으로 돌아오고 접근성 초점이 엽전 보내기 단추로 간다", () => {
  mountChatOpen(room({ character: "other", earned: 2 }));
  tapKeys(...KEYS_AN);
  tapId(turnIds.coinSend);

  fireEvent.tap(
    within(screen.getByTestId("coin-shop-screen-close")).getByTestId("ui-lynx-round-button"),
    {},
  );
  flushFrame();

  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
  expect(screen.getByTestId(turnIds.coinSend)).toBeTruthy();
  expect(restore()).toHaveBeenCalledWith("messenger-chat-coin-send");
  expect(outgoingCount()).toBe(0);
});

test("CP-UI8. 서버 방의 엽전 보내기는 앱 지갑에서 빼지 않고 서버 턴을 연다 — 잔액은 서버 done이 알린다", () => {
  const openTurn = vi.fn<ChatRemote["openTurn"]>(() => ({ cancel: () => undefined }));
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
    greet: async () => null,
    openTurn,
  };
  const env = room({ character: "other" });
  const source = createFixtureChatSource({
    imageUrlOf,
    seed: env.seed,
    now: () => Date.now(),
    remote,
  });
  mountChatOpen({ ...env, source });

  tapKeys(...KEYS_AN);
  tapId(turnIds.coinSend);

  expect(openTurn).toHaveBeenCalledTimes(1);
  expect(openTurn.mock.calls[0]?.[0]).toMatchObject({ characterId: "mina", text: "안" });
  expect(env.wallet.balance()).toBe(100);
});

// ------------------------------------------------------------------ 관문 · 길

test("CP-UI9. 전구로 보기를 눌러 보내도 체험 한 통으로 센다", () => {
  const env = room();
  mountChatOpen(env);

  tapId(ids.ideasButton);
  tapId(ids.idea(0));

  expect(env.trial.remaining()).toBe(19);
  expect(lineText()).toBe("19 of 20 free messages left");
});

test("CP-UI9. 사진 요청은 체험을 건드리지 않고 지갑에서 35를 쓴다", () => {
  const env = room();
  const { source } = mountChat(env);
  const requestMedia = vi.spyOn(source, "requestMedia");

  tapId(ids.snapshot);
  tapId(ids.askConfirm);

  expect(requestMedia).toHaveBeenCalledWith(TRIAL_CHARACTER_ID, "photo");
  expect(env.trial.remaining()).toBe(20);
  expect(env.wallet.balance()).toBe(65);
});

test("CP-UI10. 띠 · 판에는 Go unlimited가 없다 — 판은 Keep chatting · Back to chats · 잔액 줄뿐이다", () => {
  mountChatOpen(room({ trial: 2 }));
  sendFree();
  expect(screen.getByTestId(turnIds.strip).textContent).not.toContain("Go unlimited");

  sendFree();

  const panel = screen.getByTestId(turnIds.panel);
  expect(panel.textContent).not.toContain("Go unlimited");
  expect(screen.getByTestId(turnIds.panelKeep)).toBeTruthy();
  expect(screen.getByTestId(turnIds.panelBack)).toBeTruthy();
  expect(screen.getByTestId(turnIds.panelBalance)).toBeTruthy();
  expect(screen.queryByTestId("unlimited-ticket-modal")).toBeNull();
});

test("CP-UI11. 판의 Back to chats와 시스템 뒤로는 방을 나간다", () => {
  const { onExit } = mountChatOpen(room({ trial: 1 }));
  sendFree();

  tapId(turnIds.panelBack);
  expect(onExit).toHaveBeenCalledTimes(1);

  expect(systemBack()).toBe(true);
  expect(onExit).toHaveBeenCalledTimes(2);
});

// ------------------------------------------------------------------ 무제한

test("CP-UI12. 무제한: 머리 줄 · 띠 · 판 · 엽전 보내기가 없고 열 번 보내도 체험 · 지갑이 그대로다", () => {
  const env = room({ tier: "unlimited", character: "other" });
  mountChatOpen(env);
  expect(screen.queryByTestId(turnIds.line)).toBeNull();

  for (let count = 0; count < 10; count += 1) sendFree();

  expect(outgoingCount()).toBe(10);
  expect(screen.queryByTestId(turnIds.line)).toBeNull();
  expect(screen.queryByTestId(turnIds.strip)).toBeNull();
  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.queryByTestId(turnIds.coinSend)).toBeNull();
  expect(env.trial.remaining()).toBe(20);
  expect(env.wallet.balance()).toBe(100);
});
