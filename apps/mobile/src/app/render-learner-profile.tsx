// 학습자 프로필(이름 · 나라) route 둘 — 에피소드 전 묻기 화면과 설정 수정 화면을 화면으로 옮깁니다. 설정 목록 줄의
// 설명(지금 값 · `Not set` · 기기에만 저장됨)도 여기서 만듭니다.

import type { ReactNode } from "@lynx-js/react";

import { learnerProfileSummary } from "../lib/learner-profile-form";
import { uiCopyFor } from "../lib/ui-copy";
import { LearnerProfileGateScreen } from "../screens/learner-profile/LearnerProfileGateScreen";
import { LearnerProfileSettingsScreen } from "../screens/learner-profile/LearnerProfileSettingsScreen";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

export function renderLearnerProfileGate(
  screen: Extract<Screen, { name: "learner-profile-gate" }>,
  wiring: ScreenWiring,
): ReactNode {
  const { episodeId, unitKey } = screen;
  return (
    <LearnerProfileGateScreen
      key={`${episodeId}:${unitKey}`}
      port={wiring.learnerPort}
      onSubmit={(record) =>
        wiring.onResolveLearnerProfileGate(episodeId, unitKey, { kind: "saved", record })
      }
      onSkip={() => wiring.onResolveLearnerProfileGate(episodeId, unitKey, { kind: "skipped" })}
      onCancel={wiring.onCancelLearnerProfileGate}
    />
  );
}

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
