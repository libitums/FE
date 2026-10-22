// 빌드 env `PUBLIC_SUPABASE_URL` → 음성 버킷 기준 주소입니다(순수).

import { contentBaseUrl } from "@libitums/episode-core/content-url";

import type { ResolveTrialContentBase } from "./trial-model.contract";

// 프로젝트 주소는 `https://<호스트>` 하나뿐입니다 — 경로 · 쿼리 · 조각이 붙으면 버킷 주소가 어긋납니다.
const PROJECT_URL = /^https:\/\/[^/?#\s]+\/?$/;

/** 빈 값 + 비프로덕션 → "", 빈 값 + 프로덕션 · 모양 틀림 → 던집니다. */
export const resolveTrialContentBase: ResolveTrialContentBase = (env, production) => {
  const value = (env ?? "").trim();
  if (value === "") {
    if (production) {
      throw new Error("PUBLIC_SUPABASE_URL이 없습니다 — 프로덕션 체험판은 음성 주소가 필요합니다");
    }
    return "";
  }
  if (!PROJECT_URL.test(value)) {
    throw new Error(`PUBLIC_SUPABASE_URL 모양이 틀렸습니다(https://<호스트>만): ${value}`);
  }
  return contentBaseUrl(value);
};
