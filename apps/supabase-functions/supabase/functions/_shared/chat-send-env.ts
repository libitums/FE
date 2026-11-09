import type { ChatSendEnvFrom, ChatSendEnvName } from "./chat-send.contract.ts";

/**
 * 모델을 정하지 않으면 쓰는 기본값입니다. 바꿀 때는 `COMPANION_MODEL`(답변) · `COMPANION_FEEDBACK_MODEL`(피드백, 기본은
 * 답변 모델) · `COMPANION_MODERATION_MODEL`(검사 · 기억 · 요약, 기본은 답변 모델) · `COMPANION_TRANSLATION_MODEL`(L1 번역,
 * 기본은 검사 모델).
 */
export const defaultCompanionModel = "claude-opus-5-5";

export const chatSendEnvFrom: ChatSendEnvFrom = (read) => {
  const value = (name: ChatSendEnvName): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };

  const rawUrl = value("SUPABASE_URL");
  const supabaseAnonKey = value("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  if (rawUrl === null || supabaseAnonKey === null || supabaseServiceRoleKey === null) return null;
  // 로컬 스택(`supabase start`)은 http다. 운영은 https만 받는다.
  if (
    !rawUrl.startsWith("https://") &&
    !/^http:\/\/(127\.0\.0\.1|localhost|kong)(:\d+)?/.test(rawUrl)
  ) {
    return null;
  }

  const translation = value("COMPANION_TRANSLATION") ?? "every";
  if (translation !== "every" && translation !== "off") return null;

  const mode = value("COMPANION_LLM") ?? "anthropic";
  let llm;
  if (mode === "fake") {
    llm = { kind: "fake" } as const;
  } else if (mode === "anthropic") {
    const apiKey = value("ANTHROPIC_API_KEY");
    if (apiKey === null) return null;
    const model = value("COMPANION_MODEL") ?? defaultCompanionModel;
    const moderationModel = value("COMPANION_MODERATION_MODEL") ?? model;
    llm = {
      kind: "anthropic",
      apiKey,
      model,
      moderationModel,
      feedbackModel: value("COMPANION_FEEDBACK_MODEL") ?? model,
      translationModel: value("COMPANION_TRANSLATION_MODEL") ?? moderationModel,
    } as const;
  } else {
    return null;
  }

  return {
    supabaseUrl: rawUrl.replace(/\/+$/, ""),
    supabaseAnonKey,
    supabaseServiceRoleKey,
    llm,
    translation,
  };
};
