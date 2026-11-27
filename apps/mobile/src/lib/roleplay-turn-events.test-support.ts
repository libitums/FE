// 롤플레이 이벤트(열림 · 끝 · 턴 결과 — ADR-0201 D6 적용 2)의 이름 · 견본 — airbridge 매핑 표(`airbridge-events.test-support`)가 줄 수 한도 안에서
// 가져다 씁니다. PostHog만(Airbridge로 나가지 않음).
import type { AnalyticsEvent } from "./analytics.contract";

export const roleplayTurnEventNames = [
  "roleplay_story_opened",
  "roleplay_story_completed",
  "roleplay_story_turn_answered",
] as const;

export const roleplayTurnEventExamples = [
  { name: "roleplay_story_opened", episodeId: "u01-water" },
  {
    name: "roleplay_story_completed",
    episodeId: "u01-water",
    correctCount: "2",
    judgedCount: "3",
    skippedCount: "0",
  },
  {
    name: "roleplay_story_turn_answered",
    episodeId: "u01-water",
    turn: "2",
    result: "correct",
    grade: "close",
    hintUsed: "listen",
  },
  { name: "roleplay_story_turn_answered", episodeId: "u01-water", turn: "3", result: "skipped" },
] as const satisfies readonly AnalyticsEvent[];
