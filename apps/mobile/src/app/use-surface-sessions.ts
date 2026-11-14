// 영역 사용 요약(ADR-0029 「D3 목적 구분」) — 학습(여정 · 롤플레이 탭)과 채팅(메신저 탭) 가운데 어디에 얼마나 머물렀나를, 영역이
// 바뀌거나(탭 전환 · 설정 탭 · 진입 화면으로 돌아감) 세션이 내려갈 때 `surface_session_ended`로 보냅니다. 탭 위에 쌓인 화면(레슨 ·
// 대화방)은 그 탭의 영역입니다. 앱이 배경으로 가는 신호는 호스트가 아직 보내지 않아 쓰지 않습니다 — 배경에 머문 시간도 그 영역에
// 들어갑니다(다음 전환 · 종료 때 끝남, 종료되면 보내지 못함).

import { useEffect, useRef } from "@lynx-js/react";

import { emitCompanionEvent } from "../lib/companion-events";
import type { EventSurface } from "../lib/companion-event.contract";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { Tab } from "./nav-state";

/** 탭의 영역입니다. 설정 · 진입 화면(`null`)은 어느 영역도 아닙니다. 순수. */
export function surfaceOfTab(tab: Tab | null): EventSurface | null {
  if (tab === "journey" || tab === "roleplay") return "learning";
  if (tab === "messenger") return "chat";
  return null;
}

/** 머문 초(반올림)입니다. 1초 미만이면 null — 스쳐 지난 전환은 세지 않습니다. 순수. */
export function surfaceSeconds(startedAt: number, endedAt: number): number | null {
  const seconds = Math.round((endedAt - startedAt) / 1000);
  return seconds >= 1 ? seconds : null;
}

export function useSurfaceSessions(
  /** 지금 탭 — 진입 화면(스플래시 · 로그인)이면 null. */
  tab: Tab | null,
  eventSink: EpisodeIntroEventSink,
  now: () => number = Date.now,
): void {
  const surface = surfaceOfTab(tab);
  const latest = useRef({ eventSink, now });
  latest.current = { eventSink, now };
  useEffect(() => {
    if (surface === null) return undefined;
    const startedAt = latest.current.now();
    return () => {
      const { eventSink: sink, now: clock } = latest.current;
      const seconds = surfaceSeconds(startedAt, clock());
      if (seconds === null) return;
      emitCompanionEvent(sink, {
        name: "surface_session_ended",
        surface,
        seconds: String(seconds),
      });
    };
  }, [surface]);
}
