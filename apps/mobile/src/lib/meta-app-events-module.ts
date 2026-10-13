import "background-only";

// 호스트 MetaAppEventsModule 해석 · 진입점 조립 — 백그라운드 전용. 계약: ADR-0057.
import { withMetaAppEvents } from "./meta-events";
import type {
  MetaAppEventsModule,
  MetaAppEventsModuleName,
  ProductEventSinks,
  ResolveMetaAppEventLogger,
} from "./meta-events.contract";

export const metaAppEventsModuleName: MetaAppEventsModuleName = "MetaAppEventsModule";

function metaAppEventsModule(): MetaAppEventsModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as Record<string, unknown>)[metaAppEventsModuleName] as
    | MetaAppEventsModule
    | undefined;
  return module ?? undefined;
}

export const resolveMetaAppEventLogger: ResolveMetaAppEventLogger = () => {
  const host = metaAppEventsModule();
  if (host === undefined || typeof host.logEvent !== "function") return null;
  return (event) => {
    host.logEvent(event.name, event.parameters);
  };
};

export const productEventSinks: ProductEventSinks = (sinks) =>
  withMetaAppEvents(sinks, resolveMetaAppEventLogger());
