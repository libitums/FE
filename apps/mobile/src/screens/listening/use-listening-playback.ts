import { useEffect, useState } from "@lynx-js/react";

import { playbackActionFor, playbackStateAfterPlay } from "./listening";
import type { ListeningPlaybackState } from "./listening";
import { pauseAudio, playAudio, resumeAudio, stopAudio } from "../../lib/audio";
import type { SessionOptions } from "../../lib/session-options";
import { playSound } from "../../lib/sound-effects";

// **재생의 주인은 화면입니다**(`ListeningScreen`이 이 훅을 부릅니다). 전에는 제시
// 컴포넌트(`ListeningPrompt`)가 들고 있었는데, 학습 껍데기가 배치를 바꿀 때 무대 내용을
// 한 번 다시 세울 수 있어서(`LearningShellProps`의 계약) 그때마다 소리가 끊겼다 처음부터
// 다시 나고 재생 표시가 초기화됐습니다. 화면은 다시 서지 않으므로 소리와 상태가 무대의
// mount와 무관해집니다.
//
// **재생 상태의 주인은 여기 `useState` 하나입니다.** `lib/audio.ts`에도 두면 진실이
// 둘이 되고 어긋나는 순간을 판정할 수단이 없습니다 — ADR-0017 D3이 상태 조회 API를
// 거부한 그 근거입니다. `NativeModules`를 직접 만지지 않고 접점은 `lib/audio.ts` 하나입니다.

export type ListeningPlayback = {
  readonly playback: ListeningPlaybackState;
  /** 재생 · 멈춤 · 이어 듣기 — 지금 상태에서 `playbackActionFor`가 정한 하나를 합니다. */
  readonly toggle: () => void;
  /** 처음부터 다시 듣습니다. */
  readonly replay: () => void;
};

/** `audioSource`가 없으면(문항이 없다) 아무것도 틀지 않습니다. */
export function useListeningPlayback(
  audioSource: string | undefined,
  sessionOptions: SessionOptions,
): ListeningPlayback {
  const [playback, setPlayback] = useState<ListeningPlaybackState>("idle");

  useEffect(() => {
    if (audioSource === undefined) {
      return;
    }

    // 문항이 화면에 뜨면 재생합니다 — **자동 재생**입니다. 화면 정체성이 듣기이고,
    // 수동 재생만 두면 문항마다 첫 조작이 언제나 `듣기` 탭이라 완료까지의 탭 수가
    // 문항 수만큼 늡니다.
    //
    // **`playbackStateAfterPlay`를 지납니다.** 삼항으로 다시 쓰면 전이의 정본이 둘이
    // 되고 `unit`이 보던 자리가 사라집니다. `"unavailable"` → `"idle"`이 **모듈이 없을
    // 때 「멈춤」에 영구히 갇히는 것**을 막는 유일한 자리입니다.
    if (sessionOptions["auto-play-audio"]) {
      setPlayback(playbackStateAfterPlay(playAudio(audioSource, () => setPlayback("idle"))));
    }

    // **cleanup 하나가 넷을 집니다** — 문항 변경 · 완료 · 출구 둘 · 탭 전환입니다.
    // 각각 손으로 이으면 다섯째 경로가 생겼을 때 조용히 빠지고, 그러면 화면을 떠나도
    // 소리가 계속 납니다.
    return () => stopAudio();

    // **dep은 `audioSource` 하나입니다.** `text`가 바뀔 때 다시 트는 것은 「문항마다
    // 처음부터 다시 튼다」가 아니라 「리렌더마다 다시 튼다」이고, 그 둘은 다릅니다.
    // `sessionOptions`는 문항이 뜰 때 한 번 읽는다 — 넣으면 리렌더마다 다시 튼다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSource]);

  // 세 갈래가 전부입니다. 갈래를 컴포넌트 안 삼항이 아니라 `playbackActionFor`가
  // 정하므로, 상태가 늘면 `tsc`가 그 함수를 가리킵니다.
  const toggle = (): void => {
    "background only";
    if (audioSource === undefined) {
      return;
    }
    playSound("button");
    switch (playbackActionFor(playback)) {
      case "pause":
        pauseAudio();
        setPlayback("paused");
        return;
      case "resume":
        resumeAudio();
        setPlayback("playing");
        return;
      case "play":
        setPlayback(playbackStateAfterPlay(playAudio(audioSource, () => setPlayback("idle"))));
    }
  };

  // **다시듣기는 언제나 「처음부터」입니다.** 메서드가 아니라 `play`를 다시 부르는
  // 것이고(ADR-0017 D3), 그래서 재생 중이든 멈춰 뒀든 같은 일을 합니다.
  const replay = (): void => {
    "background only";
    if (audioSource === undefined) {
      return;
    }
    playSound("button");
    setPlayback(playbackStateAfterPlay(playAudio(audioSource, () => setPlayback("idle"))));
  };

  return { playback, toggle, replay };
}
