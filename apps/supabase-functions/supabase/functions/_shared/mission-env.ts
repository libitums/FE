// 미션의 모델 이름과 호출 상한(ADR-0178). 순수 함수입니다 — 환경 값은 읽는 함수로 받습니다.
//
// 미션은 컴패니언의 모델 설정을 물려받지 않습니다(2026-11-19 사용자 결정 — 컴패니언 기본값이 Opus라 미션이 따라가면 안 된다).
// 상대역 답 · 목표 판정 · 교정 · 힌트는 Haiku, 채점은 Sonnet이 기본이고, 미션 전용 환경 값으로만 바꿉니다.
// (2026-11-23 — 답도 Haiku 5.5. 페르소나 · 가드레일 · 유도는 프롬프트와 연출 지시로, 목표 판정은 전용 호출로 떼어 맞춘다 — 실제 실행 수치는
// docs/specs/ai-companion-mission-pipeline.md.)
// 미션 턴의 입력 검사 · 출력 검사 · 번역은 컴패니언의 설정(`COMPANION_MODERATION_MODEL` · `COMPANION_TRANSLATION_MODEL`)을 그대로 씁니다.

export const missionTurnModelEnv = "COMPANION_MISSION_MODEL";
export const missionGraderModelEnv = "COMPANION_MISSION_GRADER_MODEL";
export const missionFeedbackModelEnv = "COMPANION_MISSION_FEEDBACK_MODEL";
export const missionHintModelEnv = "COMPANION_MISSION_HINT_MODEL";
export const missionJudgeModelEnv = "COMPANION_MISSION_JUDGE_MODEL";

/** 코드의 기본값 — 채점만 Sonnet, 나머지(턴마다 부르는 것)는 Haiku. */
export const defaultMissionModels = {
  turnModel: "claude-haiku-5-5",
  judgeModel: "claude-haiku-5-5",
  graderModel: "claude-sonnet-5-5",
  feedbackModel: "claude-haiku-5-5",
  hintModel: "claude-haiku-5-5",
} as const;

export type MissionModels = {
  readonly turnModel: string;
  readonly judgeModel: string;
  readonly feedbackModel: string;
  readonly hintModel: string;
  readonly graderModel: string;
};

/** 답 생성의 출력 토큰 상한 — 컴패니언 `reply`와 같다(`companion-llm.ts`). */
export const missionTurnMaxTokens = 2000;
/** 목표 판정의 출력 토큰 상한 — 목표 몇 개의 id · 인용뿐이라 작다. */
export const missionJudgeMaxTokens = 600;
/** 판정의 제한 시간 — 넘으면 답 모델의 자기 보고로 돌아간다(답과 병렬이라 보통 답보다 먼저 끝난다). */
export const missionJudgeTimeoutMs = 6000;
/** 채점 호출의 출력 토큰 상한 — 리포트 칸(tip · focus · strengths · 메모)을 더해 3000(2026-11-23, QA 실측 출력 약 600 ~ 900). */
export const missionGraderMaxTokens = 3000;

/** 환경 값 → 미션의 모델 이름. 빈 글은 없는 것으로 본다. 미션 전용 값만 읽는다(컴패니언 값은 보지 않는다). */
export function missionModelsFrom(read: (name: string) => string | undefined): MissionModels {
  const value = (name: string): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  return {
    turnModel: value(missionTurnModelEnv) ?? defaultMissionModels.turnModel,
    judgeModel: value(missionJudgeModelEnv) ?? defaultMissionModels.judgeModel,
    feedbackModel: value(missionFeedbackModelEnv) ?? defaultMissionModels.feedbackModel,
    hintModel: value(missionHintModelEnv) ?? defaultMissionModels.hintModel,
    graderModel: value(missionGraderModelEnv) ?? defaultMissionModels.graderModel,
  };
}
