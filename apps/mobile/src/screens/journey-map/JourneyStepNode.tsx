import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import play from "@libitums/icons/lynx/play";
import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";

import { canOpenStep, stepAccessibilityLabel } from "./journey-map";
import type { JourneyStepId, JourneyStepStatus } from "./journey-map";

import "./journey-step-node.css";

// LIB-222 (ui): 계약(.agent-harness/work/lib-222/spec.md §1.7)의 속성 전부를 채운다.
// 상태는 props로만 파생된다 — 컴포넌트가 자체 상태를 갖지 않는다(§3.2(a)).

// design.md §1.9 슬롯 「상태별 아이콘」의 정본 — 계약 §1.9 표(모양이 두 번째 채널).
const iconByStatus: Record<JourneyStepStatus, string> = {
  done: tick,
  current: play,
  locked: lock,
};

// design.md §3.1 값 표 — 아이콘 current-color(TS 상수). done·current는 문자 그대로 같은
// 상수(`color.fg["neutral-inverted"]`)다 — 버그가 아니라 design이 고정한 값이다(§3.1 각주).
const iconColorByStatus: Record<JourneyStepStatus, string> = {
  done: color.fg["neutral-inverted"],
  current: color.fg["neutral-inverted"],
  locked: color.fg["neutral-muted"],
};

// 상태 클래스는 base 클래스 뒤에 더해 붙인다(짝 CSS가 base 바로 뒤에 선언한다).
const markerClassByStatus: Record<JourneyStepStatus, string> = {
  done: "journey-step-node-marker journey-step-node-marker-done",
  current: "journey-step-node-marker journey-step-node-marker-current",
  locked: "journey-step-node-marker journey-step-node-marker-locked",
};

// accessibility-traits 표 (계약 §1.7.2, 재고정). 값은 우리가 정하는 어휘가 아니라
// @lynx-js/types가 고정한 union이다 — 잠긴 스텝은 조작 불가하므로 "disabled"다.
const traitsByStatus: Record<JourneyStepStatus, "button" | "disabled"> = {
  done: "button",
  current: "button",
  locked: "disabled",
};

export type JourneyStepProps = {
  id: JourneyStepId;
  title: string;
  status: JourneyStepStatus;
  onSelect: (id: JourneyStepId) => void;
};

export function JourneyStepNode({ id, title, status, onSelect }: JourneyStepProps): ReactNode {
  return (
    <view
      className="journey-step-node"
      data-testid={`journey-step-node-${id}`}
      data-status={status}
      accessibility-element={true}
      accessibility-label={stepAccessibilityLabel(title, status)}
      accessibility-traits={traitsByStatus[status]}
      bindtap={() => {
        if (canOpenStep(status)) {
          onSelect(id);
        }
      }}
    >
      <view className={markerClassByStatus[status]}>
        <svg
          className="journey-step-node-icon"
          data-testid={`journey-step-node-icon-${id}`}
          content={iconByStatus[status]}
          current-color={iconColorByStatus[status]}
        />
      </view>
      <text className="journey-step-node-label">{title}</text>
    </view>
  );
}
