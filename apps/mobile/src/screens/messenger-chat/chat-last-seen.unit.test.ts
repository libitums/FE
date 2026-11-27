import { describe, expect, test } from "vitest";

import { EMPTY_SEEN, lastSeenOf, parseLastSeen, unreadAfter } from "./chat-last-seen";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(LSN-U1 ~ U9): 앱이 꺼진 사이 온 선톡 · 스토리 반응의 안 읽음(ADR-0213 개정). 기기에 방마다 「본 마지막 인물 메시지」
// (id · 시각)를 두고, 기록을 읽을 때 그 뒤의 인물 메시지 수를 센다 — 내 글 · 시스템 줄은 세지 않고, 한 메시지의 말풍선 여럿
// (`id#자리`)은 하나다(턴 하나 = 안 읽음 하나, ADR-0102).

const them = (id: string, at: number): ChatMessage => ({
  id,
  at,
  kind: "text",
  from: "them",
  text: { ko: "말", en: "" },
});
const act = (id: string, at: number): ChatMessage => ({
  id,
  at,
  kind: "action",
  text: { ko: "웃는다", en: "" },
});
const mine = (id: string, at: number): ChatMessage => ({
  id,
  at,
  kind: "text",
  from: "me",
  text: { ko: "나", en: "" },
});
const notice = (id: string, at: number): ChatMessage => ({
  id,
  at,
  kind: "notice",
  notice: "ai-disclosure",
});

const log: ChatMessage[] = [
  them("a1#0", 100),
  act("a1#1", 100),
  mine("u1", 200),
  them("a2#0", 300),
  notice("n1", 350),
  them("a3#0", 400),
  them("a3#1", 400),
];

describe("본 마지막 인물 메시지 (LSN-U1 ~ U2)", () => {
  test("LSN-U1 마지막 인물 메시지의 id(말풍선 자리 뗌)와 시각 — 내 글 · 시스템 줄은 건너뛴다", () => {
    expect(lastSeenOf(log)).toEqual({ id: "a3", at: 400 });
    expect(lastSeenOf([...log, mine("u2", 500), notice("n2", 600)])).toEqual({ id: "a3", at: 400 });
  });

  test("LSN-U2 인물 메시지가 없으면 null", () => {
    expect(lastSeenOf([])).toBeNull();
    expect(lastSeenOf([mine("u1", 1), notice("n1", 2)])).toBeNull();
  });
});

describe("안 읽음 세기 (LSN-U3 ~ U7)", () => {
  test("LSN-U3 저장된 id 뒤의 인물 메시지 수 — 말풍선 여럿은 하나, 내 글 · 시스템 줄은 세지 않는다", () => {
    expect(unreadAfter(log, { id: "a1", at: 100 })).toBe(2);
    expect(unreadAfter(log, { id: "a2", at: 300 })).toBe(1);
  });

  test("LSN-U4 저장된 id가 마지막이면 0", () => {
    expect(unreadAfter(log, { id: "a3", at: 400 })).toBe(0);
  });

  test("LSN-U5 저장된 id가 첫 쪽 밖이면 저장 시각보다 늦은 인물 메시지 수(첫 쪽 안 개수가 위 끝)", () => {
    expect(unreadAfter(log, { id: "gone", at: 50 })).toBe(3);
    expect(unreadAfter(log, { id: "gone", at: 300 })).toBe(1);
  });

  test("LSN-U6 빈 대화를 본 것(EMPTY_SEEN)이면 첫 쪽의 인물 메시지 모두", () => {
    expect(unreadAfter(log, EMPTY_SEEN)).toBe(3);
    expect(unreadAfter([], EMPTY_SEEN)).toBe(0);
  });

  test("LSN-U7 기록에 인물 메시지가 없으면 0", () => {
    expect(unreadAfter([mine("u1", 900)], { id: "a1", at: 100 })).toBe(0);
  });
});

describe("저장값 읽기 (LSN-U8 ~ U9)", () => {
  test("LSN-U8 id(문자열 · null)와 유한한 시각만 읽는다", () => {
    expect(parseLastSeen({ id: "a1", at: 100 })).toEqual({ id: "a1", at: 100 });
    expect(parseLastSeen({ id: null, at: 0 })).toEqual(EMPTY_SEEN);
  });

  test("LSN-U9 틀린 값은 적힌 것 없음(null)", () => {
    for (const raw of [
      null,
      "a1",
      3,
      [],
      {},
      { id: 1, at: 1 },
      { id: "a", at: "x" },
      { id: "", at: 1 },
    ])
      expect(parseLastSeen(raw)).toBeNull();
    expect(parseLastSeen({ id: "a", at: Number.NaN })).toBeNull();
  });
});
