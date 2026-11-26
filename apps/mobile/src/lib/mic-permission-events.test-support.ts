// 마이크 권한 안내 이벤트의 이름 · 견본(ADR-0206 D6) — airbridge 매핑 표(`airbridge-events.test-support`)가 가져다 씁니다.
// 모두 PostHog만(Airbridge로 나가지 않음).
import type { AnalyticsEvent } from "./analytics.contract";

export const micEventNames = [
  "mic_permission_sheet_shown",
  "mic_permission_answered",
  "mic_permission_settings_opened",
] as const;

export const micEventExamples = [
  { name: "mic_permission_sheet_shown", surface: "speak-word", sheet: "prime" },
  { name: "mic_permission_answered", surface: "read-aloud", result: "denied", source: "prompt" },
  { name: "mic_permission_settings_opened", surface: "roleplay" },
] as const satisfies readonly AnalyticsEvent[];
