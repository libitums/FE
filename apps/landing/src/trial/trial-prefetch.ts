// 단계에 들어설 때 받아 둘 음성 주소입니다(순수) — 그 단계와 다음 단계의 음성.

import type { TrialStepId } from "./trial-machine.contract";
import type { TrialModel } from "./trial-model.contract";

const ORDER: readonly TrialStepId[] = [
  "start",
  "prologue",
  "vocab",
  "image-match",
  "reply-select",
  "culture",
  "roleplay",
  "epilogue",
  "complete",
];

function urlsOf(model: TrialModel, step: TrialStepId): (string | null)[] {
  switch (step) {
    case "prologue":
      return model.prologue.map((cut) => cut.audioUrl);
    case "epilogue":
      return model.epilogue.map((cut) => cut.audioUrl);
    case "vocab":
      return [model.vocab.audioUrl, model.vocab.exampleAudioUrl];
    case "image-match":
      return [model.imageMatch.audioUrl];
    case "reply-select":
      return [model.replySelect.audioUrl];
    case "roleplay":
      return model.roleplay.turns.flatMap((turn) => [turn.counterpartAudioUrl, turn.replyAudioUrl]);
    default:
      return [];
  }
}

/** 그 단계와 다음 단계의 음성 주소(빈 것 · 겹친 것 제외). */
export function stepVoiceUrls(model: TrialModel, step: TrialStepId): readonly string[] {
  const index = ORDER.indexOf(step);
  const steps = ORDER.slice(index, index + 2);
  const urls = steps.flatMap((each) => urlsOf(model, each));
  return [...new Set(urls.filter((url): url is string => url !== null))];
}
