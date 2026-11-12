import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { CHAT_COIN_PRICES } from "./chat-coins";
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
    expect(CHAT_PLACEHOLDERS.messageMaxLength).toBe(200);
    expect(CHAT_PLACEHOLDERS.replyIdeaCount).toBe(3);
  });

  test("MC-U24. 가격은 양의 정수다 — 가격표는 CHAT_COIN_PRICES 한 곳(MC2-U21)", () => {
    for (const price of Object.values(CHAT_COIN_PRICES)) {
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

// `unit` 계층(MC2-U21): 1.5 단계 씨앗 — 미나 opening · 교정 표 · 뜻 표 · 자리 표시 시간(spec §11).
describe("chatFixtureSeed 1.5 단계 (MC2-U21)", () => {
  const codePoints = (text: string): number => [...text].length;
  const mina = chatFixtureSeed.rooms.find((room) => room.roomId === "mina");
  const myTexts = chatFixtureSeed.rooms.flatMap((room) =>
    room.messages.flatMap((message) =>
      message.kind === "text" && message.from === "me" ? [message] : [],
    ),
  );

  test("MC2-U21. 미나 방은 잠김(에피소드 3)이고 메시지가 없다", () => {
    expect(mina?.access).toEqual({ kind: "locked", unlockEpisode: 3 });
    expect(mina?.messages).toEqual([]);
  });

  test("MC2-U21. 미나 opening 은 한국어 · 영어가 비지 않았다", () => {
    expect(mina?.opening?.ko.trim()).toBeTruthy();
    expect(mina?.opening?.en.trim()).toBeTruthy();
  });

  test("MC2-U21. 교정 표: 둘 이상이고, 각 changes 는 corrected 길이 안의 올바른 범위다(종류별 내용은 ADR-0129)", () => {
    const corrections = chatFixtureSeed.corrections ?? [];
    expect(corrections.length).toBeGreaterThanOrEqual(2);
    for (const correction of corrections) {
      expect(correction.original.trim()).not.toBe("");
      expect(correction.corrected.trim()).not.toBe("");
      if (correction.kind === "correction") {
        expect(correction.items.length).toBeGreaterThan(0);
        expect(correction.changes.length).toBeGreaterThan(0);
      }
      if (correction.kind === "better") expect(correction.better?.text.trim()).not.toBe("");
      if (correction.kind === "l1_to_ko") expect(correction.meaning?.trim()).not.toBe("");
      for (const { start, end } of correction.changes) {
        expect(Number.isInteger(start) && Number.isInteger(end)).toBe(true);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        expect(end).toBeLessThanOrEqual(codePoints(correction.corrected));
      }
    }
  });

  test("MC2-U21. 씨앗 교정이 붙은 내 글이 하나 이상이고, 게스트하우스 방에 있다", () => {
    expect(myTexts.some((message) => message.correction !== undefined)).toBe(true);
    const guesthouse = chatFixtureSeed.rooms.find((room) => room.roomId === "guesthouse");
    const hasFix = (guesthouse?.messages ?? []).some(
      (message) => message.kind === "text" && message.from === "me" && message.correction,
    );
    expect(hasFix).toBe(true);
  });

  test("MC2-U21. 씨앗 내 글에 붙은 교정의 original 은 그 글과 같고 범위가 올바르다", () => {
    expect(myTexts.some((message) => message.correction !== undefined)).toBe(true);
    for (const message of myTexts) {
      if (message.correction === undefined) continue;
      expect(message.correction.original).toBe(message.text.ko.trim());
      for (const { start, end } of message.correction.changes) {
        expect(end).toBeGreaterThan(start);
        expect(end).toBeLessThanOrEqual(codePoints(message.correction.corrected));
      }
    }
  });

  test("MC2-U21. 뜻 표는 씨앗의 내 글 전부와 1단계 보기 세트 문장을 모두 덮는다", () => {
    const meanings = chatFixtureSeed.meanings ?? [];
    expect(meanings.length).toBeGreaterThan(0);
    const covered = new Set(meanings.map((entry) => entry.ko));
    const needed = [
      ...myTexts.map((message) => message.text.ko.trim()),
      ...chatFixtureSeed.rooms.flatMap((room) =>
        room.ideaSets.flatMap((set) => set.map((idea) => idea.ko.trim())),
      ),
    ];
    expect(needed.length).toBeGreaterThan(0);
    const missing = needed.filter((ko) => !covered.has(ko));
    expect(missing).toEqual([]);
    for (const entry of meanings) {
      expect(entry.romanization.trim()).not.toBe("");
      expect(entry.meaning.trim()).not.toBe("");
    }
  });

  test("MC2-U21. 표에 없는 글의 대체 뜻이 있다", () => {
    expect(chatFixtureSeed.fallbackMeaning?.meaning.trim()).toBeTruthy();
  });

  test("MC2-U21. 가격은 CHAT_PLACEHOLDERS 에 더는 없다(CHAT_COIN_PRICES 로 옮김)", () => {
    expect(Object.keys(CHAT_PLACEHOLDERS)).not.toContain("price");
  });

  test("MC2-U21. 뜻 · 교정 시간은 600~900 ms, 턴 갱신은 60,000 ms 다", () => {
    expect(CHAT_PLACEHOLDERS.timing.meaningMs).toBeGreaterThanOrEqual(600);
    expect(CHAT_PLACEHOLDERS.timing.meaningMs).toBeLessThanOrEqual(900);
    expect(CHAT_PLACEHOLDERS.timing.correctionMs).toBeGreaterThanOrEqual(600);
    expect(CHAT_PLACEHOLDERS.timing.correctionMs).toBeLessThanOrEqual(900);
    expect(CHAT_PLACEHOLDERS.timing.turnTickMs).toBe(60_000);
  });
});
