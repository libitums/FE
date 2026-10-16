// 받아쓰기 · 한국어로 쓰기 · 패턴 쓰기 문항을 타자 입력 문항으로 바꿉니다(순수).

import { isTypeableAnswer } from "../lib/hangul-keyboard";
import type { LearningItem } from "../lib/episode-content.model";
import type { TypingCueKind } from "../screens/typing/typing.contract";
import type { CatalogItemPort, CatalogMappedItem } from "./catalog-lesson-types";
import { englishOf, instructionOf, koOf, latinOf, skippedItem } from "./catalog-item-text";

type TypingSource = Extract<LearningItem, { type: "DICTATION" | "TRANSLATE_TO_KO" | "SENT_BUILD" }>;

type TypingParts = {
  readonly kind: TypingCueKind;
  readonly cue: string;
  readonly cueSupport: string | null;
  readonly hint: string | null;
};

function typingItem(
  item: TypingSource,
  port: CatalogItemPort,
  parts: TypingParts,
): CatalogMappedItem {
  const answers = item.answers.map((answer) => koOf(port, answer.ko)).filter((ko) => ko !== "");
  const [first, ...rest] = answers;
  if (first === undefined) return skippedItem(item, "malformed");
  if (!answers.some(isTypeableAnswer)) return skippedItem(item, "untypeable");
  return {
    kind: "typing",
    itemId: item.id,
    question: {
      id: item.id,
      kind: parts.kind,
      instruction: instructionOf(port, item.prompt) ?? "",
      cue: parts.cue,
      cueSupport: parts.cueSupport,
      hint: parts.hint,
      answers: [first, ...rest],
      audioSource: null,
    },
  };
}

/** 첫 영어 뜻이 있는 정답의 영어입니다. */
function firstEnglish(item: TypingSource, port: CatalogItemPort): string | undefined {
  if (item.type === "TRANSLATE_TO_KO") {
    const stimulusEnglish = englishOf(port, item.stimulus?.en);
    if (stimulusEnglish !== undefined) return stimulusEnglish;
  }
  for (const answer of item.answers) {
    const english = englishOf(port, answer.en);
    if (english !== undefined) return english;
  }
  return undefined;
}

export function typingItemOf(item: TypingSource, port: CatalogItemPort): CatalogMappedItem {
  switch (item.type) {
    case "DICTATION": {
      const cue = latinOf(port, item.stimulus.audio?.roman);
      if (cue === undefined) return skippedItem(item, "malformed");
      return typingItem(item, port, {
        kind: "dictation",
        cue,
        cueSupport: englishOf(port, item.stimulus.audio?.en) ?? null,
        hint: null,
      });
    }
    case "TRANSLATE_TO_KO": {
      const cue = firstEnglish(item, port);
      if (cue === undefined) return skippedItem(item, "no-source");
      return typingItem(item, port, { kind: "translation", cue, cueSupport: null, hint: null });
    }
    case "SENT_BUILD": {
      const cue = firstEnglish(item, port);
      if (cue === undefined) return skippedItem(item, "no-source");
      const hint = koOf(port, item.context.ko);
      return typingItem(item, port, {
        kind: "pattern",
        cue,
        cueSupport: null,
        hint: hint === "" ? null : hint,
      });
    }
  }
}
