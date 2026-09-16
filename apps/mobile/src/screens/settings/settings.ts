// 설정 화면의 순수 로직 자리 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// 계약: .agent-harness/work/lib-259/spec.md §2.4(순수 모듈 계약).
//
// LIB-259 (logic): §2.4가 고정한 동작과 값을 채운다. 계산·분기가 전부 순수
// 함수다 — UI는 결과를 그리기만 한다.

import type {
  ProfileOpenedEvent,
  SessionOptionChangedEvent,
  SettingsNavLabel,
  SettingsNavTarget,
  TermsOpenedEvent,
} from "./settings.contract";
import type { SessionOptionKey } from "../../lib/session-options";

export const settingsNavTargets: readonly SettingsNavTarget[] = ["profile", "terms"];

// export하지 않는다 — 표를 내보내면 다음 사람이 직접 색인해 자기 답을 짓는다
// (`session-options.ts`와 같은 근거).
const settingsNavLabels: Record<SettingsNavTarget, SettingsNavLabel> = {
  profile: "사용자 프로필",
  terms: "개인정보 보호 및 약관",
};

export function settingsNavLabel(target: SettingsNavTarget): SettingsNavLabel {
  return settingsNavLabels[target];
}

// `default` 없는 `switch`다 — target이 늘면 `TS2366`으로 선다(계약 §2.4 · §3 X2).
export function settingsNavOpenedEvent(
  target: SettingsNavTarget,
): ProfileOpenedEvent | TermsOpenedEvent {
  switch (target) {
    case "profile":
      return { name: "profile_opened" };
    case "terms":
      return { name: "terms_opened" };
  }
}

// `value`는 바뀐 뒤 값이다(계약 §7.2) — 호출자가 이미 계산한 다음 값을 그대로
// 싣는다. PII 없음(§3 X6).
export function sessionOptionChangedEvent(
  key: SessionOptionKey,
  value: boolean,
): SessionOptionChangedEvent {
  return { name: "session_option_changed", option: key, value };
}
