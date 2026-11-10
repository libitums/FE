import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { unlimitedIntroTestIds } from "../tickets/UnlimitedIntroState";
import * as inputFocus from "./chat-input-focus";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { chatTurnsTestIds as turnIds } from "./chat-turns.contract";
import {
  advance,
  clearBackHandlers,
  fixtureRoom,
  ideaSetA,
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
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { createTurnLedger, memoryTurnRecordStore } from "./turn-ledger";
import type { TurnRecord } from "./free-turns";

// `ui` 계층(MC2-UI7 · UI8 · UI9): 방 화면의 턴 — 무료 3통(T1) → 마지막 무료(T2) → 다 씀 판(T3, 하루 한 번) → 엽전 보내기(T4),
// 관문(차감 · 상점 · 글 유지) · 겹침 초점 되돌림 · 무제한은 아무것도 없음. 메모리 원장 · 가짜 시계(시각은 지역 정오).
// 계산은 unit(free-turns · turn-ledger)이 지고 여기서는 결선만 본다.
// 가정(구현자가 따를 것): 화면 props = { wallet, turns, tier, now, timers? }(spec §7.2). Go unlimited 목적지는 §17 Q1에 따라
// 무료 사용자용 소개 판(`unlimitedIntroTestIds.root`)이고 닫기는 `gotIt`이다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

const timing = CHAT_PLACEHOLDERS.timing;
const NOON = new Date(2026, 10, 10, 12, 0, 0);
const TODAY = "2026-11-10";
const restore = (): ReturnType<typeof vi.fn> => vi.mocked(inputFocus.restoreAccessibilityFocus);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOON);
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function freeRoom(
  over: { earned?: number; record?: TurnRecord | null; tier?: "free" | "unlimited" } = {},
) {
  const wallet = createCoinWallet({ earned: over.earned ?? 100 });
  const ledger = createTurnLedger({
    store: memoryTurnRecordStore(over.record ?? null),
    now: () => Date.now(),
  });
  const seed = seedOf(fixtureRoom("mina"));
  return { wallet, ledger, seed, tier: over.tier ?? "free" };
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

// ------------------------------------------------------------------ MC2-UI7 T1 → T4

test("MC2-UI7. T1: 처음엔 「3 of 3」, 보내기 단추이고 띠 · 판이 없다", () => {
  const room = freeRoom();
  mountChatOpen(room);

  expect(lineText()).toBe("3 of 3 free messages left today");
  expect(screen.getByTestId(ids.send)).toBeTruthy();
  expect(screen.queryByTestId(turnIds.strip)).toBeNull();
  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.queryByTestId(turnIds.coinSend)).toBeNull();
});

test("MC2-UI7. 한 통 보내면 「2 of 3」이고 원장이 센다", () => {
  const room = freeRoom();
  mountChatOpen(room);

  sendFree();

  expect(lineText()).toBe("2 of 3 free messages left today");
  expect(room.ledger.usage().used).toBe(1);
  expect(outgoingCount()).toBe(1);
  expect(room.wallet.balance()).toBe(100);
});

test("MC2-UI7. T2: 두 통 뒤 머리가 주황 「Last free message today」이고 입력 줄 위 띠가 선다", () => {
  const room = freeRoom();
  mountChatOpen(room);

  sendFree();
  sendFree();

  expect(lineText()).toBe("Last free message today");
  expect(screen.getByTestId(turnIds.strip).textContent).toContain(
    "After this, 10 coins per message",
  );
  expect(screen.getByTestId(turnIds.stripUnlimited)).toBeTruthy();
  // 아직 무료 보내기 단추다.
  expect(screen.getByTestId(ids.send)).toBeTruthy();
});

test("MC2-UI7. T3: 세 통째를 보내면 판이 독을 대신한다 — 입력 · 기능 줄이 사라지고 로그는 보이며 키보드가 접힌다", () => {
  const room = freeRoom();
  mountChatOpen(room);
  sendFree();
  sendFree();
  expect(slotContent()).toBe("learning-keyboard");

  sendFree();

  expect(screen.getByTestId(turnIds.panel)).toBeTruthy();
  expect(screen.queryByTestId(ids.composer)).toBeNull();
  expect(screen.queryByTestId(ids.featureRow)).toBeNull();
  expect(screen.queryByTestId(ids.slot)).toBeNull();
  expect(screen.queryByTestId(turnIds.strip)).toBeNull();
  expect(screen.getByTestId(ids.log)).toBeTruthy();
  expect(outgoingCount()).toBe(3);
  expect(lineText()).toBe("Free messages used");
  expect(room.ledger.usage().outPanel).toBe("shown");
  expect(textOf(turnIds.panelBalance)).toBe("You have 100 coins");
});

test("MC2-UI7. 마지막 무료에서 같은 렌더 안에 보내기를 두 번 눌러도 한 통만 나가고 엽전은 쓰지 않는다(리뷰 P3-1)", () => {
  const room = freeRoom();
  mountChatOpen(room);
  sendFree();
  sendFree();
  tapKeys(...KEYS_AN);

  act(() => {
    const send = screen.getByTestId(ids.send);
    fireEvent.tap(send, {});
    fireEvent.tap(send, {});
  });
  advance(timing.typingDelayMs + timing.replyDelayMs);

  expect(outgoingCount()).toBe(3);
  expect(room.wallet.balance()).toBe(100);
  expect(room.ledger.usage().used).toBe(3);
  expect(screen.getByTestId(turnIds.panel)).toBeTruthy();
});

test("MC2-UI7. Keep chatting → T4: 머리가 가격 · 다시 무료까지 시간이고 엽전 보내기 단추가 서며 키보드는 닫혀 있다", () => {
  const room = freeRoom();
  mountChatOpen(room);
  sendFree();
  sendFree();
  sendFree();

  tapId(turnIds.panelKeep);

  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.getByTestId(ids.composer)).toBeTruthy();
  expect(lineText()).toMatch(/^Each message 10 coins · free again in 1[12]h \d+m$/);
  expect(screen.getByTestId(turnIds.coinSend)).toBeTruthy();
  expect(screen.queryByTestId(ids.send)).toBeNull();
  expect(slotContent()).toBe("closed");
});

test("MC2-UI7. T4 보내기: 지갑 −10 · 내 글 +1 · 원장 used는 그대로 · 판은 다시 뜨지 않는다", () => {
  const room = freeRoom();
  mountChatOpen(room);
  sendFree();
  sendFree();
  sendFree();
  tapId(turnIds.panelKeep);
  // 닫힌 키보드는 입력 칸을 눌러 연다.
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.field), {});
  });

  sendCoin();

  expect(room.wallet.balance()).toBe(90);
  expect(outgoingCount()).toBe(4);
  expect(room.ledger.usage().used).toBe(3);
  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.getByTestId(turnIds.coinSend)).toBeTruthy();
});

test("MC2-UI7. 하루 한 번: 방을 다시 마운트해도 판 없이 바로 T4다", () => {
  const room = freeRoom();
  mountChatOpen(room);
  sendFree();
  sendFree();
  sendFree();
  cleanup();

  mountChat(room);

  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.getByTestId(turnIds.coinSend)).toBeTruthy();
  expect(lineText()).toContain("Each message 10 coins");
});

test("MC2-UI7. 이미 다 쓴 날 처음 들어오면(판 아직 안 봄) 들어올 때 판이 뜨고 원장에 본 것으로 남는다", () => {
  const room = freeRoom({ record: { day: TODAY, used: 3, outPanel: "due" } });

  mountChat(room);
  flushFrame();

  expect(screen.getByTestId(turnIds.panel)).toBeTruthy();
  expect(room.ledger.usage().outPanel).toBe("shown");
});

test("MC2-UI7. 판을 이미 본 날 들어오면 판 없이 T4다", () => {
  const room = freeRoom({ record: { day: TODAY, used: 3, outPanel: "shown" } });

  mountChat(room);

  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.getByTestId(turnIds.coinSend)).toBeTruthy();
});

test("MC2-UI7. 다음 날이 되면(분 단위 갱신) 머리가 「3 of 3」으로 돌아오고 보내기 단추도 돌아온다", () => {
  const room = freeRoom({ record: { day: TODAY, used: 3, outPanel: "shown" } });
  mountChat(room);
  expect(lineText()).toContain("Each message");

  vi.setSystemTime(new Date(2026, 10, 11, 0, 5, 0));
  advance(timing.turnTickMs);

  expect(lineText()).toBe("3 of 3 free messages left today");
  expect(screen.getByTestId(ids.send)).toBeTruthy();
  expect(screen.queryByTestId(turnIds.coinSend)).toBeNull();
});

test("MC2-UI7. 분이 지나면 머리의 남은 시간이 줄어든다", () => {
  const room = freeRoom({ record: { day: TODAY, used: 3, outPanel: "shown" } });
  mountChat(room);
  expect(lineText()).toContain("free again in 12h 0m");

  advance(timing.turnTickMs * 61);

  expect(lineText()).toContain("free again in 10h 59m");
});

// ------------------------------------------------------------------ MC2-UI8 관문 · 길

test("MC2-UI8. 전구로 보기를 골라 보내도 한 통으로 센다", () => {
  const room = freeRoom();
  mountChatOpen(room);

  tapId(ids.ideasButton);
  tapId(ids.idea(0));
  expect(textOf(ids.display)).toBe(ideaSetA[0].ko);
  tapId(ids.send);

  expect(room.ledger.usage().used).toBe(1);
  expect(lineText()).toBe("2 of 3 free messages left today");
});

test("MC2-UI8. 사진 요청은 원장을 건드리지 않고 지갑에서 60을 쓴다", () => {
  const room = freeRoom();
  const { source } = mountChat(room);
  const requestMedia = vi.spyOn(source, "requestMedia");

  tapId(ids.snapshot);
  tapId(ids.askConfirm);

  expect(requestMedia).toHaveBeenCalledWith("mina", "photo");
  expect(room.ledger.usage().used).toBe(0);
  expect(room.wallet.balance()).toBe(40);
});

test("MC2-UI8. T4에서 잔액이 모자라면 보내지 않고 엽전 상점이 열리며 글은 남는다", () => {
  const room = freeRoom({ earned: 5, record: { day: TODAY, used: 3, outPanel: "shown" } });
  mountChatOpen(room);
  tapKeys(...KEYS_AN);

  tapId(turnIds.coinSend);

  expect(screen.getByTestId("coin-shop-screen")).toBeTruthy();
  expect(outgoingCount()).toBe(0);
  expect(room.wallet.balance()).toBe(5);
  expect(textOf(ids.display)).toBe("안");
});

test("MC2-UI8. 상점을 닫으면 방으로 돌아오고 접근성 초점이 엽전 보내기 단추로 간다", () => {
  const room = freeRoom({ earned: 5, record: { day: TODAY, used: 3, outPanel: "shown" } });
  mountChatOpen(room);
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

test("MC2-UI8. 잔액이 딱 10이면 보내고 0이 된다(경계)", () => {
  const room = freeRoom({ earned: 10, record: { day: TODAY, used: 3, outPanel: "shown" } });
  mountChatOpen(room);

  sendCoin();

  expect(room.wallet.balance()).toBe(0);
  expect(outgoingCount()).toBe(1);
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
});

test("MC2-UI8. T2 띠의 Go unlimited는 무제한 소개 판을 열고 닫으면 띠 단추로 초점이 돌아온다", () => {
  const room = freeRoom({ record: { day: TODAY, used: 2, outPanel: "due" } });
  mountChat(room);

  tapId(turnIds.stripUnlimited);

  expect(screen.getByTestId(unlimitedIntroTestIds.root)).toBeTruthy();
  expect(screen.getByTestId(unlimitedIntroTestIds.comingSoon)).toBeTruthy();
  tapId(unlimitedIntroTestIds.gotIt);
  flushFrame();
  expect(screen.queryByTestId(unlimitedIntroTestIds.root)).toBeNull();
  expect(restore()).toHaveBeenCalledWith("messenger-chat-turn-strip-unlimited");
});

test("MC2-UI8. 판의 Go unlimited도 소개 판을 열고 닫으면 판 단추로 초점이 돌아온다", () => {
  const room = freeRoom({ record: { day: TODAY, used: 3, outPanel: "due" } });
  mountChat(room);
  flushFrame();
  restore().mockClear();

  tapId(turnIds.panelUnlimited);
  expect(screen.getByTestId(unlimitedIntroTestIds.root)).toBeTruthy();
  tapId(unlimitedIntroTestIds.gotIt);
  flushFrame();

  expect(restore()).toHaveBeenCalledWith("messenger-chat-out-unlimited");
  expect(screen.getByTestId(turnIds.panel)).toBeTruthy();
});

test("MC2-UI8. 판의 Back to chats는 방을 나간다", () => {
  const room = freeRoom({ record: { day: TODAY, used: 3, outPanel: "due" } });
  const { onExit } = mountChat(room);

  tapId(turnIds.panelBack);

  expect(onExit).toHaveBeenCalledTimes(1);
});

test("MC2-UI8. 판 동안 시스템 뒤로는 방을 나간다", () => {
  const room = freeRoom({ record: { day: TODAY, used: 3, outPanel: "due" } });
  const { onExit } = mountChat(room);

  expect(systemBack()).toBe(true);

  expect(onExit).toHaveBeenCalledTimes(1);
});

// ------------------------------------------------------------------ MC2-UI9 무제한

test("MC2-UI9. 무제한: 머리 줄 · 띠 · 판 · 엽전 보내기가 없고 열 번 보내도 원장 · 지갑이 그대로다", () => {
  const room = freeRoom({ tier: "unlimited" });
  mountChatOpen(room);
  expect(screen.queryByTestId(turnIds.line)).toBeNull();

  for (let count = 0; count < 10; count += 1) sendFree();

  expect(outgoingCount()).toBe(10);
  expect(screen.queryByTestId(turnIds.line)).toBeNull();
  expect(screen.queryByTestId(turnIds.strip)).toBeNull();
  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(screen.queryByTestId(turnIds.coinSend)).toBeNull();
  expect(screen.getByTestId(ids.send)).toBeTruthy();
  expect(room.ledger.usage().used).toBe(0);
  expect(room.wallet.balance()).toBe(100);
});

test("MC2-UI9. 무제한이어도 이미 다 쓴 기록이 있는 날에 판이 뜨지 않는다", () => {
  const room = freeRoom({ tier: "unlimited", record: { day: TODAY, used: 3, outPanel: "due" } });

  mountChat(room);
  flushFrame();

  expect(screen.queryByTestId(turnIds.panel)).toBeNull();
  expect(room.ledger.usage().outPanel).toBe("due");
});
