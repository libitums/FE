import type { ReactNode } from "@lynx-js/react";
import camera from "@libitums/icons/lynx/camera";
import { color } from "@libitums/design-tokens";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { myStoriesTestIds as ids } from "./my-stories.contract";

import "./my-stories.css";

function StartOption({
  testId,
  label,
  tone,
  icon,
  onTap,
}: {
  readonly testId: string;
  readonly label: string;
  readonly tone: "neutral" | "brand";
  readonly icon: ReactNode;
  readonly onTap: () => void;
}): ReactNode {
  return (
    <view
      className={`my-story-start-option my-story-start-option-${tone}`}
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={() => {
        "background only";
        playSound("button");
        onTap();
      }}
    >
      {icon}
      <text className="my-story-start-option-text" accessibility-elements-hidden={true}>
        {label}
      </text>
    </view>
  );
}

/**
 * 「+」 → 시작 고르기(시안 26번) — Camera · Background · 최근 사진. 사진은 서버가 받을 때(`kinds`에 photo)와 부르는 쪽이 사진 길을 넘길 때만
 * 섭니다 — 이 앱 판에는 사진 업로드 화면이 없어 `onCamera`를 넘기지 않으므로 Background만 섭니다.
 */
export function MyStoryStartSheet({
  onBackground,
  onCamera,
  onClose,
}: {
  readonly onBackground: () => void;
  readonly onCamera?: () => void;
  readonly onClose: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.start;
  useLayerBack(onClose);
  return (
    <view data-testid={ids.start}>
      <AppBottomSheet title={copy.title} closeAccessibilityLabel={copy.close} ondismiss={onClose}>
        <view className="my-story-start-options">
          {onCamera === undefined ? null : (
            <StartOption
              testId={ids.startCamera}
              label={copy.camera}
              tone="neutral"
              icon={
                <svg
                  className="my-story-start-icon"
                  content={camera}
                  current-color={color.fg.neutral}
                  accessibility-elements-hidden={true}
                />
              }
              onTap={onCamera}
            />
          )}
          <StartOption
            testId={ids.startBackground}
            label={copy.background}
            tone="brand"
            icon={
              <view className="my-story-start-aa" accessibility-elements-hidden={true}>
                <text className="my-story-start-aa-text">Aa</text>
              </view>
            }
            onTap={onBackground}
          />
        </view>
      </AppBottomSheet>
    </view>
  );
}
