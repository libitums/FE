import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { AskMediaDialog } from "./AskMediaDialog";
import type { ChatMediaKind } from "./chat-source.contract";
import { advance, clearBackHandlers, mountChat, systemBack, tapId } from "./chat-ui.test-support";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI20): 사진 · 음성 요청 대화상자(Z4 · Z6) — 제목 · 설명 한 줄 · 잔액 줄 ·
// 미리보기와 가격 줄이 없다 · 주 버튼은 엽전 아이콘 + 수 · 낭독 「Ask for 30 coins」 ·
// 잔액이 모자라면 data-plan top-up과 「Get coins」.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function mountDialog(media: ChatMediaKind, balance: number, price: number) {
  const handlers = {
    onConfirm: vi.fn<() => void>(),
    onGetCoins: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
  };
  render(
    <AskMediaDialog media={media} name="미나" balance={balance} price={price} {...handlers} />,
  );
  return handlers;
}

const labelOf = (testId: string): string => {
  const el = screen.getByTestId(testId);
  return (
    (el.hasAttribute("accessibility-label")
      ? el
      : el.querySelector("[accessibility-label]")
    )?.getAttribute("accessibility-label") ?? ""
  );
};

test("MC-UI20. 사진 요청: 제목 · 한 줄 설명 · 잔액 줄이 서고 data-media가 photo다", () => {
  mountDialog("photo", 120, 30);

  const dialog = screen.getByTestId(ids.askDialog);
  expect(dialog.getAttribute("data-media")).toBe("photo");
  expect(dialog.textContent).toContain("Ask for a snapshot?");
  expect(dialog.textContent).toContain("미나 will send you a picture of this moment.");
  expect(screen.getByTestId(ids.askBalance).textContent).toBe("You have 120 coins");
});

test("MC-UI20. 음성 요청: 제목 · 설명이 음성 문구이고 data-media가 voice다", () => {
  mountDialog("voice", 120, 10);

  const dialog = screen.getByTestId(ids.askDialog);
  expect(dialog.getAttribute("data-media")).toBe("voice");
  expect(dialog.textContent).toContain("Ask for a voice message?");
  expect(dialog.textContent).toContain("미나 will say their last reply out loud.");
});

test("MC-UI20. 미리보기 · 가격 줄이 없다 — 가격은 주 버튼에만 있다", () => {
  mountDialog("photo", 120, 30);

  const dialog = screen.getByTestId(ids.askDialog);
  expect(dialog.querySelector('[data-testid*="preview"]')).toBeNull();
  expect(dialog.querySelector('[data-testid*="price"]')).toBeNull();
  expect(dialog.querySelector('[data-testid*="cost"]')).toBeNull();
  expect(dialog.querySelector("image")).toBeNull();
  expect(dialog.textContent).not.toMatch(/cost|price/i);
  // 숫자 30은 주 버튼 한 곳에만 나온다(잔액 줄은 120).
  expect(dialog.textContent?.match(/30/g)).toHaveLength(1);
});

test("MC-UI20. 잔액이 충분하면 주 버튼은 엽전 아이콘 + 수 30이고 낭독은 「Ask for 30 coins」다", () => {
  mountDialog("photo", 120, 30);

  const confirm = screen.getByTestId(ids.askConfirm);
  expect(confirm.getAttribute("data-plan")).toBe("ask");
  expect(screen.getByTestId(ids.askDialog).getAttribute("data-plan")).toBe("ask");
  expect(confirm.textContent?.trim()).toBe("30");
  expect(confirm.querySelector("svg")).not.toBeNull();
  expect(labelOf(ids.askConfirm)).toBe("Ask for 30 coins");
});

test("MC-UI20. 잔액이 가격과 같아도 요청할 수 있다(경계)", () => {
  mountDialog("voice", 10, 10);

  expect(screen.getByTestId(ids.askConfirm).getAttribute("data-plan")).toBe("ask");
  expect(labelOf(ids.askConfirm)).toBe("Ask for 10 coins");
});

test("MC-UI20. ask: 주 버튼은 onConfirm, Cancel은 onCancel을 한 번 부른다", () => {
  const { onConfirm, onGetCoins, onCancel } = mountDialog("photo", 120, 30);

  tapId(ids.askConfirm);
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onGetCoins).not.toHaveBeenCalled();
  tapId(ids.askCancel);
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("MC-UI20. 잔액이 모자라면 data-plan이 top-up이고 주 버튼은 아이콘 없는 「Get coins」다(잔액 줄은 그대로)", () => {
  mountDialog("photo", 2, 30);

  const confirm = screen.getByTestId(ids.askConfirm);
  expect(screen.getByTestId(ids.askDialog).getAttribute("data-plan")).toBe("top-up");
  expect(confirm.getAttribute("data-plan")).toBe("top-up");
  expect(confirm.textContent).toContain("Get coins");
  expect(confirm.querySelector("svg")).toBeNull();
  expect(screen.getByTestId(ids.askBalance).textContent).toBe("You have 2 coins");
});

test("MC-UI20. top-up: 주 버튼은 onGetCoins만 부르고 onConfirm은 부르지 않는다", () => {
  const { onConfirm, onGetCoins } = mountDialog("photo", 2, 30);

  tapId(ids.askConfirm);

  expect(onGetCoins).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
});

// ----------------------------------------------------------------------- 화면 결선

test("MC-UI20. 화면: Snapshot 알약 → 요청 → 출처에 photo 요청이 가고 대화상자가 닫히고 로그에 pending이 선다", () => {
  const { source } = mountChat({ coinBalance: 120 });
  const requestMedia = vi.spyOn(source, "requestMedia");

  tapId(ids.snapshot);
  expect(screen.getByTestId(ids.askDialog).getAttribute("data-media")).toBe("photo");
  tapId(ids.askConfirm);

  expect(requestMedia).toHaveBeenCalledTimes(1);
  expect(requestMedia).toHaveBeenCalledWith("mina", "photo");
  expect(screen.queryByTestId(ids.askDialog)).toBeNull();
  expect(screen.getByTestId(ids.photoPending)).toBeTruthy();
});

test("MC-UI20. 화면: Snap voice 알약 → 요청 → 음성 pending이 서고 도착하면 같은 자리에서 음성이 된다", () => {
  const { source } = mountChat({ coinBalance: 120 });
  const requestMedia = vi.spyOn(source, "requestMedia");

  tapId(ids.snapVoice);
  expect(screen.getByTestId(ids.askDialog).getAttribute("data-media")).toBe("voice");
  tapId(ids.askConfirm);

  expect(requestMedia).toHaveBeenCalledWith("mina", "voice");
  expect(screen.getByTestId(ids.voicePending)).toBeTruthy();
  advance(CHAT_PLACEHOLDERS.timing.voiceArrivalMs);
  expect(screen.queryByTestId(ids.voicePending)).toBeNull();
  expect(screen.getByTestId(ids.voice)).toBeTruthy();
});

test("MC-UI20. 화면: 요청해도 잔액은 줄지 않는다(대화상자를 다시 열면 같은 잔액)", () => {
  mountChat({ coinBalance: 120 });
  tapId(ids.snapshot);
  tapId(ids.askConfirm);

  tapId(ids.snapshot);

  expect(screen.getByTestId(ids.askBalance).textContent).toBe("You have 120 coins");
});

test("MC-UI20. 화면: Cancel과 시스템 뒤로는 요청 없이 닫는다", () => {
  const { source } = mountChat({ coinBalance: 120 });
  const requestMedia = vi.spyOn(source, "requestMedia");
  tapId(ids.snapshot);

  tapId(ids.askCancel);
  expect(screen.queryByTestId(ids.askDialog)).toBeNull();
  tapId(ids.snapVoice);
  expect(systemBack()).toBe(true);

  expect(screen.queryByTestId(ids.askDialog)).toBeNull();
  expect(requestMedia).not.toHaveBeenCalled();
});

test("MC-UI20. 화면: 잔액 2면 top-up이고 「Get coins」가 엽전 상점을 열며 닫으면 방으로 돌아온다", () => {
  const { source } = mountChat({ coinBalance: 2 });
  const requestMedia = vi.spyOn(source, "requestMedia");

  tapId(ids.snapshot);
  expect(screen.getByTestId(ids.askDialog).getAttribute("data-plan")).toBe("top-up");
  tapId(ids.askConfirm);

  expect(screen.getByTestId("coin-shop-screen")).toBeTruthy();
  expect(requestMedia).not.toHaveBeenCalled();
  fireEvent.tap(
    within(screen.getByTestId("coin-shop-screen-close")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
  expect(screen.queryByTestId(ids.askDialog)).toBeNull();
  expect(screen.getByTestId(ids.screen)).toBeTruthy();
});
