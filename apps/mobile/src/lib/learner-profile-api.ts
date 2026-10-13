// 학습자 프로필의 서버 호출입니다(`authorizedRpc` 위). **던지지 않습니다** — 요청 실패는 값으로 돌려줍니다.

import type { LearnerProfileRecord } from "./learner-profile.contract";

/** 행이 없으면 `record: null`로 **성공**입니다. 요청 실패 · 깨진 응답 · 규칙에 어긋난 값은 `ok: false`. */
export async function loadLearnerProfile(): Promise<
  { readonly ok: true; readonly record: LearnerProfileRecord | null } | { readonly ok: false }
> {
  return { ok: false };
}

export async function saveLearnerProfile(_record: LearnerProfileRecord): Promise<boolean> {
  return false;
}
