import { readFile } from "node:fs/promises";

import { afterAll, beforeAll, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 20261228130000(ADR-0177 D1): 친구 스토리 묶음 27줄이 정본 `docs/content/friend-stories.json`과 같다 — 친구 페르소나(FR1)와 같은 약속.

const poolJson = new URL("../../../../docs/content/friend-stories.json", import.meta.url);

type Source = {
  readonly stories: readonly {
    readonly id: string;
    readonly characterId: string;
    readonly imagePath: string;
    readonly line: {
      readonly ko: string;
      readonly roman: string;
      readonly meaning: Record<string, string>;
    };
    readonly word: { readonly episodeId: string; readonly ref: string } | null;
    readonly replies: readonly string[];
  }[];
};

let db: Awaited<ReturnType<typeof startTestDatabase>>;

beforeAll(async () => {
  db = await startTestDatabase();
}, 90_000);
afterAll(async () => {
  await db?.close();
});

test("FSP1. 묶음 표가 정본 JSON과 같다 — 인물 · 그림 · 한 줄 · 로마자 · 뜻 · 단어 · 칩, 모두 켬", async () => {
  const source = JSON.parse(await readFile(poolJson, "utf8")) as Source;
  const rows = (
    await db.admin.query(
      `select id, character_id, image_path, line_ko, line_roman, meaning, word, replies, active
       from companion.story_pool order by id`,
    )
  ).rows as {
    id: string;
    character_id: string;
    image_path: string;
    line_ko: string;
    line_roman: string;
    meaning: Record<string, string>;
    word: unknown;
    replies: string[];
    active: boolean;
  }[];
  const expected = [...source.stories]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((story) => ({
      id: story.id,
      character_id: story.characterId,
      image_path: story.imagePath,
      line_ko: story.line.ko,
      line_roman: story.line.roman,
      meaning: story.line.meaning,
      word: story.word,
      replies: story.replies,
      active: true,
    }));
  expect(rows).toEqual(expected);
});

test("FSP2. 묶음의 인물은 모두 서버 인물 표에 있다(이야기 다섯 · 친구 넷)", async () => {
  const missing = (
    await db.admin.query(
      `select distinct p.character_id from companion.story_pool p
       left join companion.characters c on c.id = p.character_id where c.id is null`,
    )
  ).rows;
  expect(missing).toEqual([]);
  const characters = (
    await db.admin.query("select count(distinct character_id)::int as n from companion.story_pool")
  ).rows[0].n as number;
  expect(characters).toBe(9);
});
