import type { ReactNode } from "@lynx-js/react";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { myStoriesTestIds as ids } from "./my-stories.contract";

import "./story-quiz.css";

// 덕수쌤 스토리 퀴즈 표시(시안 21 ~ 23, 사용자 결정 2026-11-25) — 서버 반영 예상(`ChatQuizMark`). 앱은 표시만 하고 엽전 · 정답 판정은
// 서버 몫입니다. 칸이 없는 지금 서버에서는 하나도 서지 않습니다.

/** 입력 칸 위 「Quiz answer is free」(시안 21번) — 내 다음 답이 무료인 동안. */
export function QuizFreeStrip(): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.quiz;
  return (
    <view className="story-quiz-free" data-testid={ids.quizFree} flatten={false}>
      <text className="story-quiz-free-text">{copy.free}</text>
    </view>
  );
}

/** 내 답 말풍선 아래 「Free · quiz answer」 · 「Free · last try」. */
export function StoryQuizNote({
  messageId,
  attempt,
}: {
  readonly messageId: string;
  readonly attempt: 1 | 2;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.quiz;
  return (
    <text className="story-quiz-note" data-testid={ids.quizNote(messageId)}>
      {attempt === 1 ? copy.freeAnswer : copy.lastTry}
    </text>
  );
}

/** 맞힘 — 로그 가운데 초록 줄(시안 22번). 낭독은 글 그대로. */
export function StoryQuizCorrect({
  messageId,
  name,
}: {
  readonly messageId: string;
  readonly name: string;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.quiz;
  return (
    <view className="story-quiz-correct-row">
      <view
        className="story-quiz-correct"
        flatten={false}
        accessibility-element={true}
        accessibility-label={copy.correct(name)}
      >
        <svg
          className="story-quiz-correct-icon"
          content={tick}
          current-color={color.feedback["correct-text"]}
          accessibility-elements-hidden={true}
        />
        <text
          className="story-quiz-correct-text"
          data-testid={ids.quizCorrect(messageId)}
          accessibility-elements-hidden={true}
        >
          {copy.correct(name)}
        </text>
      </view>
    </view>
  );
}

/** 음성 선물 말풍선 아래 「Voice gift · 덕수쌤 says “야근”」(시안 22번). */
export function VoiceGiftNote({
  lineId,
  name,
  word,
}: {
  readonly lineId: string;
  readonly name: string;
  readonly word: string;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.quiz;
  return (
    <text className="story-quiz-gift" data-testid={ids.voiceGift(lineId)}>
      {copy.gift(name, word)}
    </text>
  );
}
