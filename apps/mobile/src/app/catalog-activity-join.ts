// 같은 학습형이 이어지는 문항을 한 활동으로 잇거나 새 활동을 여는 순수 함수입니다.

import type { CatalogActivity, CatalogItemRef, CatalogMappedItem } from "./catalog-lesson-types";

export type PlayableItem = Exclude<CatalogMappedItem, { kind: "skipped" }>;

/** 매핑된 문항과 그 콘텐츠 유형입니다 — 활동별 ref 묶음의 재료입니다. */
export type CatalogPlannedItem = {
  readonly mapped: CatalogMappedItem;
  readonly itemType: CatalogItemRef["itemType"];
};

/** 활동별 문항 ref 묶음입니다(건너뜀 빠짐 · 같은 학습형 연속이 한 묶음). 껍데기만 있는 단계입니다. */
export function catalogActivityItemRefsOf(
  _planned: readonly CatalogPlannedItem[],
): readonly (readonly CatalogItemRef[])[] {
  return [];
}

/** 학습형이 같으면 앞 활동에 잇고, 아니면 `null`입니다. */
export function appended(last: CatalogActivity, item: PlayableItem): CatalogActivity | null {
  switch (item.kind) {
    case "listening":
      return last.form === "listening"
        ? { form: "listening", questions: [...last.questions, item.question] }
        : null;
    case "sentence-order":
      return last.form === "sentence-order"
        ? { form: "sentence-order", questions: [...last.questions, item.question] }
        : null;
    case "word-choice":
      return last.form === "word-choice"
        ? { form: "word-choice", questions: [...last.questions, item.question] }
        : null;
    case "typing":
      return last.form === "typing"
        ? { form: "typing", questions: [...last.questions, item.question] }
        : null;
    case "vocab-card":
      return last.form === "vocab-card"
        ? { form: "vocab-card", questions: [...last.questions, item.question] }
        : null;
    case "pair-match":
      return last.form === "pair-match"
        ? { form: "pair-match", questions: [...last.questions, item.question] }
        : null;
    case "culture-card":
      return last.form === "culture-card"
        ? { form: "culture-card", questions: [...last.questions, item.question] }
        : null;
    case "syllable-build":
      return last.form === "syllable-build"
        ? { form: "syllable-build", questions: [...last.questions, item.question] }
        : null;
    case "read-aloud":
      return last.form === "read-aloud"
        ? { form: "read-aloud", questions: [...last.questions, item.question] }
        : null;
    case "speak-word":
      return last.form === "speak-word"
        ? { form: "speak-word", questions: [...last.questions, item.question] }
        : null;
  }
}

export function startedBy(item: PlayableItem): CatalogActivity {
  switch (item.kind) {
    case "listening":
      return { form: "listening", questions: [item.question] };
    case "sentence-order":
      return { form: "sentence-order", questions: [item.question] };
    case "word-choice":
      return { form: "word-choice", questions: [item.question] };
    case "typing":
      return { form: "typing", questions: [item.question] };
    case "vocab-card":
      return { form: "vocab-card", questions: [item.question] };
    case "pair-match":
      return { form: "pair-match", questions: [item.question] };
    case "culture-card":
      return { form: "culture-card", questions: [item.question] };
    case "syllable-build":
      return { form: "syllable-build", questions: [item.question] };
    case "read-aloud":
      return { form: "read-aloud", questions: [item.question] };
    case "speak-word":
      return { form: "speak-word", questions: [item.question] };
  }
}
