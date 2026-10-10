// 학습 문항 안내의 판정 · 저장입니다. 「누르기만 하는 문항인가」는 화면이 넘긴 데이터
// 필드에서 파생하고, 본 종류는 기기 저장소에 종류 문자열의 JSON 배열로 둡니다.

import type {
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
  "messenger",
  "phone-call",
  "visual-novel",
  "speaking",
  "writing",
];

export const learningItemGuideSeenStorageKey: LearningItemGuideSeenStorageKey =
  "libitum.learning-item-guides.seen";

export const learningItemGuideKindFor: LearningItemGuideKindFor = (subject) => {
  if (subject === null) return null;
  switch (subject.form) {
    case "sentence-order":
      return subject.chips.length === 1 ? "sentence-order" : null;
    case "messenger":
      return subject.choices?.length === 1 ? "messenger" : null;
    case "phone-call":
      return "phone-call";
    case "visual-novel":
      return "visual-novel";
    case "speaking":
      return subject.optionalPractice === true ? "speaking" : null;
    case "writing":
      return subject.optionalPractice === true ? "writing" : null;
  }
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
