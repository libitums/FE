// 학습 문항 안내의 판정 · 저장입니다. 「누르기만 하는 문항인가」는 화면이 넘긴 데이터
// 필드에서 파생하고, 본 종류는 기기 저장소에 종류 문자열의 JSON 배열로 둡니다.

import type {
  ActivityGuideKindFor,
  LearningItemGuideKind,
  LearningItemGuideKindFor,
  LearningItemGuideSeenStorageKey,
  LoadSeenLearningItemGuides,
  MarkLearningItemGuideSeen,
  SeenLearningItemGuidesFrom,
  ShouldShowLearningItemGuide,
  WithLearningItemGuideSeen,
} from "./learning-item-guide.contract";
import { getItem, isStorageAvailable, setItem } from "./storage";

export const learningItemGuideKinds: readonly LearningItemGuideKind[] = [
  "sentence-order",
  "activity-vocab-card",
  "activity-word-choice",
  "activity-listening",
  "activity-syllable-build",
  "activity-sentence-order",
  "activity-culture-card",
];

export const learningItemGuideSeenStorageKey: LearningItemGuideSeenStorageKey =
  "libitum.learning-item-guides.seen";

export const learningItemGuideKindFor: LearningItemGuideKindFor = (subject) => {
  if (subject === null) return null;
  return subject.chips.length === 1 ? "sentence-order" : null;
};

// 활동 안내는 학습형에만 겁니다(ADR-0104 D1) — 콘텐츠 id를 보지 않아 튜토리얼 본문이 바뀌어도 화면 종류로 뜹니다.
const activityGuideKinds: ReadonlyMap<string, LearningItemGuideKind> = new Map([
  ["vocab-card", "activity-vocab-card"],
  ["word-choice", "activity-word-choice"],
  ["listening", "activity-listening"],
  ["syllable-build", "activity-syllable-build"],
  ["sentence-order", "activity-sentence-order"],
  ["culture-card", "activity-culture-card"],
]);

export const activityGuideKindFor: ActivityGuideKindFor = ({
  form,
  questionCount,
  firstChipCount,
}) => {
  if (questionCount === 0) return null;
  // 문장 만들기의 첫 문항 조각이 하나면 화면 안의 「조각 하나」 안내가 뜨므로 미룹니다.
  if (form === "sentence-order" && (firstChipCount === null || firstChipCount < 2)) return null;
  return activityGuideKinds.get(form) ?? null;
};

function isKnownKind(value: unknown): value is LearningItemGuideKind {
  return learningItemGuideKinds.some((kind) => kind === value);
}

export const seenLearningItemGuidesFrom: SeenLearningItemGuidesFrom = (raw) => {
  if (raw === null || raw === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen: LearningItemGuideKind[] = [];
  for (const value of parsed as unknown[]) {
    if (isKnownKind(value) && !seen.includes(value)) seen.push(value);
  }
  return seen;
};

export const withLearningItemGuideSeen: WithLearningItemGuideSeen = (seen, kind) =>
  seen.includes(kind) ? seen : [...seen, kind];

export const shouldShowLearningItemGuide: ShouldShowLearningItemGuide = ({
  kind,
  seen,
  storageAvailable,
}) => kind !== null && storageAvailable && !seen.includes(kind);

export const loadSeenLearningItemGuides: LoadSeenLearningItemGuides = () => {
  try {
    return seenLearningItemGuidesFrom(getItem(learningItemGuideSeenStorageKey));
  } catch {
    return [];
  }
};

export const markLearningItemGuideSeen: MarkLearningItemGuideSeen = (kind) => {
  try {
    if (!isStorageAvailable()) return;
    const seen = loadSeenLearningItemGuides();
    const next = withLearningItemGuideSeen(seen, kind);
    if (next === seen) return;
    setItem(learningItemGuideSeenStorageKey, JSON.stringify(next));
  } catch {
    // 저장 실패가 화면을 막지 않습니다. 다음에 다시 뜹니다.
  }
};
