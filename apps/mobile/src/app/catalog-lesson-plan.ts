// 카탈로그 유닛의 수업 계획입니다 — 콘텐츠 문항을 학습 화면이 그릴 수 있는 문항으로 바꾸거나 사유와
// 함께 건너뛰고, 같은 학습형이 이어지는 구간을 한 활동으로 묶습니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다(값을 가져오면 메인 스레드 빌드가
// 깨집니다).

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { ConversationCast } from "../lib/conversation-cast";
import { CONTENT_AUDIO_DIR } from "../lib/content-audio";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type { LessonPosition } from "../screens/learning/activity-finish";
import { appended, catalogActivityItemRefsOf, startedBy } from "./catalog-activity-join";
import { catalogCultureCardFor } from "./catalog-culture-map";
import { catalogItemOf } from "./catalog-item-map";
import type {
  CatalogActivity,
  CatalogActivityForm,
  CatalogAudioUrlOf,
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
  CatalogAudioUrlOf,
  CatalogActivityScoring,
  CatalogFill,
  CatalogGlossOf,
  CatalogImageUrlOf,
  CatalogItemPort,
  CatalogItemRef,
  CatalogLessonItemPort,
  CatalogLessonPlan,
  CatalogMappedItem,
  CatalogSkipReason,
  CultureCardItem,
  NonEmpty,
} from "./catalog-lesson-types";
export { catalogItemOf } from "./catalog-item-map";

/** 문항 음성 주소를 풀지 않는 포트 값입니다 — 모든 문항이 소리 없음으로 간다. */
export const noCatalogAudioUrl: CatalogAudioUrlOf = () => null;
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
    "culture-card": "ungraded",
    "syllable-build": "graded",
    "read-aloud": "ungraded",
    "speak-word": "graded",
  };

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

/** 레슨의 출연진(상대 · 학습자)입니다. 이름 · 그림 주소가 없으면 그 키를 싣지 않습니다. */
export function catalogLessonCastOf(
  plan: CatalogLessonPlan,
  learnerName: string,
): ConversationCast {
  const counterpartName = plan.counterpartName.trim();
  const meName = learnerName.trim();
  return {
    counterpart: {
      ...(counterpartName === "" ? {} : { name: counterpartName }),
      ...(plan.counterpartAvatarUrl ? { imageUrl: plan.counterpartAvatarUrl } : {}),
    },
    me: meName === "" ? {} : { name: meName },
  };
}

/** 그 키의 유닛이 없으면 `null`입니다. */
export function catalogLessonPlanOf(
  entry: Extract<CatalogEntry, { status: "ready" }>,
  unitKey: CatalogUnitKey,
  fill: CatalogFill,
  imageUrlOf: CatalogImageUrlOf,
  audioUrlOf: CatalogAudioUrlOf = noCatalogAudioUrl,
): CatalogLessonPlan | null {
  const unit = entry.episode.units.find((candidate) => candidate.id === unitKey);
  if (unit === undefined) return null;
  const port: CatalogLessonItemPort = {
    fill,
    episodeId: entry.id,
    glossOf: catalogGlossOf(entry.episode.words, fill),
    imageUrlOf,
    audioUrlOf,
    // 문화 확인의 짝 카드는 단계를 넘어 찾아야 해서(앞 단계 카드) 계획이 그 에피소드 단계로 닫아 줍니다.
    cultureCardOf: (itemId) => catalogCultureCardFor(entry.episode.units, unitKey, itemId),
  };
  const planned = unit.items.map((item) => ({
    mapped: catalogItemOf(item, port),
    itemType: item.type,
  }));
  const mapped = planned.map((entryItem) => entryItem.mapped);
  const activities = catalogActivitiesOf(mapped);
  const avatar = entry.episode.counterpartAvatar;
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
    counterpartName: entry.episode.counterpart.trim(),
    counterpartAvatarUrl: avatar === undefined ? null : imageUrlOf(avatar),
    itemRefs: catalogActivityItemRefsOf(planned),
  };
}

/**
 * 활동 문항이 레슨 카운터(`Lesson n / N`)에 들어가는가의 표입니다 — 새 학습형이 생기면 tsc가 답을
 * 강제합니다.
 *
 * ⟨2026-10-19⟩ 단어 카드만 빠집니다(ADR-0073). 카드 구간은 세션 헤더 대신 카드 진행 막대를 따로
 * 세우므로, 카운터까지 카드를 세면 카드 일곱 장 뒤 첫 문제가 `Lesson 8 / 13`으로 서서 「아직 한 문제도
 * 안 풀었는데 절반을 왔다」고 읽힙니다. 채점과 같은 표가 아닙니다 — 문화 카드는 채점하지 않아도
 * 세션 헤더 안에서 한 장씩 넘기므로 그대로 셉니다.
 */
export const catalogCountsInLessonCounter: Readonly<Record<CatalogActivityForm, boolean>> = {
  listening: true,
  "sentence-order": true,
  "word-choice": true,
  typing: true,
  "vocab-card": false,
  "pair-match": true,
  "culture-card": true,
  "syllable-build": true,
  "read-aloud": true,
  "speak-word": true,
};

const counterCountOf = (activity: CatalogActivity): number =>
  catalogCountsInLessonCounter[activity.form] ? activity.questions.length : 0;

/**
 * 그 활동이 레슨 안의 어디인가입니다 — 오프셋은 앞 활동들의 카운터 문항 수 합, 전체는 카운터 문항 수
 * (표시 문항에서 단어 카드를 뺀 수), 마지막 활동만 `last`, 활동 수는 계획의 활동 수(완료 카드의 활동
 * 타일)입니다. 레슨 순번은 구획이 알아서 여기서 채우지 않습니다(`render-catalog`). 없는 순번이면 `null`입니다.
 *
 * 분석 이벤트의 `shownItemCount`는 그대로 카드를 셉니다 — 「화면에 무엇이 섰나」의 수이고, 카운터는
 * 「몇 번째 문제인가」의 수라 서로 다른 질문입니다.
 */
export function catalogActivityPositionOf(
  plan: CatalogLessonPlan,
  activityIndex: number,
): LessonPosition | null {
  if (plan.activities[activityIndex] === undefined) return null;
  const offset = plan.activities
    .slice(0, activityIndex)
    .reduce((sum, activity) => sum + counterCountOf(activity), 0);
  return {
    offset,
    total: plan.activities.reduce((sum, activity) => sum + counterCountOf(activity), 0),
    last: activityIndex === plan.activities.length - 1,
    activityCount: plan.activities.length,
  };
}

/** 통과 = 채점 문항의 60% 올림(최소 1)을 맞힘입니다 — 정본은 `@libitums/episode-core/judge`(랜딩 체험판과 공유). */
export { catalogPassCriterion } from "@libitums/episode-core/judge";

/**
 * 통과 기준의 분모 — 판정한 채점 문항 수(= 결과 수, 채점 문항 수 상한)입니다. 건너뛴 말하기 문항은
 * 빠집니다.
 */
export function catalogJudgedCountOf(
  questionCount: number,
  results: readonly AnswerResult[],
): number {
  return Math.min(questionCount, results.length);
}

export function catalogFillOf(content: EpisodeContent, profile: LearnerProfile): CatalogFill {
  return (text, script) => content.fillText(text, profile, script);
}

// 같은 ready 항목 · 프로필 참조 · 키면 같은 계획 참조입니다(자동 넘김 걸음이 문항 참조에 걸려 있어 렌더마다 새로
// 만들면 안 됩니다). 문항 음성은 받은 파일 유무로 풀려(v4) 같은 콘텐츠 참조에서도 달라지므로, 계획을 만들 때 물어본
// 음성 경로와 답을 적어 두고 다시 찾을 때 같은 답일 때만 메모를 씁니다. 상대 아바타 그림도 받은 파일 > 내장 > 원격 순으로
// 풀려 같은 이유로 적어 둡니다. 판정 시점은 레슨 계획을 만드는 때입니다.
type MemoProbe = readonly ["audio" | "image", string, string | null];
type MemoPlan = {
  readonly plan: CatalogLessonPlan | null;
  readonly probes: readonly MemoProbe[];
};
const memo = new WeakMap<object, WeakMap<object, Map<string, MemoPlan>>>();

/** 같은 ready 항목 · 프로필 참조 · 키면 같은 계획 참조를 돌려줍니다(메모). */
export function catalogLessonPlanFor(
  content: EpisodeContent,
  episodeId: string,
  unitKey: CatalogUnitKey,
  profile: LearnerProfile,
): CatalogLessonPlan | null {
  const entry = content.catalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") return null;
  let byProfile = memo.get(entry);
  if (byProfile === undefined) {
    byProfile = new WeakMap();
    memo.set(entry, byProfile);
  }
  let plans = byProfile.get(profile);
  if (plans === undefined) {
    plans = new Map();
    byProfile.set(profile, plans);
  }
  // 재생 모듈이 있고 없고도 계획 모양을 가르므로 키에 넣습니다.
  const sound = content.itemAudioEnabled === true ? "sound" : "mute";
  const planKey = `${sound}:${unitKey}`;
  const cached = plans.get(planKey);
  if (
    cached !== undefined &&
    cached.probes.every(
      ([kind, path, url]) =>
        (kind === "audio" ? content.audioUrlOf(path) : content.imageUrlOf(path)) === url,
    )
  ) {
    return cached.plan;
  }
  const probes: MemoProbe[] = [];
  const probedAudioUrlOf = (path: string): string | null => {
    const url = content.audioUrlOf(path);
    probes.push(["audio", path, url]);
    return url;
  };
  const plan = catalogLessonPlanOf(
    entry,
    unitKey,
    catalogFillOf(content, profile),
    content.imageUrlOf,
    probedAudioUrlOf,
  );
  const avatar = entry.episode.counterpartAvatar;
  if (avatar !== undefined) probes.push(["image", avatar, content.imageUrlOf(avatar)]);
  plans.set(planKey, { plan, probes });
  return plan;
}
