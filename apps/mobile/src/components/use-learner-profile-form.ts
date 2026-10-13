// 학습자 프로필 양식의 상태를 묶는 훅입니다 — 초안 리듀서 · 보일 오류 · 미리보기 · 나라 줄 · 제출.

import { initialLearnerProfileDraft, learnerProfilePreviewFor } from "../lib/learner-profile-form";
import type { LearnerProfilePort, LearnerProfileRecord } from "../lib/learner-profile.contract";
import type { LearnerProfileForm } from "./learner-profile.contract";

export function useLearnerProfileForm(input: {
  readonly initial: LearnerProfileRecord | null;
  readonly port: LearnerProfilePort;
  /** 이름이 빈 채 저장했을 때 이름 칸에 설 문구입니다(진입점이 고릅니다). */
  readonly emptyMessage: string;
}): LearnerProfileForm {
  const draft = initialLearnerProfileDraft(input.initial);
  return {
    draft,
    nameIssue: null,
    countryIssue: null,
    selectedCountry: null,
    preview: learnerProfilePreviewFor(draft, input.port),
    rows: [],
    onEvent: () => undefined,
    submit: () => ({ kind: "empty" }),
    noticeIncomplete: () => undefined,
  };
}
