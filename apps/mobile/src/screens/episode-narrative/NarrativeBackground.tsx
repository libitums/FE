import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { AnimationEvent } from "@lynx-js/types";

import "./narrative-background.css";

export type NarrativeBackgroundProps = {
  readonly src: string;
  readonly previousSrc: string | null;
  readonly animated: boolean;
  readonly transition?: "imagination" | "reality";
  readonly reducedMotion?: boolean;
};

/** 새 그림이 로드된 뒤 전환합니다. 호출자는 src를 key로 삼아 장면의 상태도 교체합니다. */
export function NarrativeBackground({
  src,
  previousSrc,
  animated,
  transition,
  reducedMotion = false,
}: NarrativeBackgroundProps): ReactNode {
  // 같은 그림의 다음 독백은 새 전환이 아닙니다. 출발 그림과 연출을 함께 고정합니다.
  const [{ transition: entryTransition, previousSrc: entryPreviousSrc }] = useState({
    transition,
    previousSrc,
  });
  const [loaded, setLoaded] = useState(false);
  const [settled, setSettled] = useState(false);
  const motionEnabled = animated && !reducedMotion;
  const profile = motionEnabled ? entryTransition : undefined;
  const showPrevious =
    motionEnabled && !settled && entryPreviousSrc !== null && entryPreviousSrc !== src;
  const handleLoad = () => {
    "background only";
    setLoaded(true);
  };
  const handleSettled = (event: AnimationEvent) => {
    "background only";
    // 배경 이미지의 6초 이동 등 다른 애니메이션의 종료는 전환 완료가 아닙니다.
    const completionName = profile ? `narrative-${profile}-veil` : "narrative-background-reveal";
    if (loaded && event.params?.animation_name === completionName) setSettled(true);
  };

  return (
    <view
      className="narrative-background"
      data-testid="narrative-background"
      data-transition={motionEnabled ? (profile ?? "crossfade") : "none"}
      accessibility-elements-hidden={true}
    >
      {showPrevious ? (
        <image
          className={
            profile && loaded
              ? `narrative-background-image narrative-background-image-${profile}-departing`
              : "narrative-background-image"
          }
          src={entryPreviousSrc}
          mode="aspectFill"
        />
      ) : null}
      <view
        className={
          motionEnabled
            ? loaded
              ? `narrative-background-frame narrative-background-frame-${profile ?? "current"}`
              : "narrative-background-frame narrative-background-frame-loading"
            : "narrative-background-frame"
        }
        bindanimationend={profile ? undefined : handleSettled}
      >
        <image
          className={
            motionEnabled && loaded
              ? `narrative-background-image narrative-background-image-${profile ?? "current"}`
              : "narrative-background-image"
          }
          data-testid="narrative-background-image"
          data-motion={motionEnabled ? "animated" : "static"}
          src={src}
          mode="aspectFill"
          bindload={handleLoad}
        />
      </view>
      {profile && loaded && !settled ? (
        <view
          className={`narrative-background-${profile}-veil`}
          data-testid={`narrative-${profile}-veil`}
          bindanimationend={handleSettled}
        />
      ) : null}
    </view>
  );
}
