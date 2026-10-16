import "background-only";

// 호스트 AirbridgeEventsModule 해석 · 진입점 조립 — 백그라운드 전용. 계약: docs/adr/0063-airbridge-events.md.
import { withAirbridgeEvents } from "./airbridge-events";
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

export const productEventSinks: ProductEventSinks = (sinks) =>
  withAirbridgeEvents(sinks, resolveAirbridgeEventTracker());
