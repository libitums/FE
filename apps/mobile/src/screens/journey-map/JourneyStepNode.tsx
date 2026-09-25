import type { ReactNode } from "@lynx-js/react";

import play from "@libitums/icons/lynx/play";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";
import type { LearningUnitStatus } from "@libitums/ui-lynx/learning-unit";

import { canOpenStep } from "./journey-map";
import type { JourneyStepId, JourneyStepStatus } from "./journey-map";

import "./journey-step-node.css";

// 상태는 props로만 파생됩니다 — 컴포넌트가 자체 상태를 갖지 않습니다.
//
// 표식은 ui-lynx `LearningUnit`이 그립니다. 여기서는 여정 스텝의 어휘를 그 컴포넌트의
// 어휘로 옮기고, 제목 라벨을 아래에 붙이는 일만 합니다 — 라벨은 `LearningUnit`이 갖지
// 않습니다.

// 상태 표입니다. `LearningUnit`의 `available`(열려 있지만 아직 손대지 않음)은 쓰지
// 않습니다 — 여정 스텝은 열리는 순간이 곧 현재 스텝이라 그 자리가 없습니다.
const unitStatusByStatus: Record<JourneyStepStatus, LearningUnitStatus> = {
  done: "clear",
  current: "active",
  locked: "default",
};

// `LearningUnit`은 `clear`·`default`에서 아이콘을 스스로 정합니다(체크·자물쇠). 넘긴
// 아이콘이 쓰이는 것은 `active`뿐이라 여기서는 하나만 줍니다.
const activeIcon = play;

export type JourneyStepProps = {
  id: JourneyStepId;
  title: string;
  status: JourneyStepStatus;
  onSelect: (id: JourneyStepId) => void;
};

export function JourneyStepNode({ id, title, status, onSelect }: JourneyStepProps): ReactNode {
  return (
    // 바깥 상자는 표식과 제목을 세로로 묶는 자리일 뿐입니다 — 탭도 접근성 요소도
    // `LearningUnit`이 집니다. 그래서 여기에는 `data-testid`를 두지 않습니다. 두면
    // 테스트가 실제 탭 대상이 아닌 껍데기를 누르게 됩니다.
    <view className="journey-step-node">
      {/* 접근성 요소는 `LearningUnit`입니다 — 이름 · 상태 접미사 · traits를 그쪽이
          냅니다. 상태를 이름 뒤 접미사로 내는 규약이 같으므로(ADR-0016 D3) 제목만
          넘깁니다. 접미사까지 붙여 넘기면 두 번 붙습니다. */}
      <LearningUnit
        id={id}
        accessibilityLabel={title}
        icon={activeIcon}
        status={unitStatusByStatus[status]}
        bindtap={() => {
          if (canOpenStep(status)) {
            onSelect(id);
          }
        }}
      />
      <text className="journey-step-node-label">{title}</text>
    </view>
  );
}
