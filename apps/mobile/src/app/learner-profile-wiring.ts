// 학습자 프로필의 설정 결선입니다 — 설정의 「Name and country in lessons」 저장. 가입 직후 ① 이름 · ② 나라는
// 진입 흐름(`entry-wiring.ts`)이 집니다. 에피소드 전 가드는 2026-10-20에 걷었습니다(ADR-0059 D7 적용 기록).

import type { Dispatch } from "@lynx-js/react";

import { learnerProfileSavedEvent, sameLearnerProfile } from "../lib/learner-profile";
import type { LearnerProfileRecord } from "../lib/learner-profile.contract";
import type { SettingsEventSink } from "../screens/settings/settings.contract";
import type { NavAction } from "./nav-state";

export type LearnerProfileWiring = {
  readonly onSubmitLearnerProfile: (record: LearnerProfileRecord) => void;
};

export type LearnerProfileWiringArgs = {
  readonly learnerRecord: LearnerProfileRecord | null;
  readonly saveLearnerProfile: (record: LearnerProfileRecord) => unknown;
  readonly settingsEventSink: SettingsEventSink;
  readonly dispatch: Dispatch<NavAction>;
};

export function learnerProfileWiring(args: LearnerProfileWiringArgs): LearnerProfileWiring {
  return {
    // 같은 값을 다시 누른 것은 저장도 이벤트도 아닙니다. 어느 쪽이든 설정 목록으로 돌아갑니다.
    onSubmitLearnerProfile: (record) => {
      if (!sameLearnerProfile(args.learnerRecord, record)) {
        args.saveLearnerProfile(record);
        args.settingsEventSink?.(learnerProfileSavedEvent("settings", args.learnerRecord));
      }
      args.dispatch({ type: "backToRoot" });
    },
  };
}
