import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { COMPANION_CATALOG } from "./companion-roster";

// `unit` 계층(FS-U9): 친구 스토리 묶음의 정본(`docs/content/friend-stories.json`, ADR-0177 D1)이 앱 콘텐츠와 맞는다 —
// 그림은 에피소드 JSON이 쓰는 버킷 경로(버킷에 있음이 보장된 그림)만, 단어는 그 에피소드의 단어, 인물은 카탈로그 인물.

type PoolStory = {
  id: string;
  characterId: string;
  imagePath: string;
  line: { ko: string; roman: string; meaning: Record<string, string> };
  word: { episodeId: string; ref: string } | null;
  replies: string[];
};

const pool = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../docs/content/friend-stories.json"), "utf8"),
) as { stories: PoolStory[] };
const episodesDir = resolve(process.cwd(), "content/episodes");
const episodes = new Map(
  readdirSync(episodesDir)
    .filter((name) => /^u\d+-[a-z0-9-]+\.json$/.test(name))
    .map((name) => [name.replace(/\.json$/, ""), readFileSync(resolve(episodesDir, name), "utf8")]),
);
const LANGUAGES = ["en", "es", "id", "ja", "vi", "th", "my"];

describe("FS-U9 스토리 묶음 정합", () => {
  test("27줄 · id 유일 · 인물마다 셋 · 카탈로그 인물만", () => {
    expect(pool.stories).toHaveLength(27);
    expect(new Set(pool.stories.map((s) => s.id)).size).toBe(27);
    const ids = new Set(COMPANION_CATALOG.characters.map((c) => c.id));
    const perCharacter = new Map<string, number>();
    for (const s of pool.stories) {
      expect(ids.has(s.characterId)).toBe(true);
      perCharacter.set(s.characterId, (perCharacter.get(s.characterId) ?? 0) + 1);
    }
    expect([...perCharacter.values()].every((n) => n === 3)).toBe(true);
  });

  test("그림은 에피소드 JSON이 쓰는 경로", () => {
    const all = [...episodes.values()].join("\n");
    for (const s of pool.stories) expect(all.includes(`"${s.imagePath}"`), s.id).toBe(true);
  });

  test("단어는 그 에피소드의 단어 카드 ref이고 한 줄에 그 낱말이 들어 있다", () => {
    for (const s of pool.stories) {
      if (s.word === null) continue;
      const episode = episodes.get(s.word.episodeId);
      expect(episode, s.id).toBeDefined();
      const parsed = JSON.parse(episode ?? "{}") as { words?: { id: string; ko: string }[] };
      const word = parsed.words?.find((w) => w.id === s.word?.ref);
      expect(word, s.id).toBeDefined();
      expect(s.word.ref.startsWith("voca:"), s.id).toBe(true);
      // 용언(-다)은 어간으로 본다 — 「좋다」 → 「좋」.
      const stem = (word?.ko ?? "").replace(/다$/, "").slice(0, 1);
      expect(s.line.ko.includes(stem), `${s.id} ${word?.ko}`).toBe(true);
    }
  });

  test("뜻은 일곱 언어 · 로마자 · 칩 1 ~ 3개", () => {
    for (const s of pool.stories) {
      for (const language of LANGUAGES)
        expect(s.line.meaning[language]?.trim(), `${s.id} ${language}`).toBeTruthy();
      expect(s.line.roman.trim(), s.id).toBeTruthy();
      expect(s.replies.length, s.id).toBeGreaterThanOrEqual(1);
      expect(s.replies.length, s.id).toBeLessThanOrEqual(3);
    }
  });
});
