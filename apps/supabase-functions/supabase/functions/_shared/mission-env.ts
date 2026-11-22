// 미션의 모델 이름과 호출 상한(ADR-0177). 순수 함수입니다 — 환경 값은 읽는 함수로 받습니다.
//
// 미션은 컴패니언의 모델 설정을 물려받지 않습니다(2026-11-19 사용자 결정 — 컴패니언 기본값이 Opus라 미션이 따라가면 안 된다).
// 가벼운 일(교정 · 힌트)은 Haiku, 무거운 일(상대역 답 · 채점)은 Sonnet이 기본이고, 미션 전용 환경 값으로만 바꿉니다.
// 미션 턴의 입력 검사 · 출력 검사 · 번역은 컴패니언의 설정(`COMPANION_MODERATION_MODEL` · `COMPANION_TRANSLATION_MODEL`)을 그대로 씁니다.

export const missionTurnModelEnv = "COMPANION_MISSION_MODEL";
export const missionGraderModelEnv = "COMPANION_MISSION_GRADER_MODEL";
export const missionFeedbackModelEnv = "COMPANION_MISSION_FEEDBACK_MODEL";
export const missionHintModelEnv = "COMPANION_MISSION_HINT_MODEL";

/** 코드의 기본값 — 무거운 일은 Sonnet, 가벼운 일은 Haiku. */
export const defaultMissionModels = {
  turnModel: "claude-sonnet-5-5",
  graderModel: "claude-sonnet-5-5",
  feedbackModel: "claude-haiku-5-5",
  hintModel: "claude-haiku-5-5",
} as const;

export type MissionModels = {
  readonly turnModel: string;
  readonly feedbackModel: string;
  readonly hintModel: string;
  readonly graderModel: string;
};

/** 답 생성의 출력 토큰 상한 — 컴패니언 `reply`와 같다(`companion-llm.ts`). */
export const missionTurnMaxTokens = 2000;
/** 채점 호출의 출력 토큰 상한 — 구조화 호출과 같다(`companion-llm.ts`의 `structured`). */
export const missionGraderMaxTokens = 2000;

/** 환경 값 → 미션의 모델 이름. 빈 글은 없는 것으로 본다. 미션 전용 값만 읽는다(컴패니언 값은 보지 않는다). */
export function missionModelsFrom(read: (name: string) => string | undefined): MissionModels {
  const value = (name: string): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  return {
    turnModel: value(missionTurnModelEnv) ?? defaultMissionModels.turnModel,
    feedbackModel: value(missionFeedbackModelEnv) ?? defaultMissionModels.feedbackModel,
    hintModel: value(missionHintModelEnv) ?? defaultMissionModels.hintModel,
    graderModel: value(missionGraderModelEnv) ?? defaultMissionModels.graderModel,
  };
}
