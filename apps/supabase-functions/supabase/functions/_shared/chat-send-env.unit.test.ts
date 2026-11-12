import { expect, test } from "vitest";

import { chatSendEnvFrom, defaultCompanionModel } from "./chat-send-env.ts";

const base: Record<string, string> = {
  SUPABASE_URL: "https://ref.supabase.co/",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  ANTHROPIC_API_KEY: "sk-test",
};
const from = (values: Record<string, string>) => chatSendEnvFrom((name) => values[name]);

test("CE1. 필수 값과 기본 모델", () => {
  expect(from(base)).toEqual({
    supabaseUrl: "https://ref.supabase.co",
    supabaseAnonKey: "anon",
    supabaseServiceRoleKey: "service",
    llm: {
      kind: "anthropic",
      apiKey: "sk-test",
      model: defaultCompanionModel,
      moderationModel: defaultCompanionModel,
      feedbackModel: defaultCompanionModel,
      translationModel: defaultCompanionModel,
      suggestModel: defaultCompanionModel,
    },
    translation: "every",
  });
  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
  ]) {
    expect(from({ ...base, [name]: " " }), name).toBeNull();
  }
});

// CE2 — 키가 빠졌다고 가짜 답으로 조용히 넘어가면 운영에서 장애를 못 봅니다. fake는 명시해야만 켜집니다.
test("CE2. fake는 COMPANION_LLM=fake일 때만 · 모르는 값은 설정 오류", () => {
  const { ANTHROPIC_API_KEY: _key, ...noKey } = base;
  expect(from(noKey)).toBeNull();
  expect(from({ ...noKey, COMPANION_LLM: "fake" })?.llm).toEqual({ kind: "fake" });
  expect(from({ ...base, COMPANION_LLM: "openai" })).toBeNull();
});

test("CE3. 모델 · 로컬 주소", () => {
  expect(from({ ...base, COMPANION_MODEL: "claude-sonnet-5-5" })?.llm).toMatchObject({
    model: "claude-sonnet-5-5",
    moderationModel: "claude-sonnet-5-5",
    feedbackModel: "claude-sonnet-5-5",
  });
  expect(from({ ...base, SUPABASE_URL: "http://kong:8000" })?.supabaseUrl).toBe("http://kong:8000");
  expect(from({ ...base, SUPABASE_URL: "http://evil.example" })).toBeNull();
});

// CE4 — 운영 값(답변 Sonnet · 검사 Haiku)에서 피드백은 검사 모델을 따른다(2026-11-10 — 전에는 답변 모델).
test("CE4. 피드백 모델은 따로 · 기본은 검사 모델", () => {
  const split = { ...base, COMPANION_MODEL: "claude-sonnet-5-5" };
  expect(from({ ...split, COMPANION_MODERATION_MODEL: "claude-haiku-5-5" })?.llm).toMatchObject({
    model: "claude-sonnet-5-5",
    moderationModel: "claude-haiku-5-5",
    feedbackModel: "claude-haiku-5-5",
  });
  expect(from({ ...split, COMPANION_FEEDBACK_MODEL: "claude-opus-5-5" })?.llm).toMatchObject({
    model: "claude-sonnet-5-5",
    moderationModel: "claude-sonnet-5-5",
    feedbackModel: "claude-opus-5-5",
  });
});

test("CE5. 번역 — 기본 every · off · 모르는 값은 설정 오류, 번역 모델은 검사 모델을 따른다", () => {
  expect(from({ ...base, COMPANION_TRANSLATION: "off" })?.translation).toBe("off");
  expect(from({ ...base, COMPANION_LLM: "fake", COMPANION_TRANSLATION: "off" })?.translation).toBe(
    "off",
  );
  expect(from({ ...base, COMPANION_TRANSLATION: "tap" })).toBeNull();
  expect(
    from({
      ...base,
      COMPANION_MODEL: "claude-sonnet-5-5",
      COMPANION_MODERATION_MODEL: "claude-haiku-5-5",
    })?.llm,
  ).toMatchObject({ translationModel: "claude-haiku-5-5" });
  expect(from({ ...base, COMPANION_TRANSLATION_MODEL: "claude-sonnet-5-5" })?.llm).toMatchObject({
    translationModel: "claude-sonnet-5-5",
  });
  // 추천 답변 칩 모델도 번역처럼 검사 모델을 따른다.
  expect(from({ ...base, COMPANION_MODERATION_MODEL: "claude-haiku-5-5" })?.llm).toMatchObject({
    suggestModel: "claude-haiku-5-5",
  });
  expect(from({ ...base, COMPANION_SUGGEST_MODEL: "claude-sonnet-5-5" })?.llm).toMatchObject({
    suggestModel: "claude-sonnet-5-5",
  });
});
