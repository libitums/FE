import type { ReactNode } from "@lynx-js/react";

import { Avatar } from "@libitums/ui-lynx/avatar";
import { Card } from "@libitums/ui-lynx/card";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";
import type { ChatBubbleSize } from "@libitums/ui-lynx/chat-bubble";
import { useMotion } from "@libitums/ui-lynx/motion";

import type { AnswerResult } from "../../lib/answer-result";
import type { ConversationCast } from "../../lib/conversation-cast";
import type { LearningDensity } from "../../lib/learning-density";
import { useUiCopy } from "../../lib/ui-copy";
import type { CultureScene, CultureSceneLine } from "./word-choice-questions";

import "./culture-check-scene.css";

/** 장면의 진행: 묻는 중 또는 답한 뒤(내 대답 + 판정). */
export type CultureSceneOutcome =
  | { readonly kind: "asking" }
  | { readonly kind: "answered"; readonly reply: string; readonly result: AnswerResult };

export type CultureCheckSceneProps = {
  readonly scene: CultureScene;
  readonly cast: ConversationCast;
  readonly outcome: CultureSceneOutcome;
  readonly density: LearningDensity;
};

// 로마자와 뜻이 둘 다 있을 때만 말풍선 안 묶음(annotation)으로 싣습니다. 뜻만 있으면 한 줄 번역으로, 로마자만
// 있으면 싣지 않습니다(로마자 혼자는 읽는 법일 뿐 뜻이 아닙니다).
function lineExtrasOf(
  line: CultureSceneLine,
  pronunciation: (romanization: string) => string,
): {
  readonly annotation?: {
    readonly romanization: string;
    readonly meaning: string;
    readonly spokenRomanization: string;
  };
  readonly translation?: string;
} {
  if (line.romanization !== undefined && line.meaning !== undefined) {
    return {
      annotation: {
        romanization: line.romanization,
        meaning: line.meaning,
        spokenRomanization: pronunciation(line.romanization),
      },
    };
  }
  return line.meaning === undefined ? {} : { translation: line.meaning };
}

/**
 * 문화 확인 장면입니다 — 그림(5:2) 위에 상대 말풍선, 답한 뒤에는 그림이 접히고 상대 말풍선은 한글만 남으며 정답이면
 * 내 대답 말풍선이 붙습니다. 판정 색 · 해설은 셸의 해설 판이 집니다. 묻는 중 말풍선은 로마자 · 뜻 묶음을 싣습니다.
 * 아바타는 장식이라 낭독에서 빼고, 말풍선 이름에 화자가 들어갑니다.
 */
export function CultureCheckScene({
  scene,
  cast,
  outcome,
  density,
}: CultureCheckSceneProps): ReactNode {
  const copy = useUiCopy();
  const reduced = useMotion() === "reduced";
  const size: ChatBubbleSize = density === "compact" ? "m" : "l";
  const asking = outcome.kind === "asking";
  const replied = outcome.kind === "answered" && outcome.result === "correct";

  return (
    <view className="word-choice-stage-card" data-testid="word-choice-culture-scene">
      <Card elevation="stage">
        {asking && scene.imageUrl !== null ? (
          <Card.Media>
            <view className="culture-check-scene-image">
              <image
                className="culture-check-scene-picture"
                data-testid="word-choice-culture-scene-image"
                src={scene.imageUrl}
                mode="aspectFill"
              />
            </view>
          </Card.Media>
        ) : null}
        <Card.Content>
          <view className="culture-check-scene-lines">
            <view
              className="culture-check-scene-row"
              data-testid="word-choice-culture-scene-partner"
            >
              <Avatar
                name={cast.counterpart.name}
                imageSource={cast.counterpart.imageUrl}
                size="sm"
                accessibility="hidden"
              />
              <view className="culture-check-scene-bubble">
                <ChatBubble
                  direction="incoming"
                  speaker={copy.sentenceOrder.dialogueSpeaker.counterpart}
                  message={scene.line.ko}
                  size={size}
                  contentLanguage="learning"
                  languageTag="ko"
                  {...(asking ? lineExtrasOf(scene.line, copy.readAloud.pronunciation) : {})}
                />
              </view>
            </view>
            {replied && outcome.kind === "answered" ? (
              <view
                className={
                  reduced
                    ? "culture-check-scene-row culture-check-scene-row-me culture-check-scene-reply culture-check-scene-reply-motion-reduced"
                    : "culture-check-scene-row culture-check-scene-row-me culture-check-scene-reply"
                }
                data-testid="word-choice-culture-scene-reply"
              >
                <view className="culture-check-scene-bubble culture-check-scene-bubble-me">
                  <ChatBubble
                    direction="outgoing"
                    speaker={copy.sentenceOrder.dialogueSpeaker.me}
                    message={outcome.reply}
                    size={size}
                    contentLanguage="learning"
                    languageTag="ko"
                  />
                </view>
                <Avatar
                  name={cast.me.name}
                  imageSource={cast.me.imageUrl}
                  size="sm"
                  accessibility="hidden"
                />
              </view>
            ) : null}
          </view>
        </Card.Content>
      </Card>
    </view>
  );
}
