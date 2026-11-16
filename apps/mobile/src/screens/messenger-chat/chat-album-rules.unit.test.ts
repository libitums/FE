import { describe, expect, test } from "vitest";

import type { ChatAlbumItem } from "./chat-album.contract";
import {
  albumDayOf,
  albumItemsFromLog,
  albumSections,
  needsSelfAsk,
  remakePrice,
} from "./chat-album-rules";
import { DEFAULT_PREFERENCES } from "./chat-fixture-settings";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(AL-U1 ~ U5): 앨범 묶음 · 날짜 · 다시 만들기 값 · 가짜 앨범 · 내 모습 묻기(ADR-0150).

const NOW = Date.parse("2026-11-15T10:00:00.000Z");
const HOUR = 3_600_000;
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const item = (over: Partial<ChatAlbumItem> & { id: string }): ChatAlbumItem => ({
  messageId: A,
  kind: "photo",
  url: `https://x/${over.id}.png`,
  aspect: "3:2",
  line: { ko: "", en: "" },
  createdAt: NOW - HOUR,
  fromPastChat: false,
  ...over,
});

describe("AL-U1 앨범 묶음", () => {
  const items = [
    item({ id: "p1", messageId: A, createdAt: NOW - 3 * HOUR }),
    item({ id: "p2", messageId: A, createdAt: NOW - HOUR }),
    item({ id: "v1", messageId: A, kind: "voice", aspect: null, createdAt: NOW - 2 * HOUR }),
    item({ id: "p3", messageId: B, createdAt: NOW - 30 * HOUR }),
  ];

  test("AL-U1a All은 최신부터, 같은 메시지 사진의 판은 최신 하나가 칸이고 판들은 오래된 것부터", () => {
    const sections = albumSections(items, "all", NOW, 0, new Set());
    expect(sections.map((s) => s.day)).toEqual([{ kind: "today" }, { kind: "yesterday" }]);
    const today = sections[0]?.tiles ?? [];
    expect(today.map((t) => t.item.id)).toEqual(["p2", "v1"]);
    expect(today[0]?.versions.map((v) => v.id)).toEqual(["p1", "p2"]);
    expect(today[1]?.versions.map((v) => v.id)).toEqual(["v1"]);
    expect(sections[1]?.tiles.map((t) => t.item.id)).toEqual(["p3"]);
  });

  test("AL-U1b Photos · Voice 탭은 그 종류만", () => {
    const photos = albumSections(items, "photos", NOW, 0, new Set()).flatMap((s) => s.tiles);
    expect(photos.map((t) => t.item.id)).toEqual(["p2", "p3"]);
    const voice = albumSections(items, "voice", NOW, 0, new Set()).flatMap((s) => s.tiles);
    expect(voice.map((t) => t.item.id)).toEqual(["v1"]);
  });

  test("AL-U1c 다시 만드는 중인 메시지의 칸은 remaking(같은 종류만)", () => {
    const tiles = albumSections(items, "all", NOW, 0, new Set([`${A}~photo`])).flatMap(
      (s) => s.tiles,
    );
    expect(tiles.map((t) => [t.item.id, t.remaking])).toEqual([
      ["p2", true],
      ["v1", false],
      ["p3", false],
    ]);
  });

  test("AL-U1d 빈 목록은 빈 묶음", () => {
    expect(albumSections([], "all", NOW, 0, new Set())).toEqual([]);
  });
});

describe("AL-U2 날짜 머리", () => {
  test("AL-U2a 기기 시간대 기준 오늘 · 어제 · 그 전은 월 일", () => {
    expect(albumDayOf(NOW - HOUR, NOW, 0)).toEqual({ kind: "today" });
    expect(albumDayOf(NOW - 11 * HOUR, NOW, 0)).toEqual({ kind: "yesterday" });
    expect(albumDayOf(Date.parse("2026-11-12T08:00:00.000Z"), NOW, 0)).toEqual({
      kind: "date",
      month: 11,
      day: 12,
    });
  });

  test("AL-U2b 시간대를 더해 날짜를 가른다(UTC+9에서 UTC 전날 20시는 오늘)", () => {
    const at = Date.parse("2026-11-14T20:00:00.000Z"); // 서울 11-15 05시
    expect(albumDayOf(at, NOW, 9 * 60)).toEqual({ kind: "today" });
    expect(albumDayOf(at, NOW, 0)).toEqual({ kind: "yesterday" });
  });
});

describe("AL-U3 다시 만들기 값", () => {
  test("사진은 앞 그림이 있으면 25, 없으면 35 · 음성은 15", () => {
    expect(remakePrice("photo", true)).toBe(25);
    expect(remakePrice("photo", false)).toBe(35);
    expect(remakePrice("voice", true)).toBe(15);
    expect(remakePrice("voice", false)).toBe(15);
  });
});

describe("AL-U4 가짜 앨범 — 방 로그의 결과 줄", () => {
  test("결과 줄만(자리표시자 · 회색 줄 제외), 최신부터, 서버 줄은 대상 메시지와 그 말", () => {
    const log: ChatMessage[] = [
      { id: `${A}#0`, at: 1, kind: "text", from: "them", text: { ko: "안녕", en: "Hi" } },
      {
        id: `${A}~snapshot~m1`,
        at: 2,
        kind: "photo",
        imageUrl: "u1",
        aspect: "1:1",
        aiGenerated: true,
      },
      {
        id: `${A}~voice~m2`,
        at: 3,
        kind: "voice",
        durationMs: 0,
        text: { ko: "안녕", en: "Hi" },
        audioUrl: "u2",
      },
      { id: `${A}~voice~req`, at: 4, kind: "voice-pending" },
      {
        id: `${A}~snapshot~x1`,
        at: 5,
        kind: "media-notice",
        media: "photo",
        notice: "failed",
        until: null,
      },
      { id: "fx-9", at: 6, kind: "photo", imageUrl: "u3" },
    ];
    expect(albumItemsFromLog(log)).toEqual([
      {
        id: "fx-9",
        messageId: "fx-9",
        kind: "photo",
        url: "u3",
        aspect: null,
        line: { ko: "", en: "" },
        createdAt: 6,
        fromPastChat: false,
      },
      {
        id: "m2",
        messageId: A,
        kind: "voice",
        url: "u2",
        aspect: null,
        line: { ko: "안녕", en: "Hi" },
        createdAt: 3,
        fromPastChat: false,
      },
      {
        id: "m1",
        messageId: A,
        kind: "photo",
        url: "u1",
        aspect: "1:1",
        line: { ko: "안녕", en: "Hi" },
        createdAt: 2,
        fromPastChat: false,
      },
    ]);
  });

  test("가짜 음성(오디오 없음)은 url null", () => {
    const log: ChatMessage[] = [
      { id: "fx-1", at: 1, kind: "voice", durationMs: 3000, text: { ko: "네", en: "Yes" } },
    ];
    expect(albumItemsFromLog(log)[0]).toMatchObject({
      id: "fx-1",
      url: null,
      line: { ko: "네", en: "Yes" },
    });
  });
});

describe("AL-U5 첫 Snapshot에서 내 모습 묻기", () => {
  test("고른 적 없고 사진이면 묻는다 · 골랐거나 음성이면 묻지 않는다", () => {
    expect(needsSelfAsk({ ...DEFAULT_PREFERENCES, snapshotSelf: null }, "photo")).toBe(true);
    expect(needsSelfAsk({ ...DEFAULT_PREFERENCES, snapshotSelf: null }, "voice")).toBe(false);
    expect(needsSelfAsk({ ...DEFAULT_PREFERENCES, snapshotSelf: "male" }, "photo")).toBe(false);
  });
});
