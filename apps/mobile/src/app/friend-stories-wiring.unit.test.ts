import { afterEach, expect, test, vi } from "vitest";

import type { CatalogEntry } from "../lib/episode-catalog";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { story } from "../screens/messenger-chat/friend-stories.test-support";
import { setEarlyAccessRemote } from "./suggested-friends-wiring";
import { catalogWordOf } from "./wordbook-entries";
import { friendStoriesPort, setFriendStoriesStoresForTests } from "./friend-stories-wiring";

// `unit` 계층(SW-S1 ~ S4, state-data): 친구 스토리 결선(ADR-0177 D2 · D4) — 서버 포트가 없으면 null(스토리 없음), 있으면 RPC,
// 같은 설정이면 같은 포트 객체(효과가 렌더마다 다시 돌지 않게), 단어는 UI 언어 카탈로그에서 찾고 저장은 별표 단어장.

afterEach(() => {
  setEarlyAccessRemote(null);
  setFriendStoriesStoresForTests(null);
});

const water = {
  status: "ready",
  id: "u01-water",
  order: 1,
  title: "물",
  version: "1",
  source: "bundled",
  warnings: [],
  episode: {
    title: "물",
    titleEn: "Water",
    words: [{ id: "voca:a1", ko: "물", roman: "mul", glossEn: "water", role: "target" }],
    units: [],
  },
} as unknown as CatalogEntry;

const imageUrlOf = (path: string) => `https://cdn/${path}`;

test("SW-S1 서버 포트가 없으면 스토리를 읽지 않고 null", async () => {
  const port = friendStoriesPort({ imageUrlOf, catalog: () => [] });
  expect(await port.load()).toBeNull();
  expect(port.imageUrl("content/images/a.webp")).toBe("https://cdn/content/images/a.webp");
});

test("SW-S2 서버 포트가 있으면 companion_friend_stories를 읽고, 같은 해석기면 같은 포트 객체", async () => {
  const list = vi.fn(async () => [story("mina")]);
  setEarlyAccessRemote(() => ({ stories: { list } }) as unknown as ChatRemote);
  const args = { imageUrlOf, catalog: () => [] };
  const port = friendStoriesPort(args);
  expect(friendStoriesPort(args)).toBe(port);
  expect((await port.load())?.map((s) => s.id)).toEqual(["s-mina"]);
  expect(list).toHaveBeenCalledTimes(1);
});

test("SW-S3 읽다가 던지면 null", async () => {
  setEarlyAccessRemote(
    () =>
      ({ stories: { list: async () => Promise.reject(new Error("x")) } }) as unknown as ChatRemote,
  );
  expect(await friendStoriesPort({ imageUrlOf, catalog: () => [] }).load()).toBeNull();
});

test("SW-S4 단어는 카탈로그에서 찾고, 저장하면 별표 단어장에 들어가 saved", () => {
  const saved = new Set<string>();
  setFriendStoriesStoresForTests({
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    saveWord: (word) => void saved.add(`${word.episodeId}|${word.ref}`),
    isWordSaved: (word) => saved.has(`${word.episodeId}|${word.ref}`),
  });
  const port = friendStoriesPort({ imageUrlOf, catalog: () => [water] });
  const word = { episodeId: "u01-water", ref: "voca:a1" };
  expect(port.words?.lookup(word)).toEqual({ ko: "물", roman: "mul", meaning: "water" });
  expect(port.words?.lookup({ episodeId: "u01-water", ref: "voca:zz" })).toBeNull();
  expect(port.words?.saved(word)).toBe(false);
  port.words?.save(word);
  expect(port.words?.saved(word)).toBe(true);
});

test("SW-S5 catalogWordOf — 준비되지 않은 에피소드 · 없는 단어는 null", () => {
  expect(catalogWordOf([water], "u01-water", "voca:a1")).toEqual({
    ko: "물",
    roman: "mul",
    meaning: "water",
  });
  expect(
    catalogWordOf(
      [{ ...water, status: "missing" } as unknown as CatalogEntry],
      "u01-water",
      "voca:a1",
    ),
  ).toBeNull();
  expect(catalogWordOf([water], "u02", "voca:a1")).toBeNull();
});
