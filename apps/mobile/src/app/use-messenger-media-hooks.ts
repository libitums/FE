// 서버 사진 · 음성(ADR-0146 「앱 연결」)의 알림을 앱 세션에 잇습니다 — 예약 · 확정 뒤 서버 지갑 잔액은 머리 엽전 칩(엽전 출시 결선의
// `acceptServerBalance`)으로, 결과는 제품 이벤트 `chat_media_completed`(ADR-0029 「D3 목적 구분」)로. 세션이 내려가면 풉니다.

import { useEffect, useRef } from "@lynx-js/react";

import { emitCompanionEvent } from "../lib/companion-events";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { setMessengerMediaHooks } from "./messenger-chat-wiring";

export function useMessengerMediaHooks(
  acceptServerBalance: (balance: number) => void,
  sink: EpisodeIntroEventSink,
): void {
  const latest = useRef({ acceptServerBalance, sink });
  latest.current = { acceptServerBalance, sink };
  useEffect(() => {
    setMessengerMediaHooks({
      onBalance: (balance) => latest.current.acceptServerBalance(balance),
      onSettled: (settled) =>
        emitCompanionEvent(latest.current.sink, {
          name: "chat_media_completed",
          surface: "chat",
          ...settled,
        }),
    });
    return () => setMessengerMediaHooks(null);
  }, []);
}
