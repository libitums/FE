// 학습자 프로필의 순수 판정입니다 — 기록에서 치환용 프로필을 만듭니다. 에피소드 전 시작 가드는 2026-10-20에
// 걷었습니다(이름 · 나라는 가입 직후 화면이 묻습니다 — ADR-0059 D7 적용 기록).

import type { LearnerProfilePort, LearnerProfileRecord } from "../lib/learner-profile.contract";
import { learnerCountryTextOf } from "../lib/learner-profile";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { noLearnerProfile } from "./catalog-cover-wiring";

/** 기록이 없으면 `noLearnerProfile` 그 참조입니다. 나라가 표에 없으면 나라 키가 빠집니다. */
export function learnerFillOf(
  record: LearnerProfileRecord | null,
  port: LearnerProfilePort,
): LearnerProfile {
  if (record === null) return noLearnerProfile;
  const country = port.byCode(record.countryCode);
  return country === null
    ? { name: record.name }
    : { name: record.name, country: learnerCountryTextOf(country) };
}
