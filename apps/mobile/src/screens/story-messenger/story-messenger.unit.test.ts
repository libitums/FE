import { describe, expect, test } from "vitest";

import type { EpisodeChat } from "../../lib/episode-content.model";
import {
  storyChatProgressOf,
  storyChatReadPauseMs,
  storyChatSheetDelayMs,
  storyChatTypingMs,
  storyChatViewOf,
} from "./story-messenger";
import type { StoryChatProgress, StoryChatTurn } from "./story-messenger.contract";

// `unit` 계층: 메신저 진행 · 기다리는 시간 · 표시 모델의 입출력만 봅니다.

const t = (ko: string) => ({ ko, en: `e-${ko}` });
const msg = (
  ko: string,
  extra: Partial<{ self: boolean; afterOption: number; imageUrl: string }> = {},
): StoryChatTurn => ({
  kind: "message",
  self: extra.self ?? false,
  speaker: extra.self === true ? "플레이어" : "미나",
  text: t(ko),
  imageUrl: extra.imageUrl ?? null,
  afterOption: extra.afterOption ?? null,
});
const reply = (...options: string[]): StoryChatTurn => ({
  kind: "reply",
  options: options.map(t) as [ReturnType<typeof t>, ...ReturnType<typeof t>[]],
});

// u04 축약: 메시지 · 고르기(분기) · 공통 · 고르기(분기 없음) · 끝.
const TURNS: StoryChatTurn[] = [
  msg("식당 찾았어요?"),
  reply("아니요", "어디예요?"),
  msg("괜찮아요", { afterOption: 1 }),
  msg("맛있어요", { afterOption: 2 }),
  msg("여기예요", { imageUrl: "u://photo" }),
  reply("네...", "몰라요..."),
  msg("저도 처음엔 몰랐어요"),
];

const lines = (p: StoryChatProgress) => p.log.map((item) => `${item.direction}:${item.text.ko}`);

describe("storyChatProgressOf", () => {
  test("SM1. 처음에는 기록이 비고 첫 메시지가 다음이다", () => {
    const p = storyChatProgressOf(TURNS, 0, []);
    expect(p.log).toEqual([]);
    expect(p.next?.text.ko).toBe("식당 찾았어요?");
    expect(p.awaiting).toBeNull();
  });

  test("SM2. 첫 메시지 뒤에는 답장을 기다리고, 고른 답의 분기 줄만 이어진다", () => {
    expect(storyChatProgressOf(TURNS, 1, []).awaiting?.options.map((o) => o.ko)).toEqual([
      "아니요",
      "어디예요?",
    ]);
    const picked2 = storyChatProgressOf(TURNS, 1, [2]);
    expect(lines(picked2)).toEqual(["incoming:식당 찾았어요?", "outgoing:어디예요?"]);
    expect(picked2.next?.text.ko).toBe("맛있어요");
    expect(lines(storyChatProgressOf(TURNS, 3, [2]))).toEqual([
      "incoming:식당 찾았어요?",
      "outgoing:어디예요?",
      "incoming:맛있어요",
      "incoming:여기예요",
    ]);
  });

  test("SM3. 분기 줄 없는 고르기는 바로 다음 공통 줄로 가고, 다 보이면 next · awaiting이 없다", () => {
    const end = storyChatProgressOf(TURNS, 4, [1, 2]);
    expect(lines(end).slice(-3)).toEqual([
      "incoming:여기예요",
      "outgoing:몰라요...",
      "incoming:저도 처음엔 몰랐어요",
    ]);
    expect(end.next).toBeNull();
    expect(end.awaiting).toBeNull();
  });

  test("SM4. 사진 · 자기 메시지 — 사진 주소를 싣고 자기 메시지는 outgoing이다", () => {
    const turns = [msg("안녕"), msg("나야", { self: true })];
    const p = storyChatProgressOf(turns, 2, []);
    expect(p.log.map((item) => item.direction)).toEqual(["incoming", "outgoing"]);
    const withPhoto = storyChatProgressOf(TURNS, 3, [1]).log;
    expect(withPhoto[withPhoto.length - 1]?.imageUrl).toBe("u://photo");
    expect(new Set(storyChatProgressOf(TURNS, 4, [1, 1]).log.map((i) => i.id)).size).toBe(6);
  });
});

describe("기다리는 시간", () => {
  test("SM5. 글이 길수록 길고 상한에서 멈춘다", () => {
    expect(storyChatReadPauseMs(0)).toBe(1200);
    expect(storyChatReadPauseMs(10)).toBe(1800);
    expect(storyChatReadPauseMs(200)).toBe(2400);
    expect(storyChatTypingMs(0)).toBe(900);
    expect(storyChatTypingMs(100)).toBe(2400);
    expect(storyChatSheetDelayMs(8)).toBe(2560);
    expect(storyChatSheetDelayMs(100)).toBe(4000);
  });
});

describe("storyChatViewOf", () => {
  const chat: EpisodeChat = {
    counterpart: "미나",
    counterpartImageUrl: "content/images/profiles/mina-casual.webp",
    backgroundUrl: "content/images/u04/pre-2.webp",
    turns: [
      {
        kind: "message",
        speaker: "미나",
        line: { ko: "{name} 씨, 어디예요?", en: "Where are you, {name}?" },
      },
      { kind: "reply", options: [{ ko: "몰라요", en: "No idea" }] },
      {
        kind: "message",
        speaker: "미나",
        line: { ko: "여기!" },
        imageUrl: "content/images/u04/photo.webp",
        afterOption: 1,
      },
    ],
  };
  const port = {
    imageUrlOf: (path: string) =>
      path.endsWith("photo.webp") || path.includes("/profiles/") ? `res://${path}` : null,
    fill: (text: string) => text.replace("{name}", "Alex"),
  };

  test("SM6. 그림을 해석하고 글을 채우며, 해석 못 한 그림은 null이다", () => {
    const view = storyChatViewOf(chat, port);
    expect(view?.counterpart).toBe("미나");
    expect(view?.counterpartAvatarUrl).toBe("res://content/images/profiles/mina-casual.webp");
    expect(
      storyChatViewOf({ ...chat, counterpartImageUrl: undefined }, port).counterpartAvatarUrl,
    ).toBeNull();
    expect(view?.turns[0]).toEqual({
      kind: "message",
      self: false,
      speaker: "미나",
      text: { ko: "Alex 씨, 어디예요?", en: "Where are you, Alex?" },
      imageUrl: null,
      afterOption: null,
    });
    expect(view?.turns[2]).toMatchObject({
      imageUrl: "res://content/images/u04/photo.webp",
      afterOption: 1,
      text: { ko: "여기!", en: "" },
    });
  });
});
