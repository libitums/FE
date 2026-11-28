import type { ReactNode } from "@lynx-js/react";

import { useMissionCopy } from "../../lib/ui-copy-roleplay-mission-tables";
import { missionReportBadgeText } from "./mission-report-ready";
import type { MissionReportBadgeState } from "./mission-report-ready";
import { missionTestIds as ids } from "./mission-test-ids";

import "./roleplay-mission-badge.css";

export type MissionReportReadyBadgeProps = {
  readonly missionId: string;
  readonly state: MissionReportBadgeState;
};

/**
 * 목록 카드의 「Report ready」 표시(채점 대기 판, ADR-0193) — 카드 둘째 줄과 같은 글꼴의 작은 알약 하나. 낭독은 카드가 묶어 읽으므로
 * 이 요소는 숨깁니다(카드의 접근성 이름에 `missionReportBadgeText`를 덧붙임). 롤플레이 목록 카드가 미션 항목에서 그립니다.
 */
export function MissionReportReadyBadge({
  missionId,
  state,
}: MissionReportReadyBadgeProps): ReactNode {
  const copy = useMissionCopy();
  return (
    <view
      className={`mission-report-badge${state === "ready" ? " mission-report-badge-ready" : ""}`}
      data-testid={ids.reportReady(missionId)}
      data-state={state}
      accessibility-elements-hidden={true}
    >
      <text className="mission-report-badge-text">{missionReportBadgeText(state, copy)}</text>
    </view>
  );
}
