// 학습 문항 안내의 훅입니다. 화면이 설 때 한 번 판정하고, 닫을 때 그 종류를 기기 저장소에
// 적습니다. 뒤에 입력이 바뀌어도 다시 판정하지 않습니다.

import { useRef, useState } from "@lynx-js/react";

import type {
  LearningItemGuideKind,
  LearningItemGuideState,
  UseActivityGuide,
  UseLearningItemGuide,
} from "../lib/learning-item-guide.contract";
import {
  activityGuideKindFor,
  learningItemGuideKindFor,
  loadSeenLearningItemGuides,
  markLearningItemGuideSeen,
  shouldShowLearningItemGuide,
} from "../lib/learning-item-guide";
import { isStorageAvailable } from "../lib/storage";

/** 종류 하나를 받아 화면이 설 때 한 번 판정하고, 닫을 때 그 종류를 기록하는 공통 훅입니다. */
function useGuideOnce(candidate: LearningItemGuideKind | null): LearningItemGuideState {
  const [kind, setKind] = useState<LearningItemGuideKind | null>(() => {
    if (candidate === null) return null;
    const show = shouldShowLearningItemGuide({
      kind: candidate,
      seen: loadSeenLearningItemGuides(),
      storageAvailable: isStorageAvailable(),
    });
    return show ? candidate : null;
  });
  const closed = useRef(false);

  if (kind === null) {
    const hidden: LearningItemGuideState = { visible: false };
    return hidden;
  }

  const dismiss = () => {
    "background only";
    if (closed.current) return;
    closed.current = true;
    markLearningItemGuideSeen(kind);
    setKind(null);
  };
  return { visible: true, kind, dismiss };
}

export const useLearningItemGuide: UseLearningItemGuide = (subject) =>
  useGuideOnce(learningItemGuideKindFor(subject));

/** 카탈로그 레슨 활동 안내(ADR-0104) — 다시 풀기 화면(`enabled` false)이면 판정하지 않습니다. */
export const useActivityGuide: UseActivityGuide = (subject, enabled) =>
  useGuideOnce(enabled ? activityGuideKindFor(subject) : null);
