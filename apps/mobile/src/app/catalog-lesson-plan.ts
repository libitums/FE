// 카탈로그 유닛의 수업 계획입니다 — 콘텐츠 문항을 학습 화면이 그릴 수 있는 문항으로 바꾸거나 사유와
// 함께 건너뛰고, 같은 학습형이 이어지는 구간을 한 활동으로 묶습니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다(값을 가져오면 메인 스레드 빌드가
// 깨집니다).

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type { AssessmentPassCriterion } from "../screens/assessment/assessment";
import type { LessonPosition } from "../screens/learning/activity-finish";
import { catalogItemOf } from "./catalog-item-map";
import { noLearnerProfile } from "./catalog-cover-wiring";
import type {
  CatalogActivity,
  CatalogActivityForm,
  CatalogActivityScoring,
  CatalogFill,
  CatalogImageUrlOf,
  CatalogLessonItemPort,
  CatalogLessonPlan,
  CatalogMappedItem,
} from "./catalog-lesson-types";
import { catalogGlossOf } from "./catalog-card-map";
import type { EpisodeContent } from "./episode-content";

export type {
  CatalogActivity,
  CatalogActivityForm,
  CatalogActivityScoring,
  CatalogFill,
  CatalogGlossOf,
  CatalogImageUrlOf,
  CatalogItemPort,
  CatalogLessonItemPort,
  CatalogLessonPlan,
  CatalogMappedItem,
  CatalogSkipReason,
  NonEmpty,
} from "./catalog-lesson-types";
export { catalogItemOf } from "./catalog-item-map";
export { shuffledOrder } from "./catalog-shuffle";

/** 활동 문항이 채점되는가의 표입니다 — 새 학습형이 생기면 tsc가 답을 강제합니다. */
export const catalogActivityScoring: Readonly<Record<CatalogActivityForm, CatalogActivityScoring>> =
  {
    listening: "graded",
    "sentence-order": "graded",
    "word-choice": "graded",
    typing: "graded",
    "vocab-card": "ungraded",
    "pair-match": "graded",
  };

type PlayableItem = Exclude<CatalogMappedItem, { kind: "skipped" }>;

/** 학습형이 같으면 앞 활동에 잇고, 아니면 `null`입니다. */
function appended(last: CatalogActivity, item: PlayableItem): CatalogActivity | null {
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
  }
}

function startedBy(item: PlayableItem): CatalogActivity {
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
  }
}

/** 건너뜀을 빼고, 같은 학습형이 이어지는 구간을 한 활동으로 묶습니다. */
export function catalogActivitiesOf(
  items: readonly CatalogMappedItem[],
): readonly CatalogActivity[] {
  const activities: CatalogActivity[] = [];
  for (const item of items) {
    if (item.kind === "skipped") continue;
    const last = activities[activities.length - 1];
    const joined = last === undefined ? null : appended(last, item);
    if (joined === null) {
      activities.push(startedBy(item));
    } else {
      activities[activities.length - 1] = joined;
    }
  }
  return activities;
}

/** 그 키의 유닛이 없으면 `null`입니다. */
export function catalogLessonPlanOf(
  entry: Extract<CatalogEntry, { status: "ready" }>,
  unitKey: CatalogUnitKey,
  fill: CatalogFill,
  imageUrlOf: CatalogImageUrlOf,
): CatalogLessonPlan | null {
  const unit = entry.episode.units.find((candidate) => candidate.id === unitKey);
  if (unit === undefined) return null;
  const port: CatalogLessonItemPort = {
    fill,
    episodeId: entry.id,
    glossOf: catalogGlossOf(entry.episode.words, fill),
    imageUrlOf,
  };
  const mapped = unit.items.map((item) => catalogItemOf(item, port));
  const activities = catalogActivitiesOf(mapped);
  const countOf = (activity: CatalogActivity): number => activity.questions.length;
  return {
    episodeId: entry.id,
    unitKey,
    activities,
    questionCount: activities
      .filter((activity) => catalogActivityScoring[activity.form] === "graded")
      .reduce((sum, activity) => sum + countOf(activity), 0),
    shownItemCount: activities.reduce((sum, activity) => sum + countOf(activity), 0),
    skippedItemCount: mapped.filter((item) => item.kind === "skipped").length,
  };
}

/**
 * 그 활동이 레슨 안의 어디인가입니다 — 오프셋은 앞 활동들의 문항 수 합, 전체는 표시 문항 수, 마지막
 * 활동만 `last`입니다. 없는 순번이면 `null`입니다.
 */
export function catalogActivityPositionOf(
  plan: CatalogLessonPlan,
  activityIndex: number,
): LessonPosition | null {
  if (plan.activities[activityIndex] === undefined) return null;
  const offset = plan.activities
    .slice(0, activityIndex)
    .reduce((sum, activity) => sum + activity.questions.length, 0);
  return {
    offset,
    total: plan.shownItemCount,
    last: activityIndex === plan.activities.length - 1,
  };
}

/** 통과 = 채점 문항의 60% 올림(최소 1)을 맞힘입니다. 채점할 문항이 없으면 0 — 막지 않습니다. */
export function catalogPassCriterion(questionCount: number): AssessmentPassCriterion {
  if (questionCount <= 0) return { minCorrectCount: 0 };
  return { minCorrectCount: Math.max(1, Math.floor((3 * questionCount + 4) / 5)) };
}

export function catalogFillOf(content: EpisodeContent, profile: LearnerProfile): CatalogFill {
  return (text, script) => content.fillText(text, profile, script);
}

// 같은 ready 항목 참조 + 같은 키면 같은 계획 참조입니다 — 활동 화면의 자동 넘김 걸음이 문항 참조에
// 걸려 있어, 렌더마다 새 문항을 만들면 관계없는 리렌더가 기다림을 되돌립니다.
const memo = new WeakMap<object, Map<string, CatalogLessonPlan | null>>();

/** 같은 ready 항목 참조 + 같은 키면 같은 계획 참조를 돌려줍니다(메모). */
export function catalogLessonPlanFor(
  content: EpisodeContent,
  episodeId: string,
  unitKey: CatalogUnitKey,
  _profile: LearnerProfile,
): CatalogLessonPlan | null {
  const entry = content.catalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") return null;
  let plans = memo.get(entry);
  if (plans === undefined) {
    plans = new Map();
    memo.set(entry, plans);
  }
  if (plans.has(unitKey)) return plans.get(unitKey) ?? null;
  const plan = catalogLessonPlanOf(
    entry,
    unitKey,
    catalogFillOf(content, noLearnerProfile),
    content.imageUrlOf,
  );
  plans.set(unitKey, plan);
  return plan;
}
