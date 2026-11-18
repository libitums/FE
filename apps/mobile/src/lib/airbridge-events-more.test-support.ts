// airbridge-events 입력 표의 덧붙는 칸입니다(본 표 300줄 상한) — 추천 친구 이벤트(이름 · 견본)와 지운 옛 이벤트. 계약: ADR-0063.
import type { AnalyticsEvent, AnalyticsEventName } from "./analytics.contract";

/** 추천 친구 이벤트 이름 — 본 표의 `allEventNames`가 펼칩니다. */
export const friendEventNames = [
  "friends_strip_shown",
  "friend_profile_opened",
  "friend_added",
  "friend_first_message",
  "friend_return",
] as const satisfies readonly AnalyticsEventName[];

/** 추천 친구 이벤트 견본 — 매핑되지 않는(null) 이벤트입니다. */
export const friendEventExamples = [
  { name: "friends_strip_shown", surface: "chat", daysSinceFirstOpen: "2", count: "4" },
  {
    name: "friend_profile_opened",
    surface: "chat",
    daysSinceFirstOpen: "2",
    characterId: "seoyeon",
    source: "strip",
  },
  { name: "friend_added", surface: "chat", daysSinceFirstOpen: "2", characterId: "seoyeon" },
  {
    name: "friend_first_message",
    surface: "chat",
    daysSinceFirstOpen: "2",
    characterId: "seoyeon",
  },
  { name: "friend_return", surface: "chat", daysSinceFirstOpen: "3", characterId: "seoyeon" },
] as const satisfies readonly AnalyticsEvent[];

/** 지운 여덟 이름의 옛 이벤트입니다 — 어떤 출처로 들어와도 매핑은 null이어야 합니다. 계약 타입에는 이제 없어 단언으로 좁힙니다. */
export const retiredSpecialUnitEvents = [
  { name: "messenger_unit_completed", unitId: "appointment-confirmation", entrySource: "journey" },
  { name: "messenger_unit_completed", unitId: "appointment-confirmation", entrySource: "roleplay" },
  {
    name: "visual_novel_unit_completed",
    unitId: "cafe-arrival-visual-novel",
    entrySource: "journey",
  },
  {
    name: "visual_novel_unit_completed",
    unitId: "cafe-arrival-visual-novel",
    entrySource: "roleplay",
  },
] as unknown as readonly AnalyticsEvent[];
