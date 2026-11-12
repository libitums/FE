import { describe, expect, test } from "vitest";

import { focusOriginOf } from "./chat-overlay-focus";
import {
  chatRoomReducer,
  initialChatRoomState as initialFor,
  overlayParent,
} from "./chat-room-state";
import type { KeyboardPlan } from "./keyboard-plan";
import { birthYearOptions, clockOf, isOpenableExternalUrl } from "./safety-rules";

// `unit` 계층(SU-U1 ~ U8): 법 · 안전 UI의 순수 규칙 — 생년 목록 · 시각 · 열 수 있는 주소 · 생년 시트 리듀서(ADR-0125).

describe("birthYearOptions", () => {
  test("SU-U1 올해부터 100년 전까지 101개, 새 연도가 먼저", () => {
    const now = new Date(2026, 10, 11, 9, 0).getTime();
    const years = birthYearOptions(now);
    expect(years).toHaveLength(101);
    expect(years[0]).toBe(2026);
    expect(years[100]).toBe(1926);
  });
});

describe("clockOf", () => {
  test("SU-U2 기기 시각의 시 · 분", () => {
    expect(clockOf(new Date(2026, 10, 11, 15, 40).getTime())).toEqual({ hour: 15, minute: 40 });
    expect(clockOf(new Date(2026, 10, 12, 0, 5).getTime())).toEqual({ hour: 0, minute: 5 });
  });
});

describe("isOpenableExternalUrl", () => {
  test("SU-U3 tel: 번호 · https 주소만 연다", () => {
    expect(isOpenableExternalUrl("tel:988")).toBe(true);
    expect(isOpenableExternalUrl("tel:+63 2 8804 4673")).toBe(true);
    expect(isOpenableExternalUrl("tel:1-800-273-8255")).toBe(true);
    expect(isOpenableExternalUrl("https://findahelpline.com")).toBe(true);
    expect(isOpenableExternalUrl("https://example.org/path?q=1")).toBe(true);
  });

  test("SU-U4 그 밖(http · javascript · 빈 번호 · 호스트 없음 · 문자 섞인 번호)은 열지 않는다", () => {
    for (const url of [
      "http://example.org",
      "javascript:alert(1)",
      "tel:",
      "tel:abc",
      "https://",
      "sms:988",
      "",
      "file:///etc/passwd",
      "https://a b.example",
      "https://x.example\n",
      "tel:988\n",
      "https://a\u00A0b.example",
    ]) {
      expect(isOpenableExternalUrl(url), url).toBe(false);
    }
  });
});

const initialChatRoomState = initialFor({
  initial: "learning",
  toggle: "shown",
} satisfies KeyboardPlan);

describe("생년 시트 리듀서", () => {
  const open = (from: "room" | "sidebar" | "blocked", selected: number | null = null) =>
    chatRoomReducer(initialChatRoomState, {
      type: "open-overlay",
      overlay: { kind: "birth-year", selected, from },
    });

  test("SU-U5 select-birth-year는 시트가 열렸을 때만 고른 연도를 바꾼다", () => {
    const picked = chatRoomReducer(open("room"), { type: "select-birth-year", year: 2001 });
    expect(picked.overlay).toEqual({ kind: "birth-year", selected: 2001, from: "room" });
    expect(chatRoomReducer(initialChatRoomState, { type: "select-birth-year", year: 2001 })).toBe(
      initialChatRoomState,
    );
  });

  test("SU-U6 사이드바에서 연 시트는 닫으면 사이드바로, 방 · 막힌 줄에서 연 것은 없음으로", () => {
    expect(overlayParent({ kind: "birth-year", selected: null, from: "sidebar" })).toEqual({
      kind: "sidebar",
    });
    expect(overlayParent({ kind: "birth-year", selected: null, from: "room" })).toEqual({
      kind: "none",
    });
    expect(overlayParent({ kind: "birth-year", selected: 1999, from: "blocked" })).toEqual({
      kind: "none",
    });
  });

  test("SU-U7 닫힌 뒤 초점은 연 자리로 — 사이드바 줄 · 막힌 줄 버튼, 방이 연 것은 없음", () => {
    expect(focusOriginOf({ kind: "birth-year", selected: null, from: "sidebar" })).toBe(
      "sidebar-birth-year",
    );
    expect(focusOriginOf({ kind: "birth-year", selected: null, from: "blocked" })).toBe(
      "blocked-change-year",
    );
    expect(focusOriginOf({ kind: "birth-year", selected: null, from: "room" })).toBeNull();
  });

  test("SU-U8 다른 겹침이 열려 있으면 select-birth-year는 아무것도 바꾸지 않는다", () => {
    const sidebar = chatRoomReducer(initialChatRoomState, {
      type: "open-overlay",
      overlay: { kind: "sidebar" },
    });
    expect(chatRoomReducer(sidebar, { type: "select-birth-year", year: 1990 })).toBe(sidebar);
  });
});
