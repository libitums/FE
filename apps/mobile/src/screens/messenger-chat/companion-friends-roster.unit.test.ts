import { describe, expect, test } from "vitest";

import friendsJson from "../../../../../docs/content/companion-friends.json";
import { COMPANION_CHARACTERS } from "./companion-roster";

// `unit` 계층(CF-U1 ~ U5): 일반 인물 넷의 정본은 `docs/content/companion-friends.json`(ADR-0163 D1) — 앱 인물 표가 그와 어긋나면
// 실패합니다. 이야기 다섯의 MBTI도 같은 파일의 `storyProfiles`입니다.

type Lines = { ko: string[]; en: string[] };
type Friend = {
  id: string;
  name: string;
  age: number;
  job: { ko: string; en: string };
  mbti: string;
  bio: { ko: string; en: string };
  firstMessage: Lines;
};
const json = friendsJson as unknown as {
  friends: Friend[];
  storyProfiles: Record<string, { mbti: string } | string>;
};
const LANGS = ["en", "es", "id", "ja", "vi"];
const byId = (id: string) => COMPANION_CHARACTERS.find((c) => c.id === id);

describe("추천 친구 JSON ↔ 앱 인물 표", () => {
  test("CF-U1 일반 인물은 JSON의 넷과 같은 id · 순서 · 이름이고 kind general · 해금 규칙 없음", () => {
    const general = COMPANION_CHARACTERS.filter((c) => c.kind === "general");
    expect(general.map((c) => [c.id, c.name])).toEqual(json.friends.map((f) => [f.id, f.name]));
    for (const c of general) {
      expect(c.unlockEpisodeId, c.id).toBeNull();
      expect(c.unlockEpisode, c.id).toBeNull();
      expect(c.earlyAccess, c.id).toBeNull();
    }
  });

  test("CF-U2 첫 말풍선(시트 · 목록 미리보기)은 firstMessage의 첫 줄 ko · en", () => {
    for (const f of json.friends) {
      const c = byId(f.id);
      expect(c?.sheetOpening, f.id).toEqual({ ko: f.firstMessage.ko[0], en: f.firstMessage.en[0] });
      expect(c?.firstLine, f.id).toBe(f.firstMessage.ko[0]);
    }
  });

  test("CF-U3 사실 줄 — 나이 · 직업(en) · MBTI가 JSON과 같고, 소개 en = bio.en", () => {
    for (const f of json.friends) {
      const c = byId(f.id);
      expect(c?.profile.age, f.id).toBe(f.age);
      expect(c?.profile.job?.en, f.id).toBe(f.job.en);
      expect(c?.profile.mbti, f.id).toBe(f.mbti);
      expect(c?.intro?.en, f.id).toBe(f.bio.en);
    }
  });

  test("CF-U4 그림 · 목소리 견본 경로 — 이야기 인물과 같은 `<id>-casual`, 견본은 일반 인물만", () => {
    for (const f of json.friends) {
      expect(byId(f.id)?.avatarPath).toBe(`content/images/profiles/${f.id}-casual.webp`);
      expect(byId(f.id)?.profile.voiceSamplePath).toBe(`content/audio/companion/${f.id}-intro.mp3`);
    }
    for (const c of COMPANION_CHARACTERS.filter((x) => x.kind === "story")) {
      expect(c.profile.voiceSamplePath, c.id).toBeNull();
    }
  });

  test("CF-U5 이야기 다섯의 MBTI = storyProfiles, 나이 · 직업이 있고, 소개 · 직업 · 태그는 다섯 언어", () => {
    for (const c of COMPANION_CHARACTERS) {
      if (c.kind === "story") {
        const entry = json.storyProfiles[c.id];
        expect(typeof entry === "object" ? entry.mbti : null, c.id).toBe(c.profile.mbti);
        expect(c.profile.age, c.id).not.toBeNull();
      }
      expect(Object.keys(c.profile.job ?? {}).sort(), c.id).toEqual(LANGS);
      expect(Object.keys(c.intro ?? {}).sort(), c.id).toEqual(LANGS);
      for (const tag of c.tags) expect(Object.keys(tag).sort(), `${c.id} ${tag.en}`).toEqual(LANGS);
    }
  });
});
