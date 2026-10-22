import type { DeliveryAddedItem } from "./episode-content.schema";
import type { AddedLearningItem } from "./episode-content.model";
import { itemBaseOf, toOption, toStimulus, toText, toTexts } from "./episode-content.normalize";

// 2026-10-15에 더한 문항 11종의 와이어 → 모델 변환입니다. 순수 함수이고 던지지 않습니다.

/** 새 11종 와이어를 모델로. */
export function toAddedItem(item: DeliveryAddedItem): AddedLearningItem {
  const base = itemBaseOf(item);
  switch (item.type) {
    case "CLOZE_CHOICE":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        context: toText(item.context),
        options: item.options.map(toOption),
        answers: toTexts(item.answers),
        feedback: { correct: toText(item.feedback.correct) },
      };
    case "REPLY_SELECT":
    case "MIN_PAIR_AB":
    case "PARTICLE_FILL":
    case "PARTICLE_SWAP":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        stimulus: toStimulus(item.stimulus),
        options: item.options.map(toOption),
        feedback: { correct: toText(item.feedback.correct) },
      };
    case "CULTURE_CHECK":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        context: toText(item.context),
        options: item.options.map(toOption),
        feedback: { correct: toText(item.feedback.correct) },
      };
    case "CULTURE_CARD":
      return {
        ...base,
        type: item.type,
        context: toText(item.context),
        stimulus: toStimulus(item.stimulus),
        feedback: { correct: toText(item.feedback.correct) },
      };
    case "LISTEN_BUILD":
    case "SYLLABLE_BUILD":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        stimulus: toStimulus(item.stimulus),
        tiles: toTexts(item.tiles),
        answers: toTexts(item.answers),
      };
    case "SHADOW":
    case "SPEAK_WORD":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        stimulus: toStimulus(item.stimulus),
        answers: toTexts(item.answers),
      };
  }
}
