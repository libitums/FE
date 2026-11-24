import { expect, test } from "vitest";

import {
  myStoriesResponseSchema,
  myStoryRequestSchema,
  myStoryResponseSchema,
  postMyStoryRequestSchema,
  postMyStoryResultSchema,
} from "./my-stories";

// 내 스토리 RPC 모양(ADR-0191 D12) — 서버 통합 테스트(my-stories.integration.test.ts)가 돌려주는 모양과 같은 예입니다.
const story = {
  id: "7f3f6a0e-6c0e-4f0e-9a43-0d8f5c3b9a10",
  kind: "card",
  word: { episodeId: "u02-arrival", ref: "voca:arrive" },
  ko: "도착하다",
  roman: "dochakada",
  meaning: "to arrive",
  example: { ko: "서울에 도착했어!", meaning: "I arrived in Seoul!" },
  postedAt: "2026-11-24T03:00:00.000Z",
  expiresAt: "2026-11-25T03:00:00.000Z",
  reactions: [
    {
      id: "0b1f2a7c-5a0e-4b61-8f0a-52b4f2d7c001",
      characterId: "mina",
      messageId: "0b1f2a7c-5a0e-4b61-8f0a-52b4f2d7c002",
      text: "드디어 도착했구나!",
      meaning: "You finally arrived!",
      at: "2026-11-24T03:02:10.000Z",
    },
  ],
  seenBy: [{ characterId: "mina", at: "2026-11-24T03:01:20.000Z" }],
};
const window = { slot: "day", day: "2026-11-24", nextAt: "2026-11-24T09:00:00.000Z", used: true };

test("MC1. 읽기 — 스토리 · 반응(메시지 id) · Seen by · 창, 꺼져 있으면 window null", () => {
  expect(
    myStoriesResponseSchema.safeParse({ enabled: true, keep: true, stories: [story], window })
      .success,
  ).toBe(true);
  expect(
    myStoriesResponseSchema.safeParse({ enabled: false, keep: true, stories: [], window: null })
      .success,
  ).toBe(true);
  // 초안 서버(ADR-0179)의 모양 — messageId · seenBy · window가 없어도 읽는다.
  const { seenBy: _seenBy, ...draft } = story;
  const [{ messageId: _messageId, ...reaction }] = story.reactions;
  expect(
    myStoriesResponseSchema.safeParse({
      enabled: true,
      keep: false,
      stories: [{ ...draft, reactions: [reaction] }],
    }).success,
  ).toBe(true);
  expect(
    myStoriesResponseSchema.safeParse({
      enabled: true,
      keep: true,
      stories: [{ ...story, kind: "video" }],
    }).success,
  ).toBe(false);
});

test("MC2. 올리기 — 인자(시간대 차이는 선택) · 결과(ok는 story, window_used · daily_limit는 window)", () => {
  const request = {
    p_client_id: "7f3f6a0e-6c0e-4f0e-9a43-0d8f5c3b9a11",
    p_kind: "word",
    p_word: { episodeId: "u02-arrival", ref: "voca:arrive" },
    p_ko: "도착하다",
    p_roman: "dochakada",
    p_meaning: "to arrive",
    p_example_ko: null,
    p_example_meaning: null,
    p_lang: "en",
  };
  expect(postMyStoryRequestSchema.safeParse(request).success).toBe(true);
  expect(postMyStoryRequestSchema.safeParse({ ...request, p_tz_offset_min: 540 }).success).toBe(
    true,
  );
  expect(postMyStoryRequestSchema.safeParse({ ...request, p_tz_offset_min: 1.5 }).success).toBe(
    false,
  );
  expect(postMyStoryResultSchema.safeParse({ result: "ok", story, window }).success).toBe(true);
  expect(
    postMyStoryResultSchema.safeParse({ result: "window_used", story: null, window }).success,
  ).toBe(true);
  expect(postMyStoryResultSchema.safeParse({ result: "off", story: null }).success).toBe(true);
});

// 사진 스토리(ADR-0191 D11) — 읽기의 사진 칸과 `companion-my-story`의 요청 · 응답.
const photo = {
  ...story,
  kind: "photo",
  status: "checking",
  word: null,
  ko: "서울에 도착했어! 너무 신나",
  meaning: "",
  example: null,
  imagePath: "7f3f6a0e-6c0e-4f0e-9a43-0d8f5c3b9a10/a1.jpg",
  overlays: [
    {
      kind: "word",
      ko: "창가 자리",
      roman: "changga jari",
      meaning: "window seat",
      word: { episodeId: "u03", ref: "voca:window-seat" },
      x: 0.3,
      y: 0.2,
      scale: 1,
      rotation: -4,
    },
  ],
  lineOriginal: "서울 도착했어",
  edits: 1,
  reactions: [],
  seenBy: [],
};

test("MC3. 사진 스토리 — 단어는 null · 상태 · 경로 · 얹은 단어, 요청 셋(draft · post · edit)과 응답", () => {
  expect(
    myStoriesResponseSchema.safeParse({ enabled: true, keep: true, stories: [photo], window })
      .success,
  ).toBe(true);
  expect(
    myStoryRequestSchema.safeParse({ action: "draft", text: "I arrived in Seoul" }).success,
  ).toBe(true);
  const post = {
    action: "post",
    client_id: "7f3f6a0e-6c0e-4f0e-9a43-0d8f5c3b9a12",
    image_path: photo.imagePath,
    ko: photo.ko,
    lang: "en",
  };
  expect(myStoryRequestSchema.safeParse(post).success).toBe(true);
  expect(
    myStoryRequestSchema.safeParse({
      ...post,
      original: "서울 도착했어",
      overlays: photo.overlays,
      tz_offset_min: 540,
    }).success,
  ).toBe(true);
  expect(myStoryRequestSchema.safeParse({ ...post, client_id: "x" }).success).toBe(false);
  expect(
    myStoryRequestSchema.safeParse({ action: "edit", story_id: photo.id, ko: "서울에 도착했어!" })
      .success,
  ).toBe(true);
  expect(myStoryRequestSchema.safeParse({ action: "delete", story_id: photo.id }).success).toBe(
    false,
  );
  for (const response of [
    { result: "ok", story: photo, window },
    { result: "rejected", rejection: { id: photo.id, category: "nudity" } },
    { result: "ok", draft: { kind: "correction", ko: photo.ko, meaning: "I made it!", tip: null } },
    { result: "window_used", window },
    { result: "text_blocked" },
  ])
    expect(myStoryResponseSchema.safeParse(response).success).toBe(true);
});
