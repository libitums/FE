import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import * as accessibility from "../../lib/accessibility";
import * as inputFocus from "./chat-input-focus";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { chatTurnsTestIds as turnIds } from "./chat-turns.contract";
import {
  advance,
  clearBackHandlers,
  fireOnRef,
  fixtureRoom,
  KEYS_AN,
  mountChatOpen,
  seedOf,
  tapId,
  tapKeys,
} from "./chat-ui.test-support";
import { createCoinWallet } from "./coin-wallet";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { createTurnLedger, memoryTurnRecordStore } from "./turn-ledger";

// `ui` 계층(기기 F2 · 접근성 M2 · M3 · M4 · M9): 방 화면 결선 — 보내면 늘 끝으로 · Keep chatting 뒤 초점 되돌림 · 턴 변화 낭독 ·
// T3 판이 열린 동안 뒤 화면 숨김 · 엽전이 모자랄 때 보내기 단추 이름.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));
vi.mock("../../lib/accessibility", async (importOriginal) => ({
  ...(await importOriginal<typeof accessibility>()),
  announce: vi.fn<(content: string) => "announced">(() => "announced"),
}));

const timing = CHAT_PLACEHOLDERS.timing;
const restore = (): ReturnType<typeof vi.fn> => vi.mocked(inputFocus.restoreAccessibilityFocus);
const announced = (): string[] =>
  vi.mocked(accessibility.announce).mock.calls.map((call) => String(call[0]));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 10, 12, 0, 0));
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function freeRoom(earned = 100) {
  const wallet = createCoinWallet({ earned });
  const ledger = createTurnLedger({
    store: memoryTurnRecordStore(null),
    now: () => Date.now(),
  });
  return { wallet, ledger, seed: seedOf(fixtureRoom("mina")), tier: "free" as const };
}
function sendFree(): void {
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  advance(timing.typingDelayMs + timing.replyDelayMs);
}
const flushFrame = (): void => {
  act(() => {
    vi.advanceTimersByTime(16);
  });
};
const turnAnnouncements = (): string[] =>
  announced().filter((text) => /left today|Last free|used/.test(text));

// ------------------------------------------------------------------ F2: 보내면 늘 끝으로

test("F2. 위로 올려 읽던 중이어도 내가 보내면 끝으로 내린다", () => {
  const invoked: string[] = [];
  mountChatOpen(freeRoom());
  fireOnRef(ids.log, "scroll", { scrollTop: 100, scrollHeight: 900, deltaY: -40 });
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: () => ({
          invoke: (args: { method: string }) => {
            invoked.push(args.method);
            return { exec: () => undefined };
          },
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );

  tapKeys(...KEYS_AN);
  tapId(ids.send);
  flushFrame();

  expect(invoked.filter((method) => method === "scrollTo").length).toBeGreaterThan(0);
});

// ------------------------------------------------------------------ M2: Keep chatting 뒤 초점

test("M2. Keep chatting으로 판이 닫히면 다음 프레임에 접근성 초점이 엽전 보내기 단추로 간다", () => {
  mountChatOpen(freeRoom());
  sendFree();
  sendFree();
  sendFree();
  restore().mockClear();

  tapId(turnIds.panelKeep);
  expect(restore()).not.toHaveBeenCalledWith(turnIds.coinSend);
  flushFrame();

  expect(restore()).toHaveBeenCalledWith(turnIds.coinSend);
  const target = document.querySelector(`[id="${turnIds.coinSend}"]`);
  expect(target?.getAttribute("accessibility-element")).toBe("true");
});

// ------------------------------------------------------------------ M3: 턴 변화 낭독

test("M3. 보내서 「3 → 2」가 되면 새 턴 줄을 한 번, 마지막 무료로 바뀌면 줄 + 띠 문구를 낭독한다", () => {
  mountChatOpen(freeRoom());
  expect(turnAnnouncements()).toEqual([]);

  sendFree();
  expect(turnAnnouncements()).toEqual(["2 of 3 free messages left today"]);

  sendFree();
  expect(turnAnnouncements()).toEqual([
    "2 of 3 free messages left today",
    "Last free message today, After this, 3 coins per message",
  ]);
});

test("M3. 판이 열리는 세 번째 보내기는 턴 줄을 낭독하지 않고(제목 초점이 대신), 분이 지나도 낭독하지 않는다", () => {
  mountChatOpen(freeRoom());
  sendFree();
  sendFree();
  const before = turnAnnouncements().length;

  sendFree();
  act(() => {
    vi.advanceTimersByTime(180_000);
  });

  expect(turnAnnouncements()).toHaveLength(before);
});

test("M3. 마운트 · 방에 다시 들어올 때는 낭독하지 않는다", () => {
  mountChatOpen(freeRoom());

  act(() => {
    vi.advanceTimersByTime(120_000);
  });

  expect(turnAnnouncements()).toEqual([]);
});

// ------------------------------------------------------------------ M4: T3 판은 모달

test("M4. T3 판이 열린 동안 머리 · 로그는 낭독에서 숨고, 판은 숨지 않으며, 닫으면 풀린다", () => {
  mountChatOpen(freeRoom());
  const hidden = (el: Element | null): boolean => {
    for (let node = el; node !== null; node = node.parentElement) {
      if (node.getAttribute("accessibility-elements-hidden") === "true") return true;
    }
    return false;
  };
  expect(hidden(screen.getByTestId(ids.log))).toBe(false);

  sendFree();
  sendFree();
  sendFree();

  expect(hidden(screen.getByTestId(ids.log))).toBe(true);
  expect(hidden(screen.getByTestId(ids.header))).toBe(true);
  expect(hidden(screen.getByTestId(turnIds.panel))).toBe(false);

  tapId(turnIds.panelKeep);

  expect(hidden(screen.getByTestId(ids.log))).toBe(false);
});

// ------------------------------------------------------------------ M9: 모자라면 상점 이름

test("M9. 잔액이 가격보다 모자라면 엽전 보내기 단추 이름이 「Get coins to send」이고, 충분하면 「Send for 3 coins」다", () => {
  mountChatOpen(freeRoom(2));
  sendFree();
  sendFree();
  sendFree();
  tapId(turnIds.panelKeep);

  const send = screen.getByTestId(turnIds.coinSend);
  expect(send.getAttribute("accessibility-label")).toBe("Get coins to send");

  cleanup();
  mountChatOpen(freeRoom(100));
  sendFree();
  sendFree();
  sendFree();
  tapId(turnIds.panelKeep);

  expect(screen.getByTestId(turnIds.coinSend).getAttribute("accessibility-label")).toBe(
    "Send for 3 coins",
  );
});

test("M9. 잔액이 모자란 채로 눌러도 상점이 열린다(이름이 동작을 설명한다)", () => {
  mountChatOpen(freeRoom(2));
  sendFree();
  sendFree();
  sendFree();
  tapId(turnIds.panelKeep);
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.field), {});
  });
  tapKeys(...KEYS_AN);

  fireEvent.tap(screen.getByTestId(turnIds.coinSend), {});

  expect(screen.queryByTestId("coin-shop-screen")).not.toBeNull();
});
