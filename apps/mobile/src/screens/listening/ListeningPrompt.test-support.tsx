import type { ReactNode } from "@lynx-js/react";

import { ListeningPrompt } from "./ListeningPrompt";
import { useListeningPlayback } from "./use-listening-playback";
import type { SessionOptions } from "../../lib/session-options";

// 재생의 주인은 화면(`useListeningPlayback`)이고 `ListeningPrompt`는 표시만 합니다. 화면 없이
// 제시 컴포넌트를 시험하는 테스트는 이 하네스로 둘을 묶어 그립니다 — 화면이 하는 일(훅을 부르고
// 그 묶음을 내려준다)을 그대로 합니다. 프롭은 훅과 컴포넌트가 나뉘기 전의 모양과 같습니다.
export type PlaybackPromptProps = {
  text: string;
  romanization: string;
  audioSource: string | undefined;
  sessionOptions: SessionOptions;
};

export function PlaybackPrompt({
  text,
  romanization,
  audioSource,
  sessionOptions,
}: PlaybackPromptProps): ReactNode {
  const playback = useListeningPlayback(audioSource, sessionOptions);
  return (
    <ListeningPrompt
      text={text}
      romanization={romanization}
      sessionOptions={sessionOptions}
      playback={playback}
    />
  );
}
