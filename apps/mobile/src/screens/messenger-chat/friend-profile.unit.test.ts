import { describe, expect, test } from "vitest";

import { messengerChatSuggestedEn } from "../../lib/ui-copy-en-chat-suggested";
import { messengerChatSuggestedJa } from "../../lib/ui-copy-ja-chat-suggested";
import { COMPANION_CATALOG } from "./companion-roster";
import type { FriendFacts } from "./friend-catalog.contract";
import { ageTextOf, profileFactsOf, roomProfileModelOf, voiceUrlOf } from "./friend-profile";

// `unit` 계층(FP-U1 ~ U6): 사실 줄(있는 조각만 · 언어 칸 없으면 en) · 견본 주소 · 방 머리 프로필 모델(열린 방만, 읽기 전용).

const en = messengerChatSuggestedEn.profile;
const ja = messengerChatSuggestedJa.profile;
const facts = (patch: Partial<FriendFacts> = {}): FriendFacts => ({
  age: 28,
  job: { en: "Tattoo artist", ja: "タトゥーアーティスト" },
  mbti: "ENTP",
  voiceSamplePath: null,
  ...patch,
});

describe("사실 줄", () => {
  test("FP-U1 나이 · 직업 · MBTI를 이어 붙인다(en · ja)", () => {
    expect(profileFactsOf(facts(), en, "en")).toBe("Age 28 · Tattoo artist · ENTP");
    expect(profileFactsOf(facts(), ja, "ja")).toBe("28歳 · タトゥーアーティスト · ENTP");
  });

  test("FP-U2 없는 조각은 뺀다 — 셋 다 없으면 null(줄 없음)", () => {
    expect(profileFactsOf(facts({ age: null }), en, "en")).toBe("Tattoo artist · ENTP");
    expect(profileFactsOf(facts({ job: null }), en, "en")).toBe("Age 28 · ENTP");
    expect(profileFactsOf(facts({ mbti: null }), en, "en")).toBe("Age 28 · Tattoo artist");
    expect(profileFactsOf(facts({ age: null, job: null, mbti: "  " }), en, "en")).toBeNull();
  });

  test("FP-U3 직업 칸이 없는 언어 · th · my는 en 직업으로 접는다", () => {
    expect(profileFactsOf(facts(), messengerChatSuggestedEn.profile, "vi")).toBe(
      "Age 28 · Tattoo artist · ENTP",
    );
    expect(profileFactsOf(facts(), en, "th")).toBe("Age 28 · Tattoo artist · ENTP");
  });

  test("FP-U4 나이 표기 — 수 · 나이대(30s) · 범위(25-26), 모르는 모양 · 0은 뺀다", () => {
    expect(ageTextOf(69, en)).toBe("Age 69");
    expect(ageTextOf("30s", en)).toBe("30s");
    expect(ageTextOf("30s", ja)).toBe("30代");
    expect(ageTextOf("25-26", en)).toBe("Age 25–26");
    expect(ageTextOf("25-26", ja)).toBe("25〜26歳");
    expect(ageTextOf("thirty", en)).toBeNull();
    expect(ageTextOf(0, en)).toBeNull();
    expect(ageTextOf(null, en)).toBeNull();
  });

  test("FP-U4 이야기 인물의 실제 사실 줄 — 덕수쌤 나이대 · 미나 범위", () => {
    const of = (id: string) => COMPANION_CATALOG.characters.find((c) => c.id === id)?.profile;
    expect(profileFactsOf(of("duksu") ?? facts(), en, "en")).toBe("30s · Korean teacher · ENFJ");
    expect(profileFactsOf(of("mina") ?? facts(), en, "en")).toBe(
      "Age 25–26 · Backpacker from Switzerland · ESFJ",
    );
  });
});

describe("견본 주소 · 방 프로필", () => {
  const media = (path: string) => `https://cdn/${path}`;

  test("FP-U5 견본 주소 — 경로 · 주소 해석기가 있을 때만", () => {
    const path = "content/audio/companion/seoyeon-intro.mp3";
    expect(voiceUrlOf(facts({ voiceSamplePath: path }), media)).toBe(`https://cdn/${path}`);
    expect(voiceUrlOf(facts({ voiceSamplePath: path }), undefined)).toBeNull();
    expect(voiceUrlOf(facts({ voiceSamplePath: path }), () => null)).toBeNull();
    expect(voiceUrlOf(facts(), media)).toBeNull();
  });

  test("FP-U6 열린 방이면 아홉 모두 읽기 전용 프로필 — 닫힌 방 · 방 없음 · 카탈로그 밖은 null", () => {
    for (const character of COMPANION_CATALOG.characters) {
      const model = roomProfileModelOf({
        catalog: COMPANION_CATALOG,
        counterpart: { id: character.id, avatarUrl: "https://img/a.webp" },
        access: { kind: "open" },
        mediaUrlOf: media,
      });
      expect(model?.mode, character.id).toBe("profile");
      expect(model?.status, character.id).toBe("addable");
      expect(model?.offer, character.id).toBeNull();
      expect(model?.avatarUrl, character.id).toBe("https://img/a.webp");
      expect(model?.voiceUrl, character.id).toBe(
        character.kind === "general"
          ? `https://cdn/content/audio/companion/${character.id}-intro.mp3`
          : null,
      );
    }
    const base = { catalog: COMPANION_CATALOG, counterpart: { id: "mina", avatarUrl: null } };
    expect(
      roomProfileModelOf({ ...base, access: { kind: "locked", unlockEpisode: 3 } }),
    ).toBeNull();
    expect(roomProfileModelOf({ ...base, access: null })).toBeNull();
    expect(
      roomProfileModelOf({
        ...base,
        counterpart: { id: "stranger", avatarUrl: null },
        access: { kind: "open" },
      }),
    ).toBeNull();
  });
});
