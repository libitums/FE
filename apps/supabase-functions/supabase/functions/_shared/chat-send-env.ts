import {
  type ChatSendEnvFrom,
  type ChatSendEnvName,
  type ReplyEffort,
  replyEfforts,
} from "./chat-send.contract.ts";

/**
 * 모델을 정하지 않으면 쓰는 기본값입니다. 바꿀 때는 `COMPANION_MODEL`(답변) · `COMPANION_FEEDBACK_MODEL`(피드백, 기본은
 * 검사 모델 — 2026-11-10부터) · `COMPANION_MODERATION_MODEL`(검사 · 기억 · 요약, 기본은 답변 모델) · `COMPANION_TRANSLATION_MODEL`(L1 번역,
 * 기본은 검사 모델) · `COMPANION_SUGGEST_MODEL`(추천 답변 칩, 기본은 검사 모델). 답변의 생각 깊이는 `COMPANION_REPLY_EFFORT`(low 기본 · medium · high · off — off는 Haiku만). 답변이 아무것도 보내기 전 refusal로 끝나면 `COMPANION_REPLY_FALLBACK_MODEL`(Haiku면 기본 claude-sonnet-5-5)로 한 번 다시 부른다.
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
    const replyEffort = value("COMPANION_REPLY_EFFORT") ?? "low";
    if (!(replyEfforts as readonly string[]).includes(replyEffort)) return null;
    llm = {
      kind: "anthropic",
      apiKey,
      model,
      moderationModel,
      // 피드백 카드는 정해진 모양의 교정이라 검사 모델(운영 Haiku)로 충분하다 — 턴 비용의 큰 몫이었다(2026-11-10).
      feedbackModel: value("COMPANION_FEEDBACK_MODEL") ?? moderationModel,
      translationModel: value("COMPANION_TRANSLATION_MODEL") ?? moderationModel,
      suggestModel: value("COMPANION_SUGGEST_MODEL") ?? moderationModel,
      replyEffort: replyEffort as ReplyEffort,
      // Haiku 5.5는 서버 쪽 refusal 대체(fallbacks)가 없다 — 아무것도 보내기 전 거절이면 이 모델로 한 번 다시 부른다(2026-11-28).
      replyFallbackModel:
        value("COMPANION_REPLY_FALLBACK_MODEL") ??
        (model.startsWith("claude-haiku") ? "claude-sonnet-5-5" : undefined),
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
