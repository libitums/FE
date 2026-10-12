import type { ReactNode } from "@lynx-js/react";

import flag from "@libitums/icons/lynx/flag";
import play from "@libitums/icons/lynx/play";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import { useUiCopy } from "../../lib/ui-copy";
import { catalogLockedNodeAccessibilityLabel, catalogLockedNodeTitle } from "./catalog-map";
import type { CatalogLockedUnitNodeProps } from "./catalog-map.contract";

import "./journey-special-unit.css";

// 준비 중인 유닛 노드입니다 — 늘 잠겨 있고 눌러도 아무 일이 없습니다(`bindtap`을 주지 않습니다).
// 학습 유닛은 `play`, 최종 테스트는 `flag` 아이콘이지만 잠긴 동안은 `LearningUnit`이 자물쇠를 그립니다.
export function CatalogLockedUnitNode({ episodeId, node }: CatalogLockedUnitNodeProps): ReactNode {
  const copy = useUiCopy();
  const isFinal = node.role === "final";

  return (
    <view className="journey-special-unit">
      <LearningUnit
        id={`catalog-unit-${episodeId}-${node.key}`}
        accessibilityLabel={catalogLockedNodeAccessibilityLabel(node, copy)}
        icon={isFinal ? flag : play}
        status="default"
        narrative={isFinal ? "narrative" : "none"}
      />
      <text className="journey-special-unit-label">{catalogLockedNodeTitle(node, copy)}</text>
    </view>
  );
}
