// 학습자 프로필(이름 · 나라) 설정 수정 route를 화면으로 옮깁니다(가입 직후 ① · ② 는 `render-entry-screen.tsx`). 설정 목록 줄의
// 설명(지금 값 · `Not set` · 기기에만 저장됨)도 여기서 만듭니다.

import type { ReactNode } from "@lynx-js/react";

import { learnerProfileSummary } from "../lib/learner-profile-form";
import { uiCopyFor } from "../lib/ui-copy";
import { LearnerProfileSettingsScreen } from "../screens/learner-profile/LearnerProfileSettingsScreen";
import type { ScreenWiring } from "./screen-wiring";

export function renderLearnerProfileSettings(wiring: ScreenWiring): ReactNode {
  return (
    <LearnerProfileSettingsScreen
      record={wiring.learnerRecord}
      port={wiring.learnerPort}
      onSubmit={wiring.onSubmitLearnerProfile}
      onExit={wiring.onExitSettingsStack}
    />
  );
}

/** 설정 목록의 「레슨에 쓰는 이름 · 나라」 줄 설명입니다. */
export function learnerSettingsSummary(wiring: ScreenWiring): string {
  return learnerProfileSummary(
    wiring.learnerRecord,
    wiring.learnerSync,
    wiring.learnerPort,
    uiCopyFor(wiring.entryLanguage).learnerProfile,
  );
}
