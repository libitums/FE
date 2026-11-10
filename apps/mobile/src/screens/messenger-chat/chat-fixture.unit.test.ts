import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { chatFixtureSeed } from "./chat-fixture";

// `unit` 계층(MC-U24): 자리 표시 상수 · 가짜 씨앗의 모양(spec §5.1 · §10).

// 그림 경로가 가리킬 수 있는 값 — 기존 에피소드 콘텐츠가 이미 쓰는 프로필 그림이다.
const episodesDir = resolve(process.cwd(), "content/episodes");
const knownProfileImages = new Set(
  readdirSync(episodesDir)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) =>
      [
        ...readFileSync(resolve(episodesDir, name), "utf8").matchAll(
          /"(content\/images\/profiles\/[^"]+)"/g,
        ),
      ].map((match) => match[1] as string),
    ),
);

describe("CHAT_PLACEHOLDERS (MC-U24)", () => {
  test("MC-U24. 신고 사유 다섯은 서로 다르다", () => {
    expect(CHAT_PLACEHOLDERS.reportReasons).toHaveLength(5);
    expect(new Set(CHAT_PLACEHOLDERS.reportReasons).size).toBe(5);
  });

  test("MC-U24. 글자 수 상한 · 보기 수", () => {
    expect(CHAT_PLACEHOLDERS.fixMaxLength).toBe(200);
    expect(CHAT_PLACEHOLDERS.messageMaxLength).toBe(200);
    expect(CHAT_PLACEHOLDERS.replyIdeaCount).toBe(3);
  });

  test("MC-U24. 가격은 양의 정수다", () => {
    for (const price of Object.values(CHAT_PLACEHOLDERS.price)) {
      expect(Number.isInteger(price)).toBe(true);
      expect(price).toBeGreaterThan(0);
    }
  });

  test("MC-U24. 파형은 20개이고 모두 양수다", () => {
    expect(CHAT_PLACEHOLDERS.waveform).toHaveLength(20);
    for (const bar of CHAT_PLACEHOLDERS.waveform) expect(bar).toBeGreaterThan(0);
  });

  test("MC-U24. 시간 값은 양의 정수 ms 다", () => {
    for (const ms of Object.values(CHAT_PLACEHOLDERS.timing)) {
      expect(Number.isInteger(ms)).toBe(true);
      expect(ms).toBeGreaterThan(0);
    }
  });
});

describe("chatFixtureSeed (MC-U24)", () => {
  test("MC-U24. 방이 넷이다", () => {
    expect(chatFixtureSeed.rooms).toHaveLength(4);
  });

  test("MC-U24. 방 id 와 상대 이름은 서로 다르고 비지 않았다", () => {
    const ids = chatFixtureSeed.rooms.map((room) => room.roomId);
    const names = chatFixtureSeed.rooms.map((room) => room.counterpart.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    for (const value of [...ids, ...names]) expect(value.trim()).not.toBe("");
  });

  test("MC-U24. 잠긴 방이 하나 이상이고 열린 방도 하나 이상이다", () => {
    const kinds = chatFixtureSeed.rooms.map((room) => room.access.kind);
    expect(kinds).toContain("locked");
    expect(kinds).toContain("open");
  });

  test("MC-U24. 보기 세트는 모두 길이가 replyIdeaCount 이다", () => {
    expect(chatFixtureSeed.rooms.length).toBeGreaterThan(0);
    for (const room of chatFixtureSeed.rooms) {
      expect(room.ideaSets.length).toBeGreaterThan(0);
      for (const set of room.ideaSets) expect(set).toHaveLength(CHAT_PLACEHOLDERS.replyIdeaCount);
    }
  });

  test("MC-U24. 정해 둔 답이 있다 — 비지 않은 한국어와 영어", () => {
    expect(chatFixtureSeed.rooms.length).toBeGreaterThan(0);
    for (const room of chatFixtureSeed.rooms) {
      if (room.access.kind === "locked") continue;
      expect(room.cannedReplies.length).toBeGreaterThan(0);
      for (const reply of room.cannedReplies) {
        expect(reply.ko.trim()).not.toBe("");
        expect(reply.en.trim()).not.toBe("");
      }
    }
  });

  test("MC-U24. 그림 경로는 기존 콘텐츠 프로필 그림에 있는 값이거나 null 이다", () => {
    expect(chatFixtureSeed.rooms.length).toBeGreaterThan(0);
    for (const room of chatFixtureSeed.rooms) {
      const { avatarPath } = room.counterpart;
      if (avatarPath !== null) expect(knownProfileImages.has(avatarPath), avatarPath).toBe(true);
    }
  });

  test("MC-U24. 이야기 시점이 있고 지금 시점 id 가 그 안에 있다", () => {
    expect(chatFixtureSeed.rooms.length).toBeGreaterThan(0);
    for (const room of chatFixtureSeed.rooms) {
      expect(room.storyPoints.length).toBeGreaterThan(0);
      expect(room.storyPoints.map((p) => p.id)).toContain(room.settings.storyPointId);
    }
  });
});
