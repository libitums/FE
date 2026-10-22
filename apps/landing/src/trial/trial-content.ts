// 체험판 콘텐츠 사본의 고정값과, 빌드 때 한 번 사본에서 화면 모델을 만드는 진입입니다.
// 사본(`content/u00-tutorial.json`)은 앱 내장본과 바이트가 같고(동기 검사가 지킵니다), 디코드는 빌드에서만 돕니다.
// 조립은 `trialModelOf`와 같은 `buildTrialModel`을 직접 부릅니다(`trial-model.ts`가 이 핀을 읽어 순환을 피합니다).

import { decodeEpisode } from "@libitums/episode-core/episode";

import u00Tutorial from "./content/u00-tutorial.json";
import type { LoadTrialModel, TrialContentPin } from "./trial-model.contract";
import { buildTrialModel } from "./trial-model-build";

/** 사본의 판 · 길이 · sha256 — 앱 매니페스트의 u00 항목과 같아야 합니다. */
export const TRIAL_CONTENT: TrialContentPin = {
  episodeId: "u00-tutorial",
  version: "2026-10-21.3",
  bytes: 37777,
  sha256: "c9636a3d1b43ffff21df2a75c8b6a9d300ca853e6f20e0ffbde2aa67ca85377a",
};

const describe = (errors: readonly { code: string; path: string }[]) =>
  errors.map((error) => `${error.code} ${error.path}`).join(", ");

/** 사본 → decodeEpisode → 모델 조립(`trialModelOf`와 같음). 실패면 오류 코드 · 경로를 메시지에 담아 던집니다(빌드 실패). */
export const loadTrialModel: LoadTrialModel = (port) => {
  const decoded = decodeEpisode(u00Tutorial);
  if (!decoded.ok) {
    throw new Error(`체험판 사본 디코드 실패: decode-failed ${describe(decoded.errors)}`);
  }
  const result = buildTrialModel(decoded.episode, port, TRIAL_CONTENT.version);
  if (!result.ok) throw new Error(`체험판 모델 실패: ${describe(result.errors)}`);
  return result.model;
};
