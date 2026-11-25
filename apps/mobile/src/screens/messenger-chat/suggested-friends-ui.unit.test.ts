import { expect, test } from "vitest";

import { modelOfMetFriend } from "./suggested-friends-ui";
import { general } from "./suggested-friends.test-support";

// `unit` 계층(FS-U22): 스토리 보기 아바타의 프로필 시트 모델 — 이미 친구(열린 방)인 인물(ADR-0178 「아바타 → 프로필 시트」).

const who = { id: "haejun", name: "해준", avatarUrl: "https://img/haejun.webp" };

test("FS-U22. 카탈로그 인물이면 그 소개 · 태그 · 첫 말을 쓰고, 이름 · 얼굴은 방의 것, 상태 added · 제안 없음", () => {
  const profile = general("haejun", {
    name: "Haejun",
    tags: [{ en: "Music" }],
    earlyAccess: { price: 300, endsAt: null },
  });
  const model = modelOfMetFriend(profile, who);
  expect(model.status).toBe("added");
  expect(model.offer).toBeNull();
  expect(model.avatarUrl).toBe("https://img/haejun.webp");
  expect(model.character).toMatchObject({
    id: "haejun",
    name: "해준",
    intro: profile.intro,
    tags: [{ en: "Music" }],
    sheetOpening: profile.sheetOpening,
  });
});

test("FS-U22. 카탈로그에 없으면(픽스처 방 · 덕수쌤 같은 방 인물) 이름 · 얼굴만 — 소개 · 태그 · 첫 말 없음", () => {
  const model = modelOfMetFriend(null, { ...who, avatarUrl: null });
  expect(model).toEqual({
    character: {
      id: "haejun",
      name: "해준",
      avatarPath: null,
      kind: "story",
      unlockEpisodeId: null,
      unlockEpisode: null,
      intro: null,
      tags: [],
      category: null,
      sheetOpening: null,
      earlyAccess: null,
    },
    avatarUrl: null,
    status: "added",
    offer: null,
  });
});
