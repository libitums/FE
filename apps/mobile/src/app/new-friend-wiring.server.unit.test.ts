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

test("SW-U5 서버 방이 비어 있어도 미나 시트는 인물 표의 첫 말로 선다", () => {
  const source = createFixtureChatSource({ imageUrlOf: () => null, seed: companionSeed(), remote });
  const model = newFriendModelOf("mina", {
    messengerChat: { source } as never,
    catalogSections: [section],
    episodeContent: { imageUrlOf: (path: string) => `https://cdn/${path}` } as never,
  });
  expect(source.thread("mina")?.messages).toEqual([]);
  expect(model?.opening).toEqual({
    ko: "안녕! 나 미나야. 우리 문자하자!",
    en: "Hi! It's Mina. Let's text!",
  });
  expect(model?.name).toBe("미나");
});

describe("인물 표", () => {
  test("SW-U6 해금되는 인물은 모두 시트 첫 말이 있다(처음부터 열린 덕수쌤만 없음)", async () => {
    const { COMPANION_CHARACTERS } = await import("../screens/messenger-chat/companion-roster");
    for (const c of COMPANION_CHARACTERS)
      expect(c.sheetOpening === null).toBe(c.unlockEpisodeId === null);
  });
});
