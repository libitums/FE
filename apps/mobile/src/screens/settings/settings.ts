// 설정 화면의 순수 로직을 소유합니다. 계산·분기가 전부 순수 함수입니다 —
// UI는 결과를 그리기만 합니다(ADR-0006 D4 — 순수 로직은 unit 계층 대상).

import type { UiCopy } from "../../lib/ui-copy.contract";
import { legalDocumentOpenedEvent } from "../../lib/legal-document";
import type { LegalDocumentOpenedEvent } from "../../lib/legal-document.contract";
import type {
  ProfileOpenedEvent,
  SessionOptionChangedEvent,
  SettingsNavTarget,
} from "./settings.contract";
import type { SessionOptionKey } from "../../lib/session-options";

export const settingsNavTargets: readonly SettingsNavTarget[] = [
  "profile",
  "privacy-policy",
  "terms-of-use",
];

export function settingsNavLabel(target: SettingsNavTarget, copy: UiCopy): string {
  return copy.settings.nav[target];
}

// `default` 없는 `switch`입니다 — target이 늘면 `TS2366`으로 섭니다.
export function settingsNavOpenedEvent(
  target: SettingsNavTarget,
): ProfileOpenedEvent | LegalDocumentOpenedEvent {
  switch (target) {
    case "profile":
      return { name: "profile_opened" };
    case "privacy-policy":
    case "terms-of-use":
      return legalDocumentOpenedEvent(target, "settings");
  }
}

// `value`는 바뀐 뒤 값입니다 — 호출자가 이미 계산한 다음 값을 그대로 싣습니다.
// 개인식별정보는 싣지 않습니다.
export function sessionOptionChangedEvent(
  key: SessionOptionKey,
  value: boolean,
): SessionOptionChangedEvent {
  return { name: "session_option_changed", option: key, value };
}
