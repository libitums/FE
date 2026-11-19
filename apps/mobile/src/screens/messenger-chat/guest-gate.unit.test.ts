import { expect, test } from "vitest";

import type { ChatOverlay, ChatRoomAction } from "./chat-room-state";
import { guestGateOf } from "./guest-gate";

// `unit` 계층(GG-U1 ~ GG-U3): 비회원 로그인 권유 판정(ADR-0166).

const overlay = (o: Exclude<ChatOverlay, { kind: "none" }>): ChatRoomAction => ({
  type: "open-overlay",
  overlay: o,
});

test("GG-U1 사진 · 음성 요청은 media, 엽전 상점은 coins", () => {
  expect(guestGateOf(overlay({ kind: "ask-media", media: "photo" }))).toBe("media");
  expect(guestGateOf(overlay({ kind: "ask-media", media: "voice" }))).toBe("media");
  expect(guestGateOf(overlay({ kind: "coin-shop", from: "send" }))).toBe("coins");
});

test("GG-U2 사이드바 · 다시 만들기 · 신고 · 피드백 방식 · 생년은 menu", () => {
  expect(guestGateOf(overlay({ kind: "sidebar" }))).toBe("menu");
  expect(guestGateOf(overlay({ kind: "regen" }))).toBe("menu");
  expect(guestGateOf(overlay({ kind: "report", reasons: [] }))).toBe("menu");
  expect(guestGateOf(overlay({ kind: "feedback-mode", selected: "separate" }))).toBe("menu");
  expect(guestGateOf(overlay({ kind: "birth-year", selected: null, from: "room" }))).toBe("menu");
});

test("GG-U3 더보기 펼침 · 사진 크게 보기 · 키보드 · 보기 패널 · 입력 · 닫기는 그대로", () => {
  expect(guestGateOf(overlay({ kind: "more-menu" }))).toBeNull();
  expect(guestGateOf(overlay({ kind: "photo", messageId: "m1" }))).toBeNull();
  expect(guestGateOf({ type: "open-keyboard" })).toBeNull();
  expect(guestGateOf({ type: "open-ideas" })).toBeNull();
  expect(guestGateOf({ type: "phone-input", value: "안녕" })).toBeNull();
  expect(guestGateOf({ type: "close-overlay" })).toBeNull();
});
