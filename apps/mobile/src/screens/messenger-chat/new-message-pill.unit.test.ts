import { describe, expect, test } from "vitest";

import type { ChatMessage } from "./chat-source.contract";
import {
  arrivalIds,
  arrivalKindOf,
  arrivalsSince,
  noteArrivals,
  pillViewOf,
} from "./new-message-pill";

// `unit` 계층(chat-new-message-pill R1 · R2 · R4 · R5): 어떤 줄을 세는지 · 떠나 있는 동안 온 줄 · 무엇을 세울지.

const A = "0b6f3a52-6a5e-4c1d-9f9e-2a7f0f6b9c11";
const them = (id: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "안녕", en: "Hi" },
});
const mine = (id: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "me",
  text: { ko: "네", en: "Yes" },
});
const photo = (id: string): ChatMessage => ({ id, at: 2, kind: "photo", imageUrl: null });
const voice = (id: string): ChatMessage => ({
  id,
  at: 2,
  kind: "voice",
  durationMs: 900,
  text: { ko: "네", en: "Yes" },
});

describe("arrivalKindOf", () => {
  test("NP-U1. 상대 말 · 지문은 message, 사진 · 음성은 그 종류, 나머지(내 글 · 대기 · 공지 · 위기 · 매체 회색 줄)는 세지 않는다", () => {
    expect(arrivalKindOf(them(`${A}#0`))).toBe("message");
    expect(
      arrivalKindOf({ id: `${A}#1`, at: 1, kind: "action", text: { ko: "웃는다", en: "smiles" } }),
    ).toBe("message");
    expect(arrivalKindOf(photo(`${A}~snapshot~m1`))).toBe("photo");
    expect(arrivalKindOf(voice(`${A}~voice~m2`))).toBe("voice");
    expect(arrivalKindOf(mine("local-a"))).toBeNull();
    expect(arrivalKindOf({ id: "p", at: 1, kind: "photo-pending", startedAt: 1 })).toBeNull();
    expect(arrivalKindOf({ id: "v", at: 1, kind: "voice-pending", startedAt: 1 })).toBeNull();
    expect(arrivalKindOf({ id: "n", at: 1, kind: "notice", notice: "ai-disclosure" })).toBeNull();
    expect(arrivalKindOf({ id: "c", at: 1, kind: "crisis", resources: [] })).toBeNull();
    expect(
      arrivalKindOf({
        id: `${A}~snapshot~x1`,
        at: 1,
        kind: "media-notice",
        media: "photo",
        notice: "failed",
        until: null,
      }),
    ).toBeNull();
  });
});

describe("arrivalsSince", () => {
  test("NP-U2. 떠날 때 본 줄 밖의 상대 줄만 센다 — 수와 마지막 줄의 종류", () => {
    const before = [them(`${A}#0`), mine("local-a")];
    const seen = arrivalIds(before);
    expect(arrivalsSince(before, seen)).toBeNull();
    expect(arrivalsSince([...before, them(`${A}#1`)], seen)).toEqual({
      count: 1,
      latest: "message",
    });
    expect(
      arrivalsSince([...before, them(`${A}#1`), them(`${A}#2`), photo(`${A}~snapshot~m1`)], seen),
    ).toEqual({ count: 3, latest: "photo" });
    expect(arrivalsSince([...before, photo(`${A}~snapshot~m1`), them(`${A}#3`)], seen)).toEqual({
      count: 2,
      latest: "message",
    });
    expect(arrivalsSince([...before, voice(`${A}~voice~m2`)], seen)).toEqual({
      count: 1,
      latest: "voice",
    });
  });

  // 기기(iOS SE 3): 사진 줄은 대상 말풍선 뒤에 끼어 서므로 로그 순서로는 마지막이 아니어도, 가장 늦게 온 것이면 「Sent a photo」다.
  test("NP-U5. 마지막 종류는 로그 자리가 아니라 온 순서로 정한다", () => {
    const before = [them(`${A}#0`)];
    const seen = arrivalIds(before);
    const replies = [...before, mine("local-a"), them(`${A}#1`), them(`${A}#2`)];
    const order = noteArrivals(new Map(), replies, seen);
    const withPhoto = [them(`${A}#0`), photo(`${A}~snapshot~m1`), ...replies.slice(1)];
    const later = noteArrivals(order, withPhoto, seen);
    expect(later.get(`${A}~snapshot~m1`)).toBeGreaterThan(later.get(`${A}#2`) ?? Infinity);
    expect(arrivalsSince(withPhoto, seen, later)).toEqual({ count: 3, latest: "photo" });
    expect(noteArrivals(later, withPhoto, seen)).toBe(later); // 새 것이 없으면 같은 참조
  });

  test("NP-U3. 내 글 · 대기 줄만 늘면 알약이 없다", () => {
    const before = [them(`${A}#0`)];
    const seen = arrivalIds(before);
    expect(
      arrivalsSince(
        [...before, mine("local-b"), { id: "p", at: 1, kind: "photo-pending", startedAt: 1 }],
        seen,
      ),
    ).toBeNull();
  });
});

describe("pillViewOf", () => {
  test("NP-U4. 끝 근처면 아무것도 없고, 떠나 있는 동안 온 줄이 있으면 알약, 없고 멀면 ↓ 단추", () => {
    const arrival = { count: 2, latest: "message" } as const;
    expect(pillViewOf({ nearEnd: true, far: false, arrival })).toBeNull();
    expect(pillViewOf({ nearEnd: false, far: false, arrival })).toEqual({ kind: "pill", arrival });
    expect(pillViewOf({ nearEnd: false, far: true, arrival })).toEqual({ kind: "pill", arrival });
    expect(pillViewOf({ nearEnd: false, far: true, arrival: null })).toEqual({ kind: "latest" });
    expect(pillViewOf({ nearEnd: false, far: false, arrival: null })).toBeNull();
  });
});
