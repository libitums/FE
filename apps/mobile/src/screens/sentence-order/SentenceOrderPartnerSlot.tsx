import type { ReactNode } from "@lynx-js/react";

import { ListenPlaybackControls } from "../../components/ListenPlaybackControls";
import type { ListenAudioControl } from "../../components/use-listen-audio";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

import "./sentence-order-screen.css";

export type SentenceOrderPartnerSlotProps = {
  readonly question: SentenceOrderQuestion;
  /** 듣기 갈래(LISTEN_BUILD) 문항 음성의 조작입니다. */
  readonly listen: ListenAudioControl;
};

// 대화 카드에서 상대 말풍선이 서는 자리입니다. 듣기 조립(LISTEN_BUILD)은 상대의 말을 글로 보이지 않고(대본이 곧
// 정답입니다) 그 자리에 듣기 3열을 세웁니다. 그 밖의 문항은 상대의 말(`prompt`)과 지원 줄을 말풍선으로 보입니다.
export function SentenceOrderPartnerSlot({
  question,
  listen,
}: SentenceOrderPartnerSlotProps): ReactNode {
  if (question.audio?.kind === "listen") {
    return (
      <view className="sentence-order-screen-listen">
        <ListenPlaybackControls control={listen} testIdPrefix="sentence-order-listen" />
      </view>
    );
  }
  return (
    <view className="sentence-order-screen-partner">
      <text
        className="sentence-order-screen-partner-text"
        data-testid="sentence-order-screen-prompt"
      >
        {question.prompt}
      </text>
      {question.support === undefined ? null : (
        <>
          <text
            className="sentence-order-screen-support"
            data-testid="sentence-order-screen-romanization"
          >
            {question.support.romanization}
          </text>
          <text
            className="sentence-order-screen-support"
            data-testid="sentence-order-screen-translation"
          >
            {question.support.translation}
          </text>
        </>
      )}
    </view>
  );
}
