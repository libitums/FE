// 카탈로그 레슨 활동 위의 첫 안내 층입니다(ADR-0104). 학습형으로 판정하고(콘텐츠 id를 보지 않음), 안내가 떠 있으면
// 자식 활동의 `LearningShell`에 컨텍스트로 「덮임」을 알려 낭독에서 가리게 합니다. 안내는 활동 뒤의 형제로 화면 전체를
// 덮고 탭 · 뒤로가기로 닫힙니다. 판정이 「안내 없음」이면 층 밖과 같습니다(컨텍스트 `undefined`).

import type { ReactNode } from "@lynx-js/react";

import { LearningItemGuide } from "../components/LearningItemGuide";
import { useActivityGuide } from "../components/use-learning-item-guide";
import { activityGuideKindFor } from "../lib/learning-item-guide";
import type { ActivityGuideSubject } from "../lib/learning-item-guide.contract";
import { LearningGuideObscuredContext } from "../screens/learning/learning-guide-obscured";

export type CatalogActivityGuideLayerProps = {
  /** 판정 입력 — 학습형 · 문항 수 · 첫 문항 조각 수뿐입니다. */
  readonly subject: ActivityGuideSubject;
  /** 다시 풀기 화면이면 false — 안내를 띄우지 않습니다(D2). */
  readonly enabled: boolean;
  readonly children: ReactNode;
};

export function CatalogActivityGuideLayer({
  subject,
  enabled,
  children,
}: CatalogActivityGuideLayerProps): ReactNode {
  const guide = useActivityGuide(subject, enabled);
  // 대상 종류가 있는 활동에서만 층이 컨텍스트를 줍니다 — 이미 본 종류여도 false를 써서 복원이 보장됩니다.
  const targeted = enabled && activityGuideKindFor(subject) !== null;
  return (
    <LearningGuideObscuredContext.Provider value={targeted ? guide.visible : undefined}>
      {children}
      {guide.visible ? <LearningItemGuide kind={guide.kind} onDismiss={guide.dismiss} /> : null}
    </LearningGuideObscuredContext.Provider>
  );
}
