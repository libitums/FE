// 학습 문항 안내의 훅입니다. 화면이 설 때 한 번 판정하고, 닫을 때 그 종류를 기기 저장소에
// 적습니다. 뒤에 입력이 바뀌어도 다시 판정하지 않습니다.

import { useRef, useState } from "@lynx-js/react";

import type {
  LearningItemGuideKind,
  LearningItemGuideState,
  UseLearningItemGuide,
} from "../lib/learning-item-guide.contract";
import {
  learningItemGuideKindFor,
  loadSeenLearningItemGuides,
  markLearningItemGuideSeen,
  shouldShowLearningItemGuide,
} from "../lib/learning-item-guide";
import { isStorageAvailable } from "../lib/storage";

export const useLearningItemGuide: UseLearningItemGuide = (subject) => {
  const [kind, setKind] = useState<LearningItemGuideKind | null>(() => {
    const candidate = learningItemGuideKindFor(subject);
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
};
