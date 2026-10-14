// 학습자 프로필의 서버 호출입니다(`authorizedRpc` 위). **던지지 않습니다** — 요청 실패는 값으로 돌려줍니다.

import { learnerProfileRecordFrom } from "./learner-profile";
import type { LearnerProfileRecord, SaveLearnerProfileBody } from "./learner-profile.contract";
import { authorizedRpc } from "./progress-api";

/** 행이 없으면 `record: null`로 **성공**입니다. 요청 실패 · 깨진 응답 · 규칙에 어긋난 값은 `ok: false`. */
export async function loadLearnerProfile(): Promise<
  { readonly ok: true; readonly record: LearnerProfileRecord | null } | { readonly ok: false }
> {
  const bodyText = await authorizedRpc("/rest/v1/rpc/load_learner_profile", {});
  if (bodyText === null) return { ok: false };
  try {
    const raw = JSON.parse(bodyText) as unknown;
    if (raw === null) return { ok: true, record: null };
    // 규칙에 어긋난 값을 「기록 없음」으로 읽지 않습니다 — 기기의 값을 서버의 이상한 응답이 지우지 않게.
    const record = learnerProfileRecordFrom(raw);
    return record === null ? { ok: false } : { ok: true, record };
  } catch {
    return { ok: false };
  }
}

export async function saveLearnerProfile(record: LearnerProfileRecord): Promise<boolean> {
  const body: SaveLearnerProfileBody = { p_name: record.name, p_country_code: record.countryCode };
  return (await authorizedRpc("/rest/v1/rpc/save_learner_profile", body)) !== null;
}
