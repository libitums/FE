import { describe, expect, test } from "vitest";

import { fakeTimers } from "./chat-fixture-timers.test-support";
import { createFixtureChatSource } from "./chat-fixture-source";
import { orderChatRooms } from "./chat-list";
import { COMPANION_FRIENDS } from "./companion-friends-roster";
import { COMPANION_ROSTER, guestCompanionSeed } from "./companion-roster";
import type { ChatSource } from "./chat-source.contract";

// `unit` 계층(GS-U1 ~ GS-U4): 비회원 출처(ADR-0166) — 회원과 같은 인물 방, 첫 인사는 열 때 앱 안에서 놓습니다(서버 0).

const NOW = 1_800_000_000_000;

function guestSource(unlocked: readonly string[] = []): ChatSource {
  return createFixtureChatSource({
    imageUrlOf: (path) => `url:${path}`,
    seed: guestCompanionSeed(),
    now: () => NOW,
    timers: fakeTimers(),
    unlocked,
    greetOnOpen: true,
  });
}

const textsOf = (source: ChatSource, roomId: string) =>
  (source.thread(roomId)?.messages ?? []).map((m) => (m.kind === "text" ? m.text.ko : m.kind));

describe("비회원 씨앗", () => {
  test("GS-U1 방은 앱 인물 표 전부(이야기 다섯 + 추천 친구 넷) — 덕수쌤만 처음부터 열림, 데모 방 없음", () => {
    const seed = guestCompanionSeed();
    expect(seed.rooms.map((room) => room.roomId)).toEqual(COMPANION_ROSTER.map((c) => c.id));
    const open = orderChatRooms(guestSource().snapshot().rooms).map((room) => room.roomId);
    expect(open).toEqual(["duksu"]);
  });

  test("GS-U2 각 방의 첫 말(opening)은 그 인물의 firstLine", () => {
    for (const room of guestCompanionSeed().rooms) {
      const character = COMPANION_ROSTER.find((c) => c.id === room.roomId);
      expect(room.opening?.ko).toBe(character?.firstLine ?? undefined);
    }
    expect(COMPANION_FRIENDS.length).toBe(4);
  });
});

describe("열 때 첫 인사(greetOnOpen)", () => {
  test("GS-U3 덕수쌤 방은 비어 있다가, 열면 첫 인사 한 줄 — 다시 열어도 한 줄", () => {
    const source = guestSource();
    expect(source.snapshot().rooms.find((r) => r.roomId === "duksu")?.lastMessage).toBeNull();
    source.openRoom("duksu");
    expect(textsOf(source, "duksu")).toEqual(["안녕하세요! 덕수쌤이에요."]);
    source.closeRoom("duksu");
    source.openRoom("duksu");
    expect(textsOf(source, "duksu")).toEqual(["안녕하세요! 덕수쌤이에요."]);
  });

  test("GS-U4 기기에 해금 기록이 있는 이야기 인물은 열린 채 그 첫 말로 시작한다(회원과 같은 해금 규칙)", () => {
    const source = guestSource(["yoonkyung"]);
    const open = orderChatRooms(source.snapshot().rooms).map((room) => room.roomId);
    expect(open).toContain("yoonkyung");
    expect(open).not.toContain("mina");
    expect(textsOf(source, "yoonkyung")).toEqual([
      "잘 도착했어요? 익선 게스트하우스 정윤경이에요.",
    ]);
  });

  test("GS-U5 greetOnOpen이 없으면(기존 가짜 출처) 열어도 빈 방 그대로", () => {
    const source = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: guestCompanionSeed(),
      now: () => NOW,
      timers: fakeTimers(),
    });
    source.openRoom("duksu");
    expect(textsOf(source, "duksu")).toEqual([]);
  });
});
