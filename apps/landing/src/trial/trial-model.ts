// u00 에피소드 → 체험판이 그리는 화면 모델입니다(순수). 빌드 때 한 번 돌고, 결과가 페이지 JSON으로 실립니다.
// 모델에 싣는 판은 사본 고정값(`TRIAL_CONTENT.version`)입니다.

import { TRIAL_CONTENT } from "./trial-content";
import type { TrialModelOf } from "./trial-model.contract";
import { buildTrialModel } from "./trial-model-build";

/** 고른 단계가 없거나 모양이 어긋나면 오류 목록 — 빌드가 던집니다. */
export const trialModelOf: TrialModelOf = (episode, port) =>
  buildTrialModel(episode, port, TRIAL_CONTENT.version);
