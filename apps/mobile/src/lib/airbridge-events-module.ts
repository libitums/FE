import "background-only";

// 호스트 AirbridgeEventsModule 해석 · 진입점 조립 — 백그라운드 전용. 계약: docs/adr/0063-airbridge-events.md.
import { withAirbridgeEvents } from "./airbridge-events";
import { deviceMilestoneStore, withFirstMilestones } from "./companion-events";
import type {
  AirbridgeEventsModule,
  AirbridgeEventsModuleName,
  ProductEventSinks,
  ResolveAirbridgeEventTracker,
} from "./airbridge-events.contract";

export const airbridgeEventsModuleName: AirbridgeEventsModuleName = "AirbridgeEventsModule";

function airbridgeEventsModule(): AirbridgeEventsModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as Record<string, unknown>)[airbridgeEventsModuleName] as
    | AirbridgeEventsModule
    | undefined;
  return module ?? undefined;
}

export const resolveAirbridgeEventTracker: ResolveAirbridgeEventTracker = () => {
  const host = airbridgeEventsModule();
  if (host === undefined || typeof host.trackEvent !== "function") return null;
  return (event) => {
    host.trackEvent(event.category, event.semanticAttributes);
  };
};

// 첫 경험 마일스톤은 Airbridge 합성 바깥에서 만듭니다 — 그래야 `first_chat_message_sent`가 PostHog · Airbridge 둘 다에 가고,
// PostHog 키가 없는 빌드에서도 Airbridge로 갑니다(ADR-0063 적용 기록 2026-11-24). 시험 계정 거름은 진입점에서 이 바깥입니다.
export const productEventSinks: ProductEventSinks = (sinks, store = deviceMilestoneStore()) =>
  withFirstMilestones(withAirbridgeEvents(sinks, resolveAirbridgeEventTracker()), store);
