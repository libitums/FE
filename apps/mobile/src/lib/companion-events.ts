// 엽전 · 메신저 · 영역 이벤트를 보내는 자리입니다(ADR-0029 「D3 목적 구분」). 보내는 쪽은 날 수를 빼고 넘기고, 여기서 붙입니다.
// 첫 경험 마일스톤(`first_lesson_completed` · `first_chat_message_sent`)은 PostHog sink를 감싸 기기당 한 번 더 냅니다 —
// 시험 계정 거름(ADR-0085)이 바깥이라 시험 계정의 행동은 마일스톤을 쓰지 않습니다.

import type { AnalyticsEvent, AnalyticsEventSinks } from "./analytics.contract";
import type { CompanionEvent, CompanionEventInput } from "./companion-event.contract";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { daysSinceFirstOpen } from "./first-open";
import { getItem, isStorageAvailable, setItem } from "./storage";

export type Milestone = "first_lesson_completed" | "first_chat_message_sent";

/** 이벤트 핸들러 · 효과에서만 부릅니다(배경 스레드). 수집하지 않으면(`null`) 아무것도 하지 않습니다. */
export function emitCompanionEvent(
  sink: EpisodeIntroEventSink,
  event: CompanionEventInput,
  days: () => string = daysSinceFirstOpen,
): void {
  if (sink === null) return;
  sink({ ...event, daysSinceFirstOpen: days() } as CompanionEvent);
}

/** 이 이벤트가 처음이면 낼 마일스톤입니다 — 통과한 레슨 · 보낸 메시지. 순수. */
export function milestoneFor(event: AnalyticsEvent): CompanionEventInput | null {
  if (event.name === "episode_lesson_finished" && event.verdict === "passed")
    return { name: "first_lesson_completed", surface: "learning" };
  if (event.name === "chat_message_sent")
    return { name: "first_chat_message_sent", surface: "chat", characterId: event.characterId };
  return null;
}

/** 마일스톤이면 PostHog 사람 속성 한 번 쓰기(`$set_once`)의 값 — 첫 날 수(정수). 아니면 null. 순수. */
export function personOnceFor(
  event: string,
  properties: { readonly [key: string]: unknown },
): { readonly [key: string]: number } | null {
  const days = Number(properties["daysSinceFirstOpen"]);
  if (!Number.isFinite(days)) return null;
  if (event === "first_lesson_completed") return { first_lesson_day: days };
  if (event === "first_chat_message_sent") return { first_chat_day: days };
  return null;
}

export type MilestoneStore = {
  readonly done: (milestone: Milestone) => boolean;
  readonly mark: (milestone: Milestone) => void;
};

export const milestonesStorageKey = "libitum.analytics.milestones";

function readMilestones(): readonly string[] {
  try {
    if (!isStorageAvailable()) return [];
    const parsed: unknown = JSON.parse(getItem(milestonesStorageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** 기기 저장 판 — 저장소가 없으면 이번 실행 메모리로만 한 번을 지킵니다. */
export function deviceMilestoneStore(): MilestoneStore {
  const memory = new Set<string>();
  return {
    done: (milestone) => memory.has(milestone) || readMilestones().includes(milestone),
    mark: (milestone) => {
      memory.add(milestone);
      try {
        const seen = readMilestones();
        if (isStorageAvailable() && !seen.includes(milestone))
          setItem(milestonesStorageKey, JSON.stringify([...seen, milestone]));
      } catch {
        // 적지 못해도 이번 실행은 메모리로 지킵니다.
      }
    },
  };
}

/** 학습 · 메신저 sink를 감싸 첫 경험 마일스톤을 한 번 더 냅니다. 없는 sink는 그대로입니다. */
export function withFirstMilestones(
  sinks: AnalyticsEventSinks,
  store: MilestoneStore,
  days: () => string = daysSinceFirstOpen,
): AnalyticsEventSinks {
  const sink = sinks.episodeIntroEventSink;
  if (sink === null) return sinks;
  return {
    ...sinks,
    episodeIntroEventSink: (event) => {
      sink(event);
      const milestone = milestoneFor(event);
      if (milestone === null || store.done(milestone.name as Milestone)) return;
      store.mark(milestone.name as Milestone);
      emitCompanionEvent(sink, milestone, days);
    },
  };
}
