// 가입 직후 ④ 출생 연도의 결선입니다(ADR-0059 · ADR-0125 개정 2026-11-27). 언어 선택 다음, 여정 입구 앞에 섭니다.
//
// 저장은 메신저 대화 출처의 `setBirthYear` 한 길입니다 — 기기(계정마다)에 적고 서버 `companion_save_profile`(age_source
// "self")로 보냅니다. 서버 저장이 실패해도 기기 값이 남아, 다음에 출처를 세울 때 서버가 비어 있으면 다시 보냅니다
// (`chat-fixture-birth-year.ts`). 같은 값이 출처 스냅숏에도 들어가 메신저 방은 생년 시트를 다시 띄우지 않습니다.

import type { Dispatch } from "@lynx-js/react";

import { entryScreenViewedEvent } from "../lib/entry-flow";
import type { EntryEventSink } from "../lib/entry-flow";
import type { NavAction } from "./nav-state";

export type EntryBirthYearWiringArgs = {
  readonly entryEventSink: EntryEventSink;
  readonly dispatch: Dispatch<NavAction>;
  /** 고른 연도를 적습니다 — 앱은 대화 출처의 `setBirthYear`. 던지지 않습니다. */
  readonly saveBirthYear: (year: number) => void;
};

export type EntryBirthYearWiring = {
  readonly onContinueLearnerBirthYear: (year: number) => void;
  readonly onLearnerBirthYearBack: () => void;
};

export function entryBirthYearWiring({
  entryEventSink,
  dispatch,
  saveBirthYear,
}: EntryBirthYearWiringArgs): EntryBirthYearWiring {
  return {
    // ④의 Continue — 저장 → 여정 입구 열람 → push. 저장은 기다리지 않습니다(실패해도 기기 값으로 다음에 다시 보냅니다).
    onContinueLearnerBirthYear: (year) => {
      saveBirthYear(year);
      entryEventSink?.(entryScreenViewedEvent("journey-entry"));
      dispatch({ type: "push", screen: { name: "journey-entry" } });
    },
    // ④의 뒤로 — 저장 없이 ③ 언어 선택으로.
    onLearnerBirthYearBack: () => {
      dispatch({ type: "back" });
    },
  };
}
