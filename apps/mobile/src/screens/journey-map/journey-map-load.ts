import type { JourneyMapItemStatus, JourneyMapNodeStatus } from "./journey-map-types";
import type {
  JourneyMapNodeAccess,
  JourneyMapProgressLoad,
  JourneyProgressLoadRowProps,
  ProgressLoadCopy,
} from "./journey-map-load.contract";

/** 진행을 이미 아는 상태입니다. 기본값 동일성을 위해 모듈 상수로 둡니다. */
export const knownProgressLoad: JourneyMapProgressLoad = { status: "known" };

// 응답을 기다리는 동안(`checking` · `loading`)만 노드를 막습니다. 실패 · 재시도 중에는 열어 둡니다 —
// 그때 진행은 씨앗(또는 미전송분)이라 열리는 것은 첫 구획의 표지 하나뿐이고, 나중에 합쳐도 줄지 않습니다.
const accessByStatus: Readonly<Record<JourneyMapProgressLoad["status"], JourneyMapNodeAccess>> = {
  known: "open",
  checking: "checking",
  loading: "checking",
  retrying: "open",
  failed: "open",
};

export function nodeAccessOf(load: JourneyMapProgressLoad): JourneyMapNodeAccess {
  return accessByStatus[load.status];
}

export function mapNodeStatusUnder(
  access: JourneyMapNodeAccess,
  status: JourneyMapItemStatus,
): JourneyMapNodeStatus {
  return access === "checking" ? "checking" : status;
}

// 표로 둡니다 — 상태가 하나 늘면 tsc가 그 상태의 답을 쓰라고 강제합니다. 부정형 비교는 새 상태를
// 조용히 통과시킵니다.
const selectableByStatus: Readonly<Record<JourneyMapNodeStatus, boolean>> = {
  locked: false,
  available: true,
  completed: true,
  checking: false,
};

export function canSelectMapNode(status: JourneyMapNodeStatus): boolean {
  return selectableByStatus[status];
}

/**
 * 줄이 서거나 상태가 바뀔 때 읽을 문구입니다. 재시도 누름(실패 → 로딩)도 읽습니다 — 버튼이 사라져
 * 포커스를 잃는 순간 무엇이 일어났는지 들려줍니다. 같은 상태는 `null`입니다.
 */
export function progressLoadRowAnnouncementFor(
  previous: JourneyProgressLoadRowProps["status"] | null,
  next: JourneyProgressLoadRowProps["status"],
  copy: ProgressLoadCopy,
): string | null {
  if (previous === next) return null;
  return next === "failed" ? copy.failed : copy.loadingAnnouncement;
}
