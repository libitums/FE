// 학습자 프로필 양식의 상태를 묶는 훅입니다 — 초안 리듀서 · 보일 오류 · 미리보기 · 나라 줄 · 제출.

import { useEffect, useReducer } from "@lynx-js/react";

import { announce } from "../lib/accessibility";
import {
  initialLearnerProfileDraft,
  learnerCountryRowsOf,
  learnerProfileDraftReducer,
  learnerProfileDraftStatus,
  learnerProfilePreviewFor,
  visibleLearnerCountryIssue,
  visibleLearnerNameIssue,
} from "../lib/learner-profile-form";
import type { LearnerProfilePort, LearnerProfileRecord } from "../lib/learner-profile.contract";
import { useUiCopy } from "../lib/ui-copy";
import type { LearnerProfileDraftEvent, LearnerProfileForm } from "./learner-profile.contract";

export function useLearnerProfileForm(input: {
  readonly initial: LearnerProfileRecord | null;
  readonly port: LearnerProfilePort;
  /** 이름이 빈 채 저장했을 때 이름 칸에 설 문구입니다(진입점이 고릅니다). */
  readonly emptyMessage: string;
}): LearnerProfileForm {
  const { port, emptyMessage } = input;
  const copy = useUiCopy().learnerProfile;
  const [draft, dispatch] = useReducer(
    learnerProfileDraftReducer,
    input.initial,
    initialLearnerProfileDraft,
  );
  const nameIssue = visibleLearnerNameIssue(draft, port);
  const nameIssueMessage =
    nameIssue === null ? null : nameIssue === "empty" ? emptyMessage : copy.nameIssue[nameIssue];

  // 금지 문자 · 길이는 치는 즉시 서므로 서는 순간 한 번 읽어 줍니다. 빈 값은 저장을 누른 쪽이 읽습니다.
  useEffect(() => {
    if (nameIssue !== null && nameIssue !== "empty") announce(copy.nameIssue[nameIssue]);
  }, [nameIssue, copy]);

  function onEvent(event: LearnerProfileDraftEvent) {
    dispatch(event);
    // 검색해서 고른 경우에만 확정을 읽습니다 — 앞서 읽은 결과 수를 이어 마무리하는 말입니다.
    if (event.type === "country-chosen" && draft.query.trim() !== "") {
      const country = port.byCode(event.code);
      if (country !== null) announce(copy.picker.countrySet(country.en));
    }
  }

  function submit() {
    const status = learnerProfileDraftStatus(draft, port);
    if (status.kind === "invalid") announce(copy.nameIssue[status.issue]);
    return status;
  }

  function noticeIncomplete() {
    const status = learnerProfileDraftStatus(draft, port);
    dispatch({ type: "incomplete-noticed" });
    announce(
      status.kind === "incomplete" && status.missing === "country"
        ? copy.countryMissing
        : emptyMessage,
    );
  }

  return {
    draft,
    nameIssue,
    nameIssueMessage,
    countryIssue: visibleLearnerCountryIssue(draft, port),
    selectedCountry: draft.countryCode === null ? null : port.byCode(draft.countryCode),
    preview: learnerProfilePreviewFor(draft, port),
    rows: draft.view === "picker" ? learnerCountryRowsOf(port, draft.query, draft.countryCode) : [],
    onEvent,
    submit,
    noticeIncomplete,
  };
}
