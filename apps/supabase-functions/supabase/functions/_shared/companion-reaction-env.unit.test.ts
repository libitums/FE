import { expect, test } from "vitest";

import { chatSendEnvFrom } from "./chat-send-env.ts";
import { defaultReactionCheckModel, reactionEnvOf } from "./companion-reaction-env.ts";

// `unit`(RE1 ~ RE2): 내 스토리 반응의 모델(ADR-0179 D5, 사용자 결정 2026-11-23 「검사·번역은 하이쿠」) — 출력 검사 · 번역만 Haiku,
// 답은 컴패니언 답변 모델 그대로. 선톡 · chat-send의 환경은 바꾸지 않는다(반응 함수만 이 환경을 쓴다).

const base = (extra: Record<string, string> = {}) => {
  const values: Record<string, string> = {
    SUPABASE_URL: "https://ref.supabase.co",
    SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    ANTHROPIC_API_KEY: "key",
    COMPANION_MODEL: "claude-opus-5-5",
    COMPANION_MODERATION_MODEL: "claude-sonnet-5-5",
    ...extra,
  };
  return chatSendEnvFrom((name) => values[name]);
};

test("RE1. 기본 — 검사 · 번역은 claude-haiku-5-5, 답은 답변 모델 그대로, 원래 환경은 바뀌지 않는다", () => {
  const env = base();
  const reaction = reactionEnvOf(env, () => undefined);
  expect(defaultReactionCheckModel).toBe("claude-haiku-5-5");
  expect(reaction?.llm).toMatchObject({
    kind: "anthropic",
    model: "claude-opus-5-5",
    moderationModel: "claude-haiku-5-5",
    translationModel: "claude-haiku-5-5",
  });
  expect(env?.llm).toMatchObject({ moderationModel: "claude-sonnet-5-5" });
});

test("RE2. 반응 전용 환경 변수로 바꿀 수 있고, 가짜 · 없는 환경은 그대로", () => {
  const reaction = reactionEnvOf(base(), (name) =>
    name === "COMPANION_REACTION_CHECK_MODEL"
      ? " claude-x "
      : name === "COMPANION_REACTION_TRANSLATION_MODEL"
        ? "claude-y"
        : undefined,
  );
  expect(reaction?.llm).toMatchObject({
    moderationModel: "claude-x",
    translationModel: "claude-y",
  });
  const fake = base({ COMPANION_LLM: "fake" });
  expect(reactionEnvOf(fake, () => undefined)).toBe(fake);
  expect(reactionEnvOf(null, () => undefined)).toBeNull();
});
