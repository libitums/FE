import { describe, expect, test } from "vitest";

import { createFixtureChatSource } from "../screens/messenger-chat/chat-fixture-source";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { companionSeed } from "../screens/messenger-chat/companion-roster";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { newFriendModelOf } from "./new-friend-wiring";

// `unit` 계층(SW-U5): 서버 모드의 새 친구 시트 — 열기 전 빈 방이라 인물 표의 첫 말로 선다(ADR-0137, 리뷰 C2).

const remote: ChatRemote = {
  loadHistory: async () => null,
  greet: async () => null,
  openTurn: () => ({ cancel: () => undefined }),
};
const section = {
  kind: "catalog-ready",
  episodeId: "u03-mina",
  ordinal: 3,
  title: "미나",
  titleEn: "Mina",
} as unknown as CatalogMapSection;

const wiringOf = (source: ReturnType<typeof createFixtureChatSource>) => ({
  messengerChat: { source } as never,
  catalogSections: [section],
  episodeContent: { imageUrlOf: (path: string) => `https://cdn/${path}` } as never,
});

test("SW-U5 서버 방이 비어 있어도 미나 시트는 인물 표의 첫 말로 선다", () => {
  const source = createFixtureChatSource({ imageUrlOf: () => null, seed: companionSeed(), remote });
  const model = newFriendModelOf("mina", wiringOf(source), "open", "en");
  expect(source.thread("mina")?.messages).toEqual([]);
  expect(model?.opening).toEqual({
    ko: "안녕하세요! 같은 방 미나예요.",
    en: "Hi! It's Mina, your roommate.",
  });
  expect(model?.name).toBe("미나");
});

// SW-U7 — 메신저를 쓸 수 없는 계정(손님 · 로그아웃, ADR-0128)에는 시트가 서지 않는다. 서면 Reply가 탭 바 없는
// 안내 화면에 가둔다(2026-11-17 UX 점검). 방 · 첫 말이 다 있어도 null.
test("SW-U7 메신저를 쓸 수 없는 계정이면 방 · 첫 말이 있어도 시트 모델이 없다", () => {
  const source = createFixtureChatSource({ imageUrlOf: () => null, seed: companionSeed(), remote });
  expect(newFriendModelOf("mina", wiringOf(source), "open", "en")).not.toBeNull();
  expect(newFriendModelOf("mina", wiringOf(source), "sign-in", "en")).toBeNull();
});

// SW-U8 — 비회원 미리보기(ADR-0166)는 회원과 같은 목록이라 Reply가 열 방이 있습니다 — 시트가 섭니다.
test("SW-U8 비회원 미리보기(preview)면 새 친구 시트 모델이 선다", () => {
  const source = createFixtureChatSource({ imageUrlOf: () => null, seed: companionSeed() });
  expect(newFriendModelOf("mina", wiringOf(source), "preview")?.name).toBe("미나");
});

describe("인물 표", () => {
  test("SW-U6 해금되는 인물은 모두 시트 첫 말이 있다(처음부터 열린 덕수쌤만 없음)", async () => {
    const { COMPANION_CHARACTERS } = await import("../screens/messenger-chat/companion-roster");
    for (const c of COMPANION_CHARACTERS)
      expect(c.sheetOpening === null).toBe(c.unlockEpisodeId === null);
  });
});

// SW-U8 — 서버 방이 비어 인물 표로 서는 시트의 뜻풀이는 화면 언어입니다(2026-11-19 l10n 점검 — 전에는 늘 영어). 서버가 저장한
// 첫 말이 있으면 그 번역(서버가 학습자 언어로 붙임)이 그대로 섭니다.
test.each([
  ["vi", "Chào bạn! Mình là Mina, bạn cùng phòng."],
  ["ja", "こんにちは！同じ部屋のミナです。"],
  ["en", "Hi! It's Mina, your roommate."],
] as const)("SW-U8 인물 표로 서는 시트 뜻풀이가 화면 언어(%s)다", (language, expected) => {
  const source = createFixtureChatSource({ imageUrlOf: () => null, seed: companionSeed(), remote });
  const model = newFriendModelOf("mina", wiringOf(source), "open", language);
  expect(model?.opening).toEqual({ ko: "안녕하세요! 같은 방 미나예요.", en: expected });
});
