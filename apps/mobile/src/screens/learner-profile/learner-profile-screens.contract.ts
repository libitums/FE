// 학습자 프로필 독립 화면 둘(에피소드 전 묻기 · 설정)의 props · testid 타입입니다. 타입만 둡니다.

import type { LearnerProfilePort, LearnerProfileRecord } from "../../lib/learner-profile.contract";

export type LearnerProfileGateScreenProps = {
  readonly port: LearnerProfilePort;
  readonly onSubmit: (record: LearnerProfileRecord) => void;
  readonly onSkip: () => void;
  readonly onCancel: () => void;
};

export type LearnerProfileSettingsScreenProps = {
  readonly record: LearnerProfileRecord | null;
  readonly port: LearnerProfilePort;
  readonly onSubmit: (record: LearnerProfileRecord) => void;
  readonly onExit: () => void;
};

export type LearnerProfileScreenTestId =
  | "learner-profile-gate-screen"
  | "learner-profile-gate-back"
  | "learner-profile-gate-skip"
  | "learner-profile-gate-title"
  | "learner-profile-gate-submit"
  | "learner-profile-screen"
  | "learner-profile-screen-back"
  | "learner-profile-screen-title"
  | "learner-profile-screen-submit";
