// 받아 적은 글을 바로 보낼지(2026-11-23 결정 — 확신도가 높으면 바로, 낮으면 입력 칸에서 확인). 순수 함수입니다.
// 대시보드 실험실 `companion_voice.py`의 `stt_features` · `autosend_decision`과 같은 규칙 · 같은 기본 문턱(맥미니 진짜 호출 실측)입니다.
// 문턱은 환경 값으로 바꿉니다(`mission-voice-env.ts`).

import type { MissionAutoSendReason, MissionSttFeatures } from "./companion-contract/index.ts";

export type AutoSendSettings = {
  /** 낱말 확신도(`exp(logprob)`)의 최소가 이 값 아래면 확인. */
  readonly confMin: number;
  /** 낱말 확신도의 평균이 이 값 아래면 확인. */
  readonly confMean: number;
  /** 녹음이 이보다 짧으면(초) 확인. */
  readonly minSeconds: number;
  /** 글자 가운데 한글 비율이 이 값 아래면 확인(영어로 말함). */
  readonly hangulMin: number;
  /** 벤더가 확신도를 주지 않을 때 바로 보낼지(Scribe는 늘 준다). */
  readonly withoutConfidence: boolean;
};

export const AUTOSEND_DEFAULTS: AutoSendSettings = {
  confMin: 0.85,
  confMean: 0.93,
  minSeconds: 0.35,
  hangulMin: 0.6,
  withoutConfidence: false,
};

const hangul = /[가-힣ㄱ-ㅎㅏ-ㅣ]/gu;
const letter = /\p{L}/gu;
const notCounted = /[\s\p{P}\p{S}_]/gu;

const round = (n: number, digits: number) => Number(n.toFixed(digits));

/** 판단 재료: 확신도 최소 · 평균(낱말), 글자 수(공백 · 문장 부호 · 기호 뺌), 한글 비율(글자 가운데), 녹음 길이. */
export function sttFeatures(
  text: string,
  words: readonly { readonly confidence: number | null }[],
  seconds: number,
): MissionSttFeatures {
  const confs = words
    .map((word) => word.confidence)
    .filter((c): c is number => typeof c === "number" && Number.isFinite(c));
  const letters = text.match(letter)?.length ?? 0;
  return {
    confMin: confs.length > 0 ? round(Math.min(...confs), 4) : null,
    confMean:
      confs.length > 0 ? round(confs.reduce((sum, c) => sum + c, 0) / confs.length, 4) : null,
    chars: text.replace(notCounted, "").length,
    hangulRatio: letters > 0 ? round((text.match(hangul)?.length ?? 0) / letters, 3) : null,
    seconds,
  };
}

/** → 바로 보낼지와 까닭. 위에서 먼저 걸리는 것: empty → too_short → not_korean → no_confidence → low_confidence → ok. */
export function autosendDecision(
  features: MissionSttFeatures,
  settings: AutoSendSettings = AUTOSEND_DEFAULTS,
): { readonly autoSend: boolean; readonly reason: MissionAutoSendReason } {
  if (features.chars === 0) return { autoSend: false, reason: "empty" };
  if (features.seconds < settings.minSeconds) return { autoSend: false, reason: "too_short" };
  if (features.hangulRatio !== null && features.hangulRatio < settings.hangulMin)
    return { autoSend: false, reason: "not_korean" };
  if (features.confMin === null || features.confMean === null)
    return { autoSend: settings.withoutConfidence, reason: "no_confidence" };
  if (features.confMin < settings.confMin || features.confMean < settings.confMean)
    return { autoSend: false, reason: "low_confidence" };
  return { autoSend: true, reason: "ok" };
}
