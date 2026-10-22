// 인식 글자 수집의 순수 함수 — 전이에서 시도 뽑기 · 행 만들기 · 요청 모양 · 빌드 설정.

import { resolvePreregConfig } from "./trial-prereg";
import type {
  ResolveSamplesConfig,
  TrialSampleOf,
  TrialSampleRequestOf,
  TrialSampleRowOf,
} from "./trial-samples.contract";

/** 표의 check 제약과 같은 상한 — 넘는 글은 잘라 보내 거부되지 않게 합니다. */
const TEXT_MAX = 200;
const ALTERNATIVES_MAX = 3;
const TABLE_PATH = "/rest/v1/trial_speech_samples";

const clip = (text: string) => Array.from(text.trim()).slice(0, TEXT_MAX).join("");

/** 듣는 중 → heard 판정 전이만 시도 하나. 들은 대안이 하나도 없으면 보내지 않습니다. */
export const trialSampleOf: TrialSampleOf = (prev, next, action) => {
  const { turn } = prev.roleplay;
  const spoken = next.roleplay.turn.spoken;
  if (action.type !== "heard" || prev === next || spoken === null) return null;
  if (prev.step !== "roleplay" || turn.mode !== "speech" || turn.phase !== "listening") return null;
  const alternatives = action.alternatives.filter((alternative) => alternative.trim() !== "");
  if (alternatives.length === 0) return null;
  return {
    turnIndex: turn.index,
    expected: spoken.expected,
    alternatives,
    outcome: spoken.outcome,
    similarity: spoken.similarity,
  };
};

export const trialSampleRowOf: TrialSampleRowOf = (sample, context) => ({
  session_id: context.sessionId,
  episode_version: context.episodeVersion,
  turn_index: sample.turnIndex,
  expected: clip(sample.expected),
  alternatives: sample.alternatives
    .map(clip)
    .filter((alternative) => alternative !== "")
    .slice(0, ALTERNATIVES_MAX),
  outcome: sample.outcome,
  similarity: Math.round(Math.min(Math.max(sample.similarity, 0), 1) * 1000) / 1000,
  browser: context.browser,
  locale: context.locale,
});

/** 사전 등록과 같은 PostgREST insert — 떠나는 중에도 끝나도록 keepalive. */
export const trialSampleRequestOf: TrialSampleRequestOf = (config, row) => ({
  url: config.endpoint,
  init: {
    method: "POST",
    headers: {
      apikey: config.apiKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
    credentials: "omit",
    keepalive: true,
  },
});

/** 빌드 때 — 키 검사는 사전 등록 규칙을 그대로 쓰고(모양이 틀리면 던짐), 둘 중 하나라도 없으면 null. */
export const resolveSamplesConfig: ResolveSamplesConfig = (url, key) => {
  const prereg = resolvePreregConfig(url, key, false);
  if (prereg === null) return null;
  const base = (url ?? "").trim().replace(/\/+$/, "");
  return { endpoint: `${base}${TABLE_PATH}`, apiKey: prereg.apiKey };
};
