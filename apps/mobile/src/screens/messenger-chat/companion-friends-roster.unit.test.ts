import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { COMPANION_FRIENDS } from "./companion-friends-roster";
import { COMPANION_CATALOG, COMPANION_CHARACTERS, companionSeed } from "./companion-roster";

// `unit` 계층(FA1 ~ FA3): 앱 인물 표가 정본 `docs/content/companion-friends.json`과 같다(ADR-0164 D1 — 서버 FR1과 같은 약속).

type Lines = { readonly ko: string; readonly en: string };
type SourceFriend = {
  readonly id: string;
  readonly name: string;
  readonly age: number;
  readonly job: Lines;
  readonly mbti: string;
  readonly romanceTier: "open" | "standard";
  readonly bio: Lines;
  readonly firstMessage: { readonly ko: readonly string[]; readonly en: readonly string[] };
};
type Source = {
  readonly friends: readonly SourceFriend[];
  readonly storyProfiles: Readonly<Record<string, { readonly mbti: string } | string>>;
};

const source = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../docs/content/companion-friends.json"), "utf8"),
) as Source;
const tagTexts = (id: string, language: "en" | "ja"): readonly string[] => {
  const found = COMPANION_CATALOG.characters.find((c) => c.id === id);
  return (found?.tags ?? []).map((tag) => (language === "en" ? tag.en : (tag.ja ?? tag.en)));
};

describe("FA1 추천 친구 넷이 정본과 같다", () => {
  test("id · 이름 · 순서 · 수위", () => {
    expect(COMPANION_FRIENDS.map((f) => [f.id, f.name, f.romanceTier])).toEqual(
      source.friends.map((f) => [f.id, f.name, f.romanceTier]),
    );
  });

  test.each(source.friends.map((f) => [f.id, f] as const))(
    "%s — 일반 인물 · 소개(bio) · 첫 말 · 태그(직업 · 나이 · MBTI)",
    (id, f) => {
      const friend = COMPANION_FRIENDS.find((candidate) => candidate.id === id);
      expect(friend?.kind).toBe("general");
      expect(friend?.unlockEpisodeId).toBeNull();
      expect(friend?.earlyAccess).toBeNull();
      expect(friend?.intro?.en).toBe(f.bio.en);
      expect(friend?.sheetOpening?.ko).toBe(f.firstMessage.ko.join(" "));
      expect(friend?.sheetOpening?.en).toBe(f.firstMessage.en.join(" "));
      expect(friend?.firstLine).toBe(f.firstMessage.ko[0]);
      expect(tagTexts(id, "en")).toEqual([f.job.en, `${f.age} years old`, f.mbti]);
      expect(tagTexts(id, "ja")[1]).toBe(`${f.age}歳`);
      expect(friend?.avatarPath).toBe(`content/images/profiles/${id}-casual.webp`);
    },
  );

  test("모든 언어 칸(es · id · ja · vi)이 소개 · 직업에 있다", () => {
    for (const friend of COMPANION_FRIENDS) {
      for (const line of [friend.intro, friend.tags[0]]) {
        expect(Object.keys(line ?? {}).sort()).toEqual(["en", "es", "id", "ja", "vi"]);
      }
    }
  });
});

// FA4 — 시트 첫 말의 뜻풀이도 화면 언어로 선다(2026-11-19 l10n 점검: es · id · ja · vi 학습자가 영어 뜻풀이를 봤다).
// 정본 JSON은 ko · en만 가지므로(소개 · 직업과 같이) 다른 언어 칸은 앱 표가 정본입니다. 영어를 베껴 두지 않습니다.
describe("FA4 시트 첫 말의 뜻풀이가 모든 화면 언어에 있다", () => {
  const withOpening = COMPANION_CATALOG.characters.filter((c) => c.sheetOpening !== null);
  test.each(withOpening.map((c) => [c.id, c] as const))(
    "%s — es · id · ja · vi 칸이 있고 영어와 다르다",
    (_id, character) => {
      const opening = character.sheetOpening;
      for (const language of ["es", "id", "ja", "vi"] as const) {
        const line = opening?.[language] ?? "";
        expect(line, language).not.toBe("");
        expect(line, language).not.toBe(opening?.en);
      }
    },
  );
});

describe("FA2 이야기 인물 다섯의 MBTI(storyProfiles)", () => {
  test.each(COMPANION_CHARACTERS.map((c) => c.id))("%s — 태그 MBTI 하나", (id) => {
    const profile = source.storyProfiles[id];
    const mbti = typeof profile === "object" ? profile.mbti : null;
    expect(tagTexts(id, "en")).toEqual([mbti]);
  });
});

describe("FA3 서버 방 씨앗 · 카탈로그", () => {
  test("카탈로그는 이야기 다섯 + 친구 넷, 씨앗에 친구 방이 에피소드 없는 잠긴 방(0)으로 선다", () => {
    expect(COMPANION_CATALOG.characters.map((c) => c.id)).toEqual([
      "duksu",
      "yoonkyung",
      "mina",
      "doyun",
      "jaemin",
      "seoyeon",
      "haejun",
      "daeun",
      "geonwoo",
    ]);
    const seeded = companionSeed().rooms.find((room) => room.roomId === "seoyeon");
    expect(seeded?.access).toEqual({ kind: "locked", unlockEpisode: 0 });
  });
});
