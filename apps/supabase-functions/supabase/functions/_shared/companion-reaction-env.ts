// 내 스토리 반응의 모델(ADR-0191 D5 · ADR-0194 D5). 런타임 중립.
// 반응 함수(`companion-story-reactions`)만 이 환경을 쓴다 — chat-send · 선톡의 환경은 그대로다.
// - 답: `COMPANION_REACTION_MODEL`(기본 Sonnet 5.5). 대화(`COMPANION_MODEL`)와 따로 고른다 — 한두 줄짜리 반응이라 더 싼 모델로 시작하고,
//   Haiku는 평가 세트로 견준 뒤 바꾼다.
// - 출력 검사 · 번역: `COMPANION_REACTION_CHECK_MODEL` · `COMPANION_REACTION_TRANSLATION_MODEL`(기본 Haiku 5.5).
// - 추천 답안 칩: `COMPANION_REACTION_SUGGEST_MODEL` → 대화의 `COMPANION_SUGGEST_MODEL` → Haiku 5.5.

import type { ChatSendEnv } from "./chat-send.contract.ts";

export const defaultReactionModel = "claude-sonnet-5-5";
export const defaultReactionCheckModel = "claude-haiku-5-5";

export function reactionEnvOf(
  env: ChatSendEnv | null,
  read: (name: string) => string | undefined,
): ChatSendEnv | null {
  if (env === null || env.llm.kind !== "anthropic") return env;
  const value = (name: string): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  return {
    ...env,
    llm: {
      ...env.llm,
      model: value("COMPANION_REACTION_MODEL") ?? defaultReactionModel,
      moderationModel: value("COMPANION_REACTION_CHECK_MODEL") ?? defaultReactionCheckModel,
      translationModel: value("COMPANION_REACTION_TRANSLATION_MODEL") ?? defaultReactionCheckModel,
      suggestModel:
        value("COMPANION_REACTION_SUGGEST_MODEL") ??
        value("COMPANION_SUGGEST_MODEL") ??
        defaultReactionCheckModel,
    },
  };
}
