import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { STORY_INTRO_MS } from "./story-messenger";
import { storyMessengerTestIds as ids, type StoryChatText } from "./story-messenger.contract";

type StoryTimeIntroProps = {
  readonly ordinal: number;
  readonly caption: StoryChatText;
  readonly backgroundUrl: string | null;
  readonly onContinue: () => void;
};

// 메신저 앞의 시간 표시 화면입니다 — 막간 배경 위 짙은 덮개에 「조금 전」을 가운데 세우고, 잠시 뒤나 탭하면 넘어갑니다.
// 짙은 면이 상태바 띠까지 덮으므로 밝은 아이콘 표지를 답니다.
export function StoryTimeIntro({
  ordinal,
  caption,
  backgroundUrl,
  onContinue,
}: StoryTimeIntroProps): ReactNode {
  const copy = useUiCopy().storyMessenger;

  useEffect(() => {
    const timer = setTimeout(onContinue, STORY_INTRO_MS);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <view
      className="story-time-intro"
      data-testid={ids.intro}
      data-statusbar={lightStatusBarIcons}
      accessibility-element={true}
      accessibility-label={`${caption.ko}, ${caption.en}. ${copy.tapToContinue}`}
      accessibility-traits="button"
      bindtap={() => {
        "background only";
        onContinue();
      }}
    >
      {backgroundUrl === null ? null : (
        <image className="story-time-intro-image" src={backgroundUrl} mode="aspectFill" />
      )}
      <view className="story-time-intro-shade" />
      <view className="story-time-intro-center">
        <text className="story-time-intro-overline">{copy.introOverline(ordinal)}</text>
        <text className="story-time-intro-title" data-testid={ids.introCaption}>
          {caption.ko}
        </text>
        {caption.en === "" ? null : <text className="story-time-intro-subtitle">{caption.en}</text>}
      </view>
      <text className="story-time-intro-hint">{copy.tapToContinue}</text>
    </view>
  );
}
