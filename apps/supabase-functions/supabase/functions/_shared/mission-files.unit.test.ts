import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { parseMission, validateMission } from "./mission-definition.ts";

// 미션 파일(정본)이 계약을 지나고, 목표 표현 · 진입 대사가 실제 에피소드 콘텐츠에 있는지 봅니다. 콘텐츠의 id가 바뀌면 여기서 빨개집니다.

const at = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const missionsDir = at("./missions/");
const episodesDir = at("../../../../mobile/content/episodes/");
const castSql = readFileSync(
  at("../../migrations/20261111120000_companion_cast_memory.sql"),
  "utf8",
);

const files = readdirSync(missionsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();
const read = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

type Episode = {
  unit_id: string;
  dialogue: { role: string; text: { ko: string; roman: string; en: string } }[];
  patterns?: { id: string; ko: string; gloss_en: string }[];
  words?: { id: string; ko: string; gloss_en: string }[];
};

describe("미션 파일", () => {
  test("MF1. 1판의 미션 둘이 있다 — 6화(캐스트 도윤) · 1화(단역)", () => {
    expect(files).toEqual(["u01-water.json", "u06-cafe.json"]);
    const cafe = parseMission(read(`${missionsDir}u06-cafe.json`));
    const water = parseMission(read(`${missionsDir}u01-water.json`));
    expect(cafe.counterpart.characterId).toBe("doyun");
    expect(water.counterpart.characterId).toBeUndefined();
    expect(water.counterpart.base).toBeUndefined();
  });

  test.each(files)("MF2. %s는 검사를 지나고 id가 파일 이름과 같다", (name) => {
    const result = validateMission(read(`${missionsDir}${name}`));
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.ok ? `${result.mission.id}.json` : null).toBe(name);
  });

  test.each(files)("MF3. %s의 목표 표현 · 진입 대사가 그 에피소드 콘텐츠에 있다", (name) => {
    const mission = parseMission(read(`${missionsDir}${name}`));
    const episode = read(`${episodesDir}${mission.episodeId}.json`) as Episode;
    expect(episode.unit_id).toBe(mission.episodeId);
    const expressions = new Map(
      [...(episode.patterns ?? []), ...(episode.words ?? [])].map((entry) => [entry.id, entry]),
    );
    for (const target of mission.targetExpressions) {
      const entry = expressions.get(target.id);
      expect(entry, target.id).toBeDefined();
      expect(target.ko).toBe(entry?.ko);
      expect(target.meaning).toBe(entry?.gloss_en);
    }
    // 진입 대사는 본편의 상대역 대사 그대로다(위키 03).
    expect(
      episode.dialogue.some(
        (line) =>
          line.role === "counterpart" &&
          line.text.ko === mission.opening.ko &&
          line.text.roman === mission.opening.roman &&
          line.text.en === mission.opening.en,
      ),
    ).toBe(true);
  });

  test("MF4. 도윤의 바탕 네 칸은 캐스트 마이그레이션의 카드 값 그대로다", () => {
    const cafe = parseMission(read(`${missionsDir}u06-cafe.json`));
    const base = cafe.counterpart.base;
    expect(base).toBeDefined();
    for (const [key, value] of Object.entries(base ?? {})) {
      expect(castSql, key).toContain(`'${key}', '${value}'`);
    }
  });
});
