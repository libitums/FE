// 상태에서 파생하는 진행 · 음성 단서 · 효과음 · 롤플레이 결과입니다(순수). 컨트롤러가 전이마다 부릅니다.

import { catalogPassCriterion, judgeAssessment } from "@libitums/episode-core/judge";

import type {
  TrialProgressOf,
  TrialRoleplayVerdictOf,
  TrialSfxOf,
  TrialStepId,
  TrialVoiceCue,
  TrialVoiceCueOf,
} from "./trial-machine.contract";

const PROGRESS: Readonly<Record<TrialStepId, number>> = {
  prologue: 1,
  vocab: 2,
  "image-match": 3,
  "reply-select": 4,
  culture: 5,
  roleplay: 6,
  epilogue: 7,
  clear: 7,
  complete: 7,
};

/** 체험판의 롤플레이는 세 턴입니다 — 통과 기준은 앱과 같은 `catalogPassCriterion(3)`(= 2). */
const ROLEPLAY_TURNS = 3;

/** 진행 막대의 값 — 엔딩 · Episode clear · 완료는 끝까지 찬 막대. */
export const trialProgressOf: TrialProgressOf = (state) => ({
  ordinal: PROGRESS[state.step],
  total: 7,
});

const cue = (key: string, url: string | null): TrialVoiceCue | null =>
  url === null ? null : { key, url };

/**
 * 지금 나야 할 음성 — key가 바뀔 때만 재생합니다. 롤플레이는 준비 중이면 상대 줄, 맞힌 뒤면 내 줄,
 * 듣는 중 · 틀린 뒤는 없음입니다(다시 준비로 오면 키가 null을 거쳐 상대 줄이 다시 납니다).
 */
export const trialVoiceCueOf: TrialVoiceCueOf = (state, model) => {
  switch (state.step) {
    case "prologue":
    case "epilogue": {
      const cuts = state.step === "prologue" ? model.prologue : model.epilogue;
      return cue(`${state.step}:${state.cutIndex}`, cuts[state.cutIndex]?.audioUrl ?? null);
    }
    case "vocab":
      return cue("vocab", model.vocab.audioUrl);
    case "image-match":
      return cue("image-match", model.imageMatch.audioUrl);
    case "reply-select":
      return cue("reply-select", model.replySelect.audioUrl);
    case "roleplay": {
      const { turn } = state.roleplay;
      const item = model.roleplay.turns[turn.index];
      if (item === undefined) return null;
      if (turn.phase === "ready") return cue(`rp:${turn.index}:line`, item.counterpartAudioUrl);
      if (turn.phase === "judged" && turn.verdict === "correct") {
        return cue(`rp:${turn.index}:reply`, item.replyAudioUrl);
      }
      return null;
    }
    default:
      return null;
  }
};

/** 전이 하나에 낼 효과음 — 카드 넘김은 버튼, 판정이 생기면 정답/오답, 롤플레이 통과 · Episode clear는 축하. 첫 탭(begin)은 없음. */
export const trialSfxOf: TrialSfxOf = (prev, next, action) => {
  if (prev === next || action.type === "begin") return null;
  if (prev.step === "roleplay" && next.step === "epilogue") {
    return next.roleplay.verdict === "passed" ? "pass_lesson" : null;
  }
  if (prev.step === "epilogue" && next.step === "clear") return "lesson_complete";
  if (action.type === "next" && (prev.step === "vocab" || prev.step === "culture")) {
    return "button";
  }
  const before = prev.step === "roleplay" ? prev.roleplay.turn.verdict : prev.choice.verdict;
  const after = next.step === "roleplay" ? next.roleplay.turn.verdict : next.choice.verdict;
  if (prev.step === next.step && before === null && after !== null) {
    return after === "correct" ? "correct_answer" : "wrong_answer";
  }
  return null;
};

/** 롤플레이 턴 기록 → 통과 판정. */
export const trialRoleplayVerdictOf: TrialRoleplayVerdictOf = (records) =>
  judgeAssessment(
    records.map((record) => record.result),
    catalogPassCriterion(ROLEPLAY_TURNS),
  );
