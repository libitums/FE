// 미션의 모델 이름과 호출 상한(ADR-0160). 순수 함수입니다 — 환경 값은 읽는 함수로 받습니다.
//
// 답 · 교정 모델은 컴패니언 턴과 같은 환경 값을 같은 기본값 사슬로 읽고(`chat-send-env.ts`), 힌트는 추천 답변 칩 모델을 같이 씁니다.
// 채점(상위 모델)만 새 환경 값 `COMPANION_MISSION_GRADER_MODEL`이고, 비워 두면 답 모델과 같습니다(PRD §9 M5 — 실측 뒤 정한다).

import { defaultCompanionModel } from "./chat-send-env.ts";

export const missionGraderModelEnv = "COMPANION_MISSION_GRADER_MODEL";

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

/** 환경 값 → 미션의 모델 이름. 빈 글은 없는 것으로 본다. `read`가 늘 undefined면 코드의 기본값이 나온다. */
export function missionModelsFrom(read: (name: string) => string | undefined): MissionModels {
  const value = (name: string): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  const turnModel = value("COMPANION_MODEL") ?? defaultCompanionModel;
  const moderationModel = value("COMPANION_MODERATION_MODEL") ?? turnModel;
  return {
    turnModel,
    feedbackModel: value("COMPANION_FEEDBACK_MODEL") ?? moderationModel,
    hintModel: value("COMPANION_SUGGEST_MODEL") ?? moderationModel,
    graderModel: value(missionGraderModelEnv) ?? turnModel,
  };
}
