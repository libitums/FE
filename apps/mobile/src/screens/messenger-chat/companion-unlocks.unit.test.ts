import { describe, expect, test } from "vitest";

import unlocks from "../../../../../docs/content/companion-unlocks.json";
import { COMPANION_CHARACTERS } from "./companion-roster";
import { CHARACTER_UNLOCKS } from "./new-friend";

// `unit` 계층(CU-U1 ~ U2 · U4): 인물 해금 지점의 정본은 기획 해금 JSON(docs/content/companion-unlocks.json, 2026-11-13 사용자 결정
// 「해금 json 기준으로」)입니다 — 앱 표(해금 표 · 인물 표)가 그와 어긋나면 실패합니다.

type Unlock = { kind: "default" } | { kind: "episode_complete"; episode: string; afterCut: string };
type FirstMessage = { ko: string[]; en: string[] };
const characters = (
  unlocks as { characters: { id: string; unlock: Unlock; firstMessage?: FirstMessage }[] }
).characters;
const ordinalOf = (episodeId: string) => Number(/^u(\d+)-/.exec(episodeId)?.[1]);

describe("해금 JSON ↔ 앱 표", () => {
  test("CU-U1 에피소드 완료로 여는 인물마다 해금 표 한 줄 — 같은 에피소드 · 같은 방", () => {
    const expected = characters
      .filter((c) => c.unlock.kind === "episode_complete")
      .map((c) => ({ characterId: c.id, episodeId: (c.unlock as { episode: string }).episode }))
      .sort((a, b) => a.characterId.localeCompare(b.characterId));
    const actual = CHARACTER_UNLOCKS.map((e) => ({
      characterId: e.characterId,
      episodeId: e.episodeId,
    })).sort((a, b) => a.characterId.localeCompare(b.characterId));
    expect(actual).toEqual(expected);
    for (const entry of CHARACTER_UNLOCKS) expect(entry.roomId).toBe(entry.characterId);
  });

  test("CU-U2 인물 표의 해금 에피소드 · 번호가 JSON과 같고, 기본 인물은 처음부터 열림", () => {
    for (const c of characters) {
      const roster = COMPANION_CHARACTERS.find((r) => r.id === c.id);
      expect(roster, c.id).toBeDefined();
      if (c.unlock.kind === "default") {
        expect(roster?.unlockEpisodeId).toBeNull();
        expect(roster?.unlockEpisode).toBeNull();
      } else {
        expect(roster?.unlockEpisodeId).toBe(c.unlock.episode);
        expect(roster?.unlockEpisode).toBe(ordinalOf(c.unlock.episode));
      }
    }
  });

  test("CU-U4 새 친구 시트의 첫 말은 해금 선톡의 첫 말풍선과 같다 — 기본 인물은 시트가 없다", () => {
    for (const c of characters) {
      const roster = COMPANION_CHARACTERS.find((r) => r.id === c.id);
      if (c.unlock.kind === "default") {
        expect(c.firstMessage?.ko.length, c.id).toBeGreaterThan(0);
        expect(roster?.sheetOpening).toBeNull();
        continue;
      }
      expect(c.firstMessage?.ko.length, c.id).toBeGreaterThan(0);
      expect(roster?.sheetOpening, c.id).toEqual({
        ko: c.firstMessage?.ko[0],
        en: c.firstMessage?.en[0],
      });
    }
  });

  test("CU-U5 목록의 첫 인사 미리보기는 해금 선톡의 첫 말풍선과 같다 — 기본 인물도", () => {
    for (const c of characters) {
      const roster = COMPANION_CHARACTERS.find((r) => r.id === c.id);
      expect(roster?.firstLine, c.id).toBe(c.firstMessage?.ko[0]);
    }
  });
});
