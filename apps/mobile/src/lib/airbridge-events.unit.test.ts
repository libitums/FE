import { describe, expect, test, vi } from "vitest";

import type { AnalyticsEvent, AnalyticsEventSinks } from "./analytics.contract";
import { airbridgeEventFrom, withAirbridgeEvents } from "./airbridge-events";
import {
  allEventNames,
  entryCompleted,
  episodeFinalPassed,
  episodeFinalPassedU01,
  nullSinks,
  retiredSpecialUnitEvents,
  unmappedEvents,
} from "./airbridge-events.test-support";

// `unit` 계층: 제품 이벤트 → Airbridge 매핑 · sink 합성. 매핑은 가입(signup)과 에피소드 최종 통과(achieveLevel) 둘뿐.

function liveSinks(order: string[] = []) {
  const fns = {
    entry: vi.fn<() => void>(() => void order.push("sink")),
    notification: vi.fn<() => void>(),
    settings: vi.fn<() => void>(),
    episodeIntro: vi.fn<() => void>(() => void order.push("sink")),
  };
  const sinks = {
    entryEventSink: fns.entry,
    notificationEventSink: fns.notification,
    settingsEventSink: fns.settings,
    episodeIntroEventSink: fns.episodeIntro,
  } as unknown as AnalyticsEventSinks;
  return { sinks, fns };
}

describe("airbridgeEventFrom", () => {
  test("AB1. episode_final_passed는 achieveLevel { level: 에피소드 id, label: episode_final }이다", () => {
    expect(airbridgeEventFrom(episodeFinalPassed)).toStrictEqual({
      category: "airbridge.achieveLevel",
      semanticAttributes: { level: "u00-tutorial", label: "episode_final" },
    });
    expect(airbridgeEventFrom(episodeFinalPassedU01)).toStrictEqual({
      category: "airbridge.achieveLevel",
      semanticAttributes: { level: "u01-water", label: "episode_final" },
    });
  });

  test("AB2. entry_completed는 파라미터 없는 signup이다", () => {
    const mapped = airbridgeEventFrom(entryCompleted);
    expect(mapped).toEqual({ category: "airbridge.user.signup", semanticAttributes: {} });
    expect(Object.keys(mapped?.semanticAttributes ?? { x: 1 })).toHaveLength(0);
  });

  test("AB3. 이름 36개는 표의 34개와 매핑되는 둘로 나뉜다", () => {
    const tableNames = new Set<string>(unmappedEvents.map((e) => e.name));
    expect(tableNames.size).toBe(34);
    expect(allEventNames).toHaveLength(36);
    expect([...tableNames, "entry_completed", "episode_final_passed"].sort()).toEqual(
      [...allEventNames].sort(),
    );
  });

  test.each(unmappedEvents.map((e) => [e.name, e] as const))(
    "AB3. %s는 null이다",
    (_name, event) => {
      expect(airbridgeEventFrom(event)).toBeNull();
    },
  );

  test("AB3. 지운 메신저 · 비주얼 노벨 완료 이벤트는 어떤 출처여도 null이다", () => {
    for (const event of retiredSpecialUnitEvents) {
      expect(airbridgeEventFrom(event)).toBeNull();
    }
  });

  test("AB3. 얼린 입력도 받고 결과는 새 객체로 같은 값이다", () => {
    for (const event of [entryCompleted, episodeFinalPassed]) {
      const frozen = Object.freeze({ ...event });
      const first = airbridgeEventFrom(frozen);
      const second = airbridgeEventFrom(frozen);
      expect(first).not.toBeNull();
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(frozen).toEqual(event);
    }
  });
});

describe("withAirbridgeEvents", () => {
  test("AB4. tracker가 있으면 entry · episodeIntro sink만 새 함수이고 나머지 둘은 같은 참조다", () => {
    const { sinks } = liveSinks();
    const composed = withAirbridgeEvents(sinks, vi.fn<() => void>());
    expect(composed.entryEventSink).not.toBe(sinks.entryEventSink);
    expect(composed.episodeIntroEventSink).not.toBe(sinks.episodeIntroEventSink);
    expect(composed.notificationEventSink).toBe(sinks.notificationEventSink);
    expect(composed.settingsEventSink).toBe(sinks.settingsEventSink);
    expect(Object.keys(composed).sort()).toEqual(Object.keys(sinks).sort());
  });

  test("AB4. tracker가 null이면 받은 묶음 그대로다", () => {
    const { sinks } = liveSinks();
    expect(withAirbridgeEvents(sinks, null)).toBe(sinks);
    expect(withAirbridgeEvents(nullSinks, null)).toBe(nullSinks);
  });

  test("AB4. 비어 있는 sink 넷에서도 entry · episodeIntro 둘은 tracker에 닿는다", () => {
    const tracker = vi.fn<() => void>();
    const composed = withAirbridgeEvents(nullSinks, tracker);
    expect(typeof composed.entryEventSink).toBe("function");
    expect(typeof composed.episodeIntroEventSink).toBe("function");
    expect(composed.notificationEventSink).toBeNull();
    expect(composed.settingsEventSink).toBeNull();
    composed.entryEventSink?.(entryCompleted);
    (composed.episodeIntroEventSink as unknown as (event: AnalyticsEvent) => void)(
      episodeFinalPassed,
    );
    expect(tracker).toHaveBeenCalledTimes(2);
    expect(tracker).toHaveBeenNthCalledWith(2, {
      category: "airbridge.achieveLevel",
      semanticAttributes: { level: "u00-tutorial", label: "episode_final" },
    });
  });

  test("AB4. 원래 sink가 던져도 tracker는 불리고, tracker가 던져도 밖으로 나가지 않는다", () => {
    const first = liveSinks();
    first.fns.episodeIntro.mockImplementation(() => {
      throw new Error("posthog down");
    });
    const tracker = vi.fn<() => void>();
    const composed = withAirbridgeEvents(first.sinks, tracker);
    const intro = composed.episodeIntroEventSink as unknown as (event: AnalyticsEvent) => void;
    expect(() => intro(episodeFinalPassed)).not.toThrow();
    expect(tracker).toHaveBeenCalledTimes(1);

    const second = liveSinks();
    const broken = vi.fn<() => void>(() => {
      throw new Error("host down");
    });
    const secondIntro = withAirbridgeEvents(second.sinks, broken)
      .episodeIntroEventSink as unknown as (event: AnalyticsEvent) => void;
    expect(() => secondIntro(episodeFinalPassed)).not.toThrow();
    expect(second.fns.episodeIntro).toHaveBeenCalledTimes(1);
  });

  test("AB4. 매핑되는 이벤트는 원래 sink 한 번 뒤 tracker 한 번, 매핑 안 되는 이벤트는 tracker 0이다", () => {
    const order: string[] = [];
    const { sinks, fns } = liveSinks(order);
    const tracker = vi.fn<() => void>(() => void order.push("tracker"));
    const composed = withAirbridgeEvents(sinks, tracker);
    composed.entryEventSink?.(entryCompleted);
    (composed.episodeIntroEventSink as unknown as (event: AnalyticsEvent) => void)(
      episodeFinalPassed,
    );
    expect(order).toEqual(["sink", "tracker", "sink", "tracker"]);
    expect(fns.entry).toHaveBeenCalledTimes(1);
    expect(fns.episodeIntro).toHaveBeenCalledTimes(1);

    tracker.mockClear();
    composed.entryEventSink?.({ name: "entry_screen_viewed", screen: "onboarding" });
    expect(fns.entry).toHaveBeenCalledTimes(2);
    expect(tracker).not.toHaveBeenCalled();
  });
});
