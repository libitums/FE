import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { Dialog } from "@libitums/ui-lynx/dialog";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack, useScreenBack } from "../../lib/use-back-handler";
import { storyIntroTestIds as ids, type StoryIntroScreenProps } from "./story-intro.contract";

import "./story-intro.css";

// 막간 이야기의 시작 화면입니다(ADR-0088 D6) — 막간 배경 위 짙은 덮개에 「STORY · EPISODE n」 · 자막을 가운데 세우고,
// 아래에 에피소드 첫 스페셜 유닛과 같은 `Skip` · `Start`를 둡니다. `Skip`은 한 번 묻습니다. 짙은 면이 상태바 띠까지
// 덮으므로 밝은 아이콘 표지를 답니다.
export function StoryIntroScreen({
  insets,
  intro,
  onStart,
  onSkip,
  onExit,
}: StoryIntroScreenProps): ReactNode {
  const copy = useUiCopy().storyIntro;
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = (id: string) => {
    "background only";
    setConfirming(false);
    if (id === "skip") onSkip();
  };
  const handleExit = () => {
    "background only";
    onExit();
  };
  // 시스템 뒤로: 확인창이 떠 있으면 그것만 닫고, 아니면 머리 뒤로와 같습니다.
  useScreenBack(handleExit);
  useLayerBack(confirming ? () => handleConfirm("stay") : null);

  return (
    <view className="story-intro" data-testid={ids.screen} data-statusbar={lightStatusBarIcons}>
      {intro.backgroundUrl === null ? null : (
        <image className="story-intro-image" src={intro.backgroundUrl} mode="aspectFill" />
      )}
      <view className="story-intro-shade" />
      <view
        className="story-intro-safe"
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom + 24}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="story-intro-header" data-testid={ids.back}>
          <RoundButton
            accessibilityLabel={copy.back}
            icon={arrowLeft03}
            variant="neutral"
            size="xl"
            bindtap={handleExit}
          />
        </view>
        <view className="story-intro-center">
          <text className="story-intro-overline">{copy.overline(intro.ordinal)}</text>
          <text className="story-intro-title" data-testid={ids.caption}>
            {intro.caption.ko}
          </text>
          {intro.caption.en === "" ? null : (
            <text className="story-intro-subtitle">{intro.caption.en}</text>
          )}
        </view>
        <view className="story-intro-actions">
          <view className="story-intro-skip" data-testid={ids.skip}>
            <Button
              label={copy.skip}
              variant="subtle"
              size="xl"
              width="fill"
              bindtap={() => setConfirming(true)}
            />
          </view>
          <view className="story-intro-start" data-testid={ids.start}>
            <Button
              label={copy.start}
              variant="brand"
              size="xl"
              width="fill"
              icon={arrowRight}
              iconPosition="trailing"
              bindtap={onStart}
            />
          </view>
        </view>
      </view>
      {confirming ? (
        <view className="story-intro-confirm" data-testid={ids.confirm}>
          <Dialog
            title={copy.skipDialog.title}
            description={copy.skipDialog.description}
            actions={[
              { id: "skip", label: copy.skipDialog.skip },
              { id: "stay", label: copy.skipDialog.keepWatching },
            ]}
            phase="visible"
            bindaction={handleConfirm}
          />
        </view>
      ) : null}
    </view>
  );
}
