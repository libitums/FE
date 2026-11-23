// 내 스토리 반응의 모델(ADR-0179 D5, 사용자 결정 2026-11-23 「검사·번역은 하이쿠」). 런타임 중립.
// 반응 함수(`companion-story-reactions`)만 이 환경을 쓴다 — 출력 검사(moderate) · 번역은 Haiku, 답은 컴패니언 답변 모델 그대로.
// 바꿀 때는 `COMPANION_REACTION_CHECK_MODEL` · `COMPANION_REACTION_TRANSLATION_MODEL`. chat-send · 선톡의 환경은 그대로다.

import type { ChatSendEnv } from "./chat-send.contract.ts";

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
      moderationModel: value("COMPANION_REACTION_CHECK_MODEL") ?? defaultReactionCheckModel,
      translationModel: value("COMPANION_REACTION_TRANSLATION_MODEL") ?? defaultReactionCheckModel,
    },
  };
}
