// 카탈로그 활동에서 활동 안내의 판정 입력을 뽑습니다(ADR-0104 D1) — 학습형 · 문항 수 · 문장 만들기의 첫 문항 조각 수뿐입니다.

import type { ActivityGuideSubject } from "../lib/learning-item-guide.contract";
import type { CatalogActivity } from "./catalog-lesson-types";

// 타입은 문항이 하나 이상이지만, 본문이 바뀌어 비어 들어와도 판정이 던지지 않게 「조각 수 모름」(null)으로 둡니다.
function firstChipCountOf(
  questions: readonly { readonly chips: readonly string[] }[],
): number | null {
  return questions.length === 0 ? null : (questions[0]?.chips.length ?? null);
}

export function activityGuideSubjectOf(activity: CatalogActivity): ActivityGuideSubject {
  return {
    form: activity.form,
    questionCount: activity.questions.length,
    firstChipCount:
      activity.form === "sentence-order" ? firstChipCountOf(activity.questions) : null,
  };
}
