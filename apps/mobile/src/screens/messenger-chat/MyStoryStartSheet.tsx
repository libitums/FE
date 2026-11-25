import type { ReactNode } from "@lynx-js/react";
import camera from "@libitums/icons/lynx/camera";
import image from "@libitums/icons/lynx/image";
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
 * 「+」 → 시작 고르기(시안 26번) — Camera · 사진(최근 사진) · Background. 사진 둘은 서버가 받을 때(`kinds`에 photo)와 호스트 모듈이 있을 때만
 * 부르는 쪽이 넘깁니다(ADR-0199). 시안의 최근 사진 칸 격자는 사진 보관함 읽기 권한이 필요해 시스템 사진 고르기(권한 없음)를 여는 칸 하나로
 * 바꿨습니다. 고르기가 거부 · 실패하면 `error` 줄이 시트 아래에 섭니다.
 */
export function MyStoryStartSheet({
  onBackground,
  onCamera,
  onPhotos,
  error = null,
  onClose,
}: {
  readonly onBackground: () => void;
  readonly onCamera?: () => void;
  readonly onPhotos?: () => void;
  readonly error?: string | null;
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
          {onPhotos === undefined ? null : (
            <StartOption
              testId={ids.startPhotos}
              label={copy.recent}
              tone="neutral"
              icon={
                <svg
                  className="my-story-start-icon"
                  content={image}
                  current-color={color.fg.neutral}
                  accessibility-elements-hidden={true}
                />
              }
              onTap={onPhotos}
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
        {error === null ? null : (
          <text className="my-story-start-error" data-testid={ids.startError}>
            {error}
          </text>
        )}
      </AppBottomSheet>
    </view>
  );
}
