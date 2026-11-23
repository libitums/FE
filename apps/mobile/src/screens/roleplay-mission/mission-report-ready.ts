// 채점 대기 판(`pendingReports`, ADR-0177)의 목록 표시 규칙입니다 — UI를 import하지 않습니다. 목록 카드(롤플레이 목록 화면)가
// 「Report ready」를 붙일지 · 무엇을 붙일지를 여기서 고릅니다. 카드를 누르면 미션 route가 곧장 `mission-finish` → 리포트로 엽니다.

import type { RoleplayMissionCopy } from "../../lib/ui-copy-roleplay-mission";
import type { MissionList } from "./roleplay-mission.contract";

/** 카드 표시 — 리포트 준비됨(채점 대기) · 채점 중. 없으면 `null`(표시 없음). */
export type MissionReportBadgeState = "ready" | "grading";

/** 이 미션의 채점 대기 판 — 여럿이면 목록 순서의 첫째. 없으면 `null`. */
export function pendingReportOf(
  list: MissionList | null,
  missionId: string,
): { readonly conversationId: string; readonly endedAt: string | null } | null {
  const found = list?.pendingReports?.find((entry) => entry.missionId === missionId);
  return found === undefined
    ? null
    : { conversationId: found.conversationId, endedAt: found.endedAt };
}

/** 카드에 붙일 표시 — 채점 중인 판이면 `grading`, 대기 판이 있으면 `ready`. */
export function missionReportBadgeOf(
  list: MissionList | null,
  missionId: string,
  gradingConversationId: string | null = null,
): MissionReportBadgeState | null {
  const pending = pendingReportOf(list, missionId);
  if (pending === null) return null;
  return pending.conversationId === gradingConversationId ? "grading" : "ready";
}

/** 표시의 글 — 카드의 접근성 이름에 덧붙일 때도 이것을 씁니다(「…, Report ready」). */
export function missionReportBadgeText(
  state: MissionReportBadgeState,
  copy: RoleplayMissionCopy,
): string {
  return copy.extra.reportReady[state];
}
