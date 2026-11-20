import { expect, test } from "vitest";

import type { ChatOverlay, ChatRoomAction } from "./chat-room-state";
import { asksBirthYearOnEntry, guestGateOf, signInPromptCopyOf } from "./guest-gate";
import { uiCopyEn } from "../../lib/ui-copy-en";

// `unit` 계층(GG-U1 ~ GG-U6): 비회원 로그인 권유 판정(ADR-0166) · 자리별 문구 · 생년 묻기(2026-11-20 결정).

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

test("GG-U3 더보기 펼침 · 사진 크게 보기 · 키보드 · 입력 · 닫기는 그대로", () => {
  expect(guestGateOf(overlay({ kind: "more-menu" }))).toBeNull();
  expect(guestGateOf(overlay({ kind: "photo", messageId: "m1" }))).toBeNull();
  expect(guestGateOf({ type: "open-keyboard" })).toBeNull();
  expect(guestGateOf({ type: "type-myself" })).toBeNull();
  expect(guestGateOf({ type: "phone-input", value: "안녕" })).toBeNull();
  expect(guestGateOf({ type: "close-overlay" })).toBeNull();
});

test("GG-U4 보기 패널 열기(전구 Reply ideas)는 send — 보내기와 같은 권유(2026-11-20)", () => {
  expect(guestGateOf({ type: "open-ideas" })).toBe("send");
});

test("GG-U5 대화상자 문구는 누른 자리에 맞춘다 — 제목은 누른 기능의 기존 이름, 본문은 메시지 · 엽전/티켓 둘", () => {
  const of = (trigger: Parameters<typeof signInPromptCopyOf>[0]) =>
    signInPromptCopyOf(trigger, uiCopyEn);
  const chatBody =
    "Create a free account to chat with the people from your stories. Your progress so far comes with you.";
  const keepBody = "Create a free account to keep your Yeopjeon and tickets.";
  expect(of("send")).toEqual({ title: "Sign in to send messages", body: chatBody });
  expect(of("media")).toEqual({ title: "Sign in to send messages", body: chatBody });
  expect(of("coins")).toEqual({ title: "Get Yeopjeon", body: keepBody });
  expect(of("menu")).toEqual({ title: "Chat settings", body: chatBody });
  expect(of("add_friend")).toEqual({ title: "Start chatting", body: chatBody });
  expect(of("tickets")).toEqual({ title: "Get more tickets", body: keepBody });
});

test("GG-U6 방 입장 생년 시트는 회원 · 아직 묻지 않음일 때만 — 비회원은 묻지 않는다", () => {
  expect(asksBirthYearOnEntry("unasked", false)).toBe(true);
  expect(asksBirthYearOnEntry("unasked", true)).toBe(false);
  expect(asksBirthYearOnEntry("skipped", false)).toBe(false);
  expect(asksBirthYearOnEntry("set", false)).toBe(false);
  expect(asksBirthYearOnEntry("set", true)).toBe(false);
});
