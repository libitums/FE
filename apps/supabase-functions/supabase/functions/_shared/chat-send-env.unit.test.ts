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
    },
    dailyLimitSeconds: null,
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

test("CE3. 모델 · 상한 · 로컬 주소", () => {
  expect(from({ ...base, COMPANION_MODEL: "claude-sonnet-5-5" })?.llm).toMatchObject({
    model: "claude-sonnet-5-5",
    moderationModel: "claude-sonnet-5-5",
  });
  expect(from({ ...base, COMPANION_DAILY_LIMIT_SECONDS: "10800" })?.dailyLimitSeconds).toBe(10800);
  expect(from({ ...base, COMPANION_DAILY_LIMIT_SECONDS: "-1" })).toBeNull();
  expect(from({ ...base, SUPABASE_URL: "http://kong:8000" })?.supabaseUrl).toBe("http://kong:8000");
  expect(from({ ...base, SUPABASE_URL: "http://evil.example" })).toBeNull();
});
