// 롤플레이 목록 화면이 미션 항목을 그릴 때 닿는 **번들 입구**입니다(ADR-0193) — 카드 둘째 줄 · 낭독 · 「Report ready」 배지.
// 목록 화면(`screens/roleplay-list/`)은 이 파일을 `__ROLEPLAY_MISSION_IN_BUNDLE__ ? … : …`로만 부르고, `lynx.config.ts`가 이 파일을
// 부수 효과 없는 모듈로 표시해 스위치가 꺼진 release에서는 미션 문구 · 배지가 통째로 빠집니다(앱 쪽 입구 `app/roleplay-mission-entry.ts`와
// 같은 길). 이 파일에 모듈 최상위 부수 효과를 두지 않습니다.

import { missionCopyFor } from "../../lib/ui-copy-roleplay-mission-tables";
import { missionReportBadgeText } from "./mission-report-ready";
import type { MissionReportBadgeState } from "./mission-report-ready";

export { MissionReportReadyBadge } from "./MissionReportReadyBadge";

/** 목록 카드의 형태 낱말(「Mission」). */
export function missionFormLabel(language: string): string {
  return missionCopyFor(language).form;
}

/** 미션 카드 둘째 줄 — 형태 · 목표 수 · 최고 기록(없으면 생략). */
export function missionItemSubtitle(
  item: { readonly goalCount: number; readonly bestScore: number | null },
  language: string,
): string {
  const copy = missionCopyFor(language);
  const goals = `${copy.form} · ${copy.goalCount(item.goalCount)}`;
  return item.bestScore === null ? goals : `${goals} · ${copy.best(item.bestScore)}`;
}

/** 카드 낭독 이름 끝에 붙는 배지 글(「Report ready」 · 「Scoring…」). */
export function missionItemBadgeSpoken(state: MissionReportBadgeState, language: string): string {
  return missionReportBadgeText(state, missionCopyFor(language));
}
