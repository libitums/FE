// 미션 화면 문구 전체의 언어별 표와 조회입니다 — 문구표(`UiCopy`)에는 목록 카드 몫만 두고(`ui-copy-roleplay-mission-list.ts`),
// 미리보기 · 대화 · 리포트 · 음성 문구는 여기서 고릅니다. 미션 화면만 이 파일을 import하므로, 스위치가 꺼진 release 빌드에서는
// 미션 화면과 함께 빠집니다(`app/roleplay-mission-entry.ts`, ADR-0177 · 번들 천장 ADR-0149).

import { useUiCopy } from "./ui-copy";
import type { UiLanguage } from "./ui-copy.contract";
import { roleplayMissionEn, type RoleplayMissionCopy } from "./ui-copy-roleplay-mission";
import { roleplayMissionEs, roleplayMissionJa } from "./ui-copy-roleplay-mission-es-ja";
import { roleplayMissionId, roleplayMissionVi } from "./ui-copy-roleplay-mission-id-vi";
import { roleplayMissionMy, roleplayMissionTh } from "./ui-copy-roleplay-mission-th-my";
import { roleplayMissionZhTw } from "./ui-copy-roleplay-mission-zh-tw";

export const roleplayMissionCopyTables: Readonly<Record<UiLanguage, RoleplayMissionCopy>> = {
  en: roleplayMissionEn,
  es: roleplayMissionEs,
  ja: roleplayMissionJa,
  id: roleplayMissionId,
  vi: roleplayMissionVi,
  th: roleplayMissionTh,
  my: roleplayMissionMy,
  "zh-TW": roleplayMissionZhTw,
};

/** 지금 화면 언어(문구표의 `learnerProfile.language`)의 미션 문구. 모르는 언어면 영어. */
export function missionCopyFor(language: string): RoleplayMissionCopy {
  return roleplayMissionCopyTables[language as UiLanguage] ?? roleplayMissionEn;
}

export function useMissionCopy(): RoleplayMissionCopy {
  return missionCopyFor(useUiCopy().learnerProfile.language);
}
