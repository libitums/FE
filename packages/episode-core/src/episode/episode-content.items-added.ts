import type { DeliveryAddedItem } from "./episode-content.schema";
import type { AddedLearningItem } from "./episode-content.model";
import {
  itemBaseOf,
  maybe,
  nonEmpty,
  optText,
  toOption,
  toStimulus,
  toText,
  toTexts,
} from "./episode-content.normalize";

// 2026-10-15에 더한 문항 11종과 2026-10-30(balance)의 따라 쓰기 와이어 → 모델 변환입니다. 순수 함수이고 던지지
// 않습니다.

/** 더한 형식 와이어를 모델로. */
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
        ...maybe(
          "feedback",
          item.feedback === undefined ? undefined : { correct: toText(item.feedback.correct) },
        ),
      };
    case "REPLY_SELECT": {
      // 이야기 대답 고르기는 상대 말을 `context`로만 싣습니다 — 자극이 없으면 그것을 글로 씁니다.
      const context = optText(item.context);
      const feedback = item.feedback;
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        stimulus:
          item.stimulus === undefined ? { ...maybe("text", context) } : toStimulus(item.stimulus),
        ...maybe("context", context),
        options: item.options.map(toOption),
        ...maybe(
          "feedback",
          feedback === undefined
            ? undefined
            : {
                correct: toText(feedback.correct),
                ...maybe("wrong", optText(feedback.wrong)),
                ...maybe("wrongOption", nonEmpty(feedback.wrong_option)),
              },
        ),
      };
    }
    case "CLOZE_TYPING":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        context: toText(item.context),
        answers: toTexts(item.answers),
      };
    case "HANGUL_WRITE":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        context: toText(item.context),
        answers: toTexts(item.answers),
        ...maybe(
          "feedback",
          item.feedback === undefined ? undefined : { correct: toText(item.feedback.correct) },
        ),
      };
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
        ...maybe("context", optText(item.context)),
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
