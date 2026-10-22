// 테스트 지원 — 실제 사본(`content/u00-tutorial.json`)을 실제 디코더 · trialModelOf로 만든 화면 모델과,
// 리듀서로 어느 단계까지 몰아가는 도우미입니다. u00을 손으로 흉내 내지 않습니다.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { decodeEpisode, type Episode } from "@libitums/episode-core/episode";
import { assert } from "vitest";

import { trialImageUrlOf } from "./trial-images";
import { initialTrialState, reduceTrial } from "./trial-machine";
import type { TrialAction, TrialState, TrialStepId } from "./trial-machine.contract";
import type { TrialModel } from "./trial-model.contract";
import { trialModelOf } from "./trial-model";

export const TRIAL_COPY_PATH = fileURLToPath(
  new URL("./content/u00-tutorial.json", import.meta.url),
);
export const TEST_CONTENT_BASE = "https://c.test/storage/v1/object/public/content/";

/** u00 음성 id(`d-01`) → 테스트 기준 주소의 전체 주소. */
export const u00AudioUrl = (id: string, base = TEST_CONTENT_BASE) =>
  `${base}audio/u00-tutorial/${id}.m4a`;

export function readTrialCopy(): string {
  assert.isTrue(existsSync(TRIAL_COPY_PATH), `사본이 없다: ${TRIAL_COPY_PATH}`);
  return readFileSync(TRIAL_COPY_PATH, "utf8");
}

export function decodedU00(): Episode {
  const result = decodeEpisode(JSON.parse(readTrialCopy()));
  if (!result.ok) assert.fail(`사본 디코드 실패: ${JSON.stringify(result.errors)}`);
  return result.episode;
}

export function u00TrialModel(contentBase = TEST_CONTENT_BASE): TrialModel {
  const result = trialModelOf(decodedU00(), { imageUrlOf: trialImageUrlOf, contentBase });
  if (!result.ok) assert.fail(`trialModelOf 실패: ${JSON.stringify(result.errors)}`);
  return result.model;
}

export const run = (state: TrialState, actions: readonly TrialAction[], model: TrialModel) =>
  actions.reduce((current, action) => reduceTrial(current, action, model), state);

const next: TrialAction = { type: "next" };

/** 말하기 정답 대안 — 턴마다 받아 주는 답에서 부호를 뺀 글. */
export const SPEECH_CORRECT: readonly string[] = [
  "안녕하세요 네 처음이에요",
  "진짜요 감사합니다",
  "지금부터요",
];

/** 타일 정답(보이는 자리 번호) — u00 섞인 순서 기준. */
export const TILES_CORRECT: readonly (readonly number[])[] = [[2, 0, 1], [1, 0], [0]];

/** 타일 턴 하나 — 놓고 확인하고 넘긴다. */
export function tilesTurn(placed: readonly number[]): TrialAction[] {
  return [
    ...placed.map((tileIndex): TrialAction => ({ type: "toggle-tile", tileIndex })),
    { type: "check" },
    next,
  ];
}

/** 말하기 턴 하나 — 말하고 정답 대안을 듣고 넘긴다. */
export function speechCorrectTurn(index: number): TrialAction[] {
  return [{ type: "speak" }, { type: "heard", alternatives: [SPEECH_CORRECT[index] ?? ""] }, next];
}

/** 세 턴을 모두 정답으로 — supported면 말하기, unsupported면 타일. */
function correctTurns(speech: "supported" | "unsupported"): TrialAction[] {
  return [0, 1, 2].flatMap((index) =>
    speech === "supported" ? speechCorrectTurn(index) : tilesTurn(TILES_CORRECT[index] ?? []),
  );
}

/** 연 화면(컷 1)에서 그 단계의 첫 자리까지 가는 행동 — 첫 탭 `begin`부터(고르기는 정답으로). u00: 컷 6 · 보기 정답 0 · 2 · 엔딩 4. */
export function actionsTo(step: TrialStepId, speech: "supported" | "unsupported"): TrialAction[] {
  const prologue: TrialAction[] = [{ type: "begin", speech }];
  const vocab = [...prologue, next, next, next, next, next, next];
  const imageMatch = [...vocab, next];
  const replySelect: TrialAction[] = [...imageMatch, { type: "choose", optionIndex: 0 }, next];
  const culture: TrialAction[] = [...replySelect, { type: "choose", optionIndex: 2 }, next];
  const roleplay = [...culture, next];
  const epilogue = [...roleplay, ...correctTurns(speech)];
  const clear = [...epilogue, next, next, next, next];
  const byStep: Record<TrialStepId, TrialAction[]> = {
    prologue,
    vocab,
    "image-match": imageMatch,
    "reply-select": replySelect,
    culture,
    roleplay,
    epilogue,
    clear,
    complete: [...clear, next],
  };
  return byStep[step];
}

/** 연 화면에서 `step`의 첫 자리까지 몬 상태. */
export function stateAt(
  step: TrialStepId,
  model: TrialModel,
  speech: "supported" | "unsupported" = "supported",
): TrialState {
  return run(initialTrialState(), actionsTo(step, speech), model);
}

export type TrialStep = {
  readonly prev: TrialState;
  readonly next: TrialState;
  readonly action: TrialAction;
};

/** 행동마다 (전, 후, 행동)을 차례로 — 파생 함수(효과음 · 이벤트)를 흐름 전체에 대어 볼 때 쓴다. */
export function trace(
  state: TrialState,
  actions: readonly TrialAction[],
  model: TrialModel,
): TrialStep[] {
  const steps: TrialStep[] = [];
  let current = state;
  for (const action of actions) {
    const after = reduceTrial(current, action, model);
    steps.push({ prev: current, next: after, action });
    current = after;
  }
  return steps;
}
