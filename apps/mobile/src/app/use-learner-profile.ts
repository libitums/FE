// 세션의 학습자 프로필 상태입니다 — 기록 · 치환용 프로필 · 동기화 상태 · 포트 · 물음 여부.

import type {
  LearnerProfilePort,
  LearnerProfilePrompt,
  LearnerProfileRecord,
  LearnerProfileSyncState,
} from "../lib/learner-profile.contract";
import { noLearnerProfilePort } from "../lib/learner-profile";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { noLearnerProfile } from "./catalog-cover-wiring";

export type LearnerProfileValues = {
  readonly learnerFill: LearnerProfile;
  readonly learnerRecord: LearnerProfileRecord | null;
  readonly learnerSync: LearnerProfileSyncState;
  readonly learnerPort: LearnerProfilePort;
};

export type LearnerProfileControls = {
  readonly learnerPrompt: LearnerProfilePrompt;
  /** 저장하고(로그인 전이면 손님 칸) **다음 렌더의 `learnerFill`과 같은 참조**를 돌려줍니다. */
  readonly saveLearnerProfile: (record: LearnerProfileRecord) => LearnerProfile;
  readonly markLearnerProfileAsked: () => void;
  /** 로그인 뒤 부릅니다. 캐시를 곧바로 반영한 다음 서버와 맞춥니다. 던지지 않습니다. */
  readonly syncLearnerProfile: () => Promise<void>;
};

const firstRender: LearnerProfileValues & LearnerProfileControls = {
  learnerFill: noLearnerProfile,
  learnerRecord: null,
  learnerSync: "none",
  learnerPort: noLearnerProfilePort,
  learnerPrompt: "open",
  saveLearnerProfile: () => noLearnerProfile,
  markLearnerProfileAsked: () => undefined,
  syncLearnerProfile: async () => undefined,
};

export function useLearnerProfile(): LearnerProfileValues & LearnerProfileControls {
  return firstRender;
}
