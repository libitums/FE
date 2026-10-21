import type { ReactNode } from "@lynx-js/react";

import { useListenAudio } from "../../components/use-listen-audio";
import { listenCueOf, standaloneLessonAudio } from "../../lib/question-audio";
import type { SessionOptions } from "../../lib/session-options";
import { ListeningPrompt } from "./ListeningPrompt";

// 재생의 주인은 화면(`useListenAudio`)이고 `ListeningPrompt`는 표시만 합니다. 화면 없이
// 제시 컴포넌트를 시험하는 테스트는 이 하네스로 둘을 묶어 그립니다 — 화면이 하는 일(훅을 부르고
// 그 묶음을 내려준다)을 그대로 합니다. 프롭은 훅과 컴포넌트가 나뉘기 전의 모양과 같습니다.
export type PlaybackPromptProps = {
  text: string;
  romanization: string;
  audioSource: string | undefined;
  sessionOptions: SessionOptions;
  /** 판정이 난 뒤 대본을 보일지입니다. 안 주면 prop 없이 그립니다. */
  revealed?: boolean;
};

export function PlaybackPrompt({
  text,
  romanization,
  audioSource,
  sessionOptions,
  revealed,
}: PlaybackPromptProps): ReactNode {
  const cue =
    audioSource === undefined
      ? null
      : listenCueOf(audioSource, {
          kind: "listen",
          source: audioSource,
          ref: { itemId: audioSource, itemType: "LISTEN_SELECT" },
        });
  const playback = useListenAudio(cue, standaloneLessonAudio(sessionOptions));
  return (
    <ListeningPrompt
      text={text}
      romanization={romanization}
      sessionOptions={sessionOptions}
      playback={playback}
      // `ListeningPrompt`에 `revealed` prop이 생기기 전이라 타입에 없습니다 — 스프레드로 넘겨
      // 타입 검사를 피합니다(JSX 스프레드는 초과 속성 검사를 받지 않습니다).
      {...(revealed === undefined ? {} : { revealed })}
    />
  );
}
