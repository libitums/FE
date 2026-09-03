import type { ReactNode } from "@lynx-js/react";

import "./step-sheet.css";

// LIB-222 (ui): 계약(.agent-harness/work/lib-222/spec.md §1.7)의 속성 전부를 채운다.
// `시작`에 bindtap을 붙이지 않는다 — 학습 화면이 범위 밖이라 목적지가 없다(§1.7).
// 이 무동작은 §3.2(b)-6이 실행 가능한 형태로 단언한다.
export type StepSheetProps = {
  title: string;
  description: string;
  onClose: () => void;
};

export function StepSheet({ title, description, onClose }: StepSheetProps): ReactNode {
  return (
    <view className="step-sheet">
      {/* design.md §5.2 — 딤 토큰이 없어 배경을 선언하지 않는다. 존재 이유는 하나,
          맵으로 가는 탭을 가로채는 것이다. `bindtap`이 없어도 트리에 얹혀 시각적으로
          맵 위에 겹치고(§5.1 z-index), 손가락도 받는다.

          배경 없는 `<view>`가 hit-testing에서 빠질 것을 의심해 `docs/e2e/journey-map.md`
          5번으로 걸었고, 2026-09-03 iPhone 13 mini · iOS 26.6.1 Release에서 통과했다.
          맵에 시트 열림 가드가 없어(`JourneyMapScreen`의 스텝 노드는 시트가 떠 있어도
          `bindtap`이 살아 있다) 그때 손가락을 막은 것은 이 가림막 하나뿐이다. 그래서 빈
          `bindtap`을 얹지 않는다 — 증명된 메커니즘 위에 죽은 핸들러를 올리면 5번이
          무엇을 증명했는지가 흐려진다 (PR #34 리뷰). */}
      <view className="step-sheet-scrim" accessibility-elements-hidden={true} />
      <view className="step-sheet-panel" data-testid="step-sheet-panel">
        <text
          className="step-sheet-title"
          data-testid="step-sheet-title"
          accessibility-traits="header"
        >
          {title}
        </text>
        <text className="step-sheet-description" data-testid="step-sheet-description">
          {description}
        </text>
        <view
          className="step-sheet-start"
          data-testid="step-sheet-start"
          accessibility-element={true}
          accessibility-label="시작"
          accessibility-traits="button"
        >
          <text className="step-sheet-start-label">시작</text>
        </view>
        <view
          className="step-sheet-close"
          data-testid="step-sheet-close"
          accessibility-element={true}
          accessibility-label="닫기"
          accessibility-traits="button"
          bindtap={onClose}
        >
          <text className="step-sheet-close-label">닫기</text>
        </view>
      </view>
    </view>
  );
}
