// 카탈로그 활동에서 활동 안내의 판정 입력을 뽑습니다(ADR-0104 D1) — 학습형 · 문항 수 · 문장 만들기의 첫 문항 조각 수뿐입니다.

import type { ActivityGuideSubject } from "../lib/learning-item-guide.contract";
import type { CatalogActivity } from "./catalog-lesson-types";

export function activityGuideSubjectOf(activity: CatalogActivity): ActivityGuideSubject {
  return {
    form: activity.form,
    questionCount: activity.questions.length,
    firstChipCount: activity.form === "sentence-order" ? activity.questions[0].chips.length : null,
  };
}
