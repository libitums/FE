import { describe, expect, test } from "vitest";

import friendsJson from "../../../../../docs/content/companion-friends.json";
import { PROFILE_TRANSLATION_IDS, profileTextFor } from "./companion-profile-l10n";
import { COMPANION_CHARACTERS, companionCharacterOf, companionSeed } from "./companion-roster";

// `unit` 계층(RF-U1 ~ U6): 추천 친구의 정본은 docs/content/companion-friends.json이다 — 앱 인물 표가 그와 어긋나면 실패한다
// (id · 이름 · 첫 말 첫 말풍선 · MBTI · 로맨스 등급 · 나이 · 직업 · 소개). 이야기 인물 다섯의 MBTI는 같은 JSON의 storyProfiles.

type FriendJson = {
  id: string;
  name: string;
  age: number;
  job: { ko: string; en: string };
  mbti: string;
  romanceTier: "open" | "standard";
  bio: { ko: string; en: string };
  firstMessage: { ko: string[]; en: string[] };
};
const json = friendsJson as unknown as {
  friends: FriendJson[];
  storyProfiles: Record<string, { mbti: string } | string>;
};
const friendRows = COMPANION_CHARACTERS.filter((c) => c.kind === "friend");
const storyRows = COMPANION_CHARACTERS.filter((c) => c.kind === "story");
const LANGUAGES = ["en", "es", "id", "ja", "vi"] as const;

describe("친구 JSON ↔ 인물 표", () => {
  test("RF-U1 추천 친구는 JSON과 같은 넷 · 같은 순서 · 같은 이름이다", () => {
    expect(friendRows.map((c) => [c.id, c.name])).toEqual(json.friends.map((f) => [f.id, f.name]));
  });

  test("RF-U2 시트 첫 말 · 목록 첫 인사는 firstMessage 첫 말풍선이다", () => {
    for (const friend of json.friends) {
      const row = companionCharacterOf(friend.id);
      expect(row?.sheetOpening, friend.id).toEqual({
        ko: friend.firstMessage.ko[0],
        en: friend.firstMessage.en[0],
      });
      expect(row?.firstLine, friend.id).toBe(friend.firstMessage.ko[0]);
    }
  });

  test("RF-U3 MBTI · 로맨스 등급 · 나이 · 직업 · 소개가 JSON과 같다 — 해금 조건은 없다", () => {
    for (const friend of json.friends) {
      const row = companionCharacterOf(friend.id);
      expect(row?.profile.mbti, friend.id).toBe(friend.mbti);
      expect(row?.romanceTier, friend.id).toBe(friend.romanceTier);
      expect(row?.profile.age, friend.id).toEqual({ kind: "years", value: friend.age });
      expect(row?.profile.job, friend.id).toEqual(friend.job);
      expect(row?.profile.bio, friend.id).toEqual(friend.bio);
      expect(row?.unlockEpisodeId, friend.id).toBeNull();
      expect(row?.unlockEpisode, friend.id).toBeNull();
    }
  });

  test("RF-U4 이야기 인물 다섯의 MBTI는 storyProfiles와 같고, 로맨스 등급은 없다(null)", () => {
    const profiles = Object.entries(json.storyProfiles).filter(([key]) => key !== "$comment");
    expect(storyRows.map((c) => c.id).sort()).toEqual(profiles.map(([id]) => id).sort());
    for (const [id, value] of profiles) {
      const row = companionCharacterOf(id);
      expect(row?.profile.mbti, id).toBe((value as { mbti: string }).mbti);
      expect(row?.romanceTier, id).toBeNull();
    }
  });

  test("RF-U5 아홉 인물 모두 프로필(나이 · 직업 · MBTI · 소개)과 다섯 화면 언어 번역이 있다", () => {
    expect([...PROFILE_TRANSLATION_IDS].sort()).toEqual(
      COMPANION_CHARACTERS.map((c) => c.id).sort(),
    );
    for (const character of COMPANION_CHARACTERS) {
      expect(character.profile.mbti, character.id).toMatch(/^[EI][NS][TF][JP]$/);
      expect(character.profile.job.ko.trim(), character.id).not.toBe("");
      expect(character.profile.bio.ko.trim(), character.id).not.toBe("");
      for (const language of LANGUAGES) {
        const text = profileTextFor(character.id, language);
        expect(text?.job.trim(), `${character.id} ${language}`).not.toBe("");
        expect(text?.bio.trim(), `${character.id} ${language}`).not.toBe("");
      }
    }
    expect(profileTextFor("seoyeon", "en")).toEqual({
      job: "Tattoo artist & illustrator",
      bio: "I do tattoos in Seongsu. Art talk, any talk — all good.",
    });
    expect(profileTextFor("nobody", "en")).toBeNull();
  });

  test("RF-U6 아바타는 다른 인물과 같은 프로필 그림 자리이고, 친구 방은 추가 전 addable이다", () => {
    for (const row of friendRows) {
      expect(row.avatarPath).toBe(`content/images/profiles/${row.id}.webp`);
    }
    const rooms = companionSeed().rooms.filter((room) =>
      friendRows.some((r) => r.id === room.roomId),
    );
    expect(rooms.map((room) => room.access)).toEqual(friendRows.map(() => ({ kind: "addable" })));
  });
});
