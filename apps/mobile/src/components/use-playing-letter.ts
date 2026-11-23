// 지금 소리가 나는 자모 칸 하나를 기억합니다(2026-11-23 — 스피커 색은 소리가 나는 동안만 바뀝니다). Letters 자모표와 입장 전 기초
// 「글자 여섯」이 함께 씁니다. 재생 끝 알림이 오면 처음 색으로 돌아가고, 알림이 오지 않아도(호스트 없음 · 끊김) 안전망 시간 뒤에
// 돌아갑니다. 누를 때마다 차례 번호를 새로 매겨, 앞 재생의 늦은 끝 알림이 새로 누른 칸을 끄지 않습니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

/** 끝 알림이 오지 않을 때 스피커를 되돌리는 시각입니다 — 자모 녹음(0.6 ~ 0.9 s)보다 넉넉히 깁니다. */
export const PLAYING_LETTER_FALLBACK_MS = 3_000;

export type PlayingLetter = {
  /** 지금 소리가 나는 칸의 글자 — 없으면 null. */
  readonly playing: string | null;
  /** 그 칸의 소리를 냅니다. */
  readonly start: (letter: string, source: string) => void;
};

export function usePlayingLetter(
  play: (source: string, onDone?: () => void) => void,
): PlayingLetter {
  const [playing, setPlaying] = useState<string | null>(null);
  const turn = useRef(0);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearFallback = (): void => {
    if (fallback.current !== null) clearTimeout(fallback.current);
    fallback.current = null;
  };
  // 화면을 떠나면 차례를 넘겨 늦게 온 끝 알림 · 안전망이 상태를 바꾸지 않게 합니다(리뷰 #567).
  useEffect(
    () => () => {
      turn.current += 1;
      clearFallback();
    },
    [],
  );
  const start = (letter: string, source: string): void => {
    turn.current += 1;
    const mine = turn.current;
    const stop = () => {
      if (turn.current !== mine) return;
      // 끝 알림이 먼저 오면 안전망도 걷습니다 — 끝난 뒤 타이머가 남지 않게(리뷰 #567).
      clearFallback();
      setPlaying(null);
    };
    setPlaying(letter);
    clearFallback();
    fallback.current = setTimeout(stop, PLAYING_LETTER_FALLBACK_MS);
    play(source, stop);
  };
  return { playing, start };
}
