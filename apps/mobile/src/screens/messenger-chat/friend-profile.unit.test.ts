import { describe, expect, test } from "vitest";

import { COMPANION_FRIENDS } from "./companion-friends-roster";
import { COMPANION_CATALOG, COMPANION_CHARACTERS } from "./companion-roster";
import {
  roomProfileModelOf,
  roomProfileOpenedEvent,
  voicePlayedEvent,
  voiceUrlOf,
  withVoiceUrl,
} from "./friend-profile";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import { friend, general } from "./suggested-friends.test-support";

// `unit` 계층(FP-U1 ~ U5): 프로필 시트 추가분(ADR-0164 앱 추가 2026-11-20) — 목소리 견본 경로는 추천 친구 넷만, 대화방 머리 프로필은
// 열린 방에서만(아홉 모두 · 읽기 전용 모델), 잠긴 인물은 새로 드러나는 것이 없다, 제품 이벤트 모양.

const url = (path: string) => `https://cdn.test/${path}`;
const OPEN = { kind: "open" } as const;
const LOCKED = { kind: "locked", unlockEpisode: 9 } as const;
const counterpart = (id: string) => ({ id, name: id, avatarUrl: `https://img/${id}.webp` });

describe("FP-U1 인물 표의 목소리 견본 경로", () => {
  test("추천 친구 넷은 content/audio/companion/<id>-intro.mp3", () => {
    expect(COMPANION_FRIENDS.map((entry) => [entry.id, entry.voiceSamplePath])).toEqual([
      ["seoyeon", "content/audio/companion/seoyeon-intro.mp3"],
      ["haejun", "content/audio/companion/haejun-intro.mp3"],
      ["daeun", "content/audio/companion/daeun-intro.mp3"],
      ["geonwoo", "content/audio/companion/geonwoo-intro.mp3"],
    ]);
  });

  test("이야기 다섯은 null", () => {
    expect(COMPANION_CHARACTERS).toHaveLength(5);
    for (const character of COMPANION_CHARACTERS) {
      expect(character.voiceSamplePath, character.id).toBeNull();
    }
  });
});

describe("FP-U2 견본 주소", () => {
  test("경로 · 해석기가 있으면 주소, 하나라도 없으면 null", () => {
    const seoyeon = general("seoyeon", {
      voiceSamplePath: "content/audio/companion/seoyeon-intro.mp3",
    });
    expect(voiceUrlOf(seoyeon, url)).toBe(
      "https://cdn.test/content/audio/companion/seoyeon-intro.mp3",
    );
    expect(voiceUrlOf(seoyeon, undefined)).toBeNull();
    expect(voiceUrlOf(seoyeon, () => null)).toBeNull();
    expect(voiceUrlOf(friend("mina", { voiceSamplePath: null }), url)).toBeNull();
    expect(voiceUrlOf(friend("mina"), url)).toBeNull(); // 칸이 없는 옛 데이터
  });

  test("줄 · 친구 찾기 모델 — 추가 가능이면 얹고, 잠김이면 얹지 않는다", () => {
    const character = general("daeun", {
      voiceSamplePath: "content/audio/companion/daeun-intro.mp3",
    });
    const model: SuggestedFriendSheetModel = {
      character,
      avatarUrl: null,
      status: "addable",
      offer: null,
    };
    expect(withVoiceUrl(model, url).voiceUrl).toBe(
      "https://cdn.test/content/audio/companion/daeun-intro.mp3",
    );
    expect(withVoiceUrl({ ...model, status: "locked" }, url).voiceUrl).toBeNull();
  });
});

describe("FP-U3 대화방 머리 프로필", () => {
  test("열린 방이면 아홉 모두 — 제안 없음 · 아바타는 방 그림 · 견본은 넷만", () => {
    const ids = COMPANION_CATALOG.characters.map((character) => character.id);
    expect(ids).toHaveLength(9);
    for (const id of ids) {
      const model = roomProfileModelOf({
        catalog: COMPANION_CATALOG,
        counterpart: counterpart(id),
        access: OPEN,
        mediaUrlOf: url,
      });
      expect(model?.character.id, id).toBe(id);
      expect(model?.offer, id).toBeNull();
      expect(model?.status, id).toBe("addable");
      expect(model?.avatarUrl, id).toBe(`https://img/${id}.webp`);
      const friendOfFour = COMPANION_FRIENDS.some((entry) => entry.id === id);
      expect(model?.voiceUrl ?? null, id).toBe(
        friendOfFour ? `https://cdn.test/content/audio/companion/${id}-intro.mp3` : null,
      );
    }
  });

  test("잠긴 방 · 방 없음 · 카탈로그에 없는 인물은 null(누를 수 없음 — 새 노출 없음)", () => {
    const base = { catalog: COMPANION_CATALOG, mediaUrlOf: url };
    expect(
      roomProfileModelOf({ ...base, counterpart: counterpart("mina"), access: LOCKED }),
    ).toBeNull();
    expect(
      roomProfileModelOf({ ...base, counterpart: counterpart("mina"), access: null }),
    ).toBeNull();
    expect(
      roomProfileModelOf({ ...base, counterpart: counterpart("nobody"), access: OPEN }),
    ).toBeNull();
  });

  test("해석기가 없으면 견본 없이 연다", () => {
    const model = roomProfileModelOf({
      catalog: COMPANION_CATALOG,
      counterpart: counterpart("seoyeon"),
      access: OPEN,
    });
    expect(model?.voiceUrl).toBeNull();
  });
});

describe("FP-U4 제품 이벤트", () => {
  test("방에서 연 프로필 = suggested_friend_opened { from: room }", () => {
    expect(roomProfileOpenedEvent(general("seoyeon"))).toEqual({
      name: "suggested_friend_opened",
      surface: "chat",
      characterId: "seoyeon",
      kind: "general",
      from: "room",
    });
    expect(roomProfileOpenedEvent(friend("mina")).kind).toBe("story");
  });

  test("견본 재생 = friend_voice_sample_played { characterId }", () => {
    expect(voicePlayedEvent("daeun")).toEqual({
      name: "friend_voice_sample_played",
      surface: "chat",
      characterId: "daeun",
    });
  });
});
