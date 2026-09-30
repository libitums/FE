import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { AnimationEvent } from "@lynx-js/types";

import "./narrative-background.css";

export type NarrativeBackgroundProps = {
  readonly src: string;
  readonly previousSrc: string | null;
  readonly animated: boolean;
  readonly transition?: "imagination";
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
  const [loaded, setLoaded] = useState(false);
  const [settled, setSettled] = useState(false);
  const motionEnabled = animated && !reducedMotion;
  const imagination = motionEnabled && transition === "imagination";
  const showPrevious = motionEnabled && !settled && previousSrc !== null && previousSrc !== src;
  const handleLoad = () => {
    "background only";
    setLoaded(true);
  };
  const handleSettled = (event: AnimationEvent) => {
    "background only";
    // 배경 이미지의 6초 이동 등 다른 애니메이션의 종료는 전환 완료가 아닙니다.
    const completionName = imagination
      ? "narrative-imagination-veil"
      : "narrative-background-reveal";
    if (loaded && event.params?.animation_name === completionName) setSettled(true);
  };

  return (
    <view
      className="narrative-background"
      data-testid="narrative-background"
      data-transition={imagination ? "imagination" : motionEnabled ? "crossfade" : "none"}
      accessibility-elements-hidden={true}
    >
      {showPrevious ? (
        <image
          className={
            imagination && loaded
              ? "narrative-background-image narrative-background-image-departing"
              : "narrative-background-image"
          }
          src={previousSrc}
          mode="aspectFill"
        />
      ) : null}
      <view
        className={
          motionEnabled
            ? loaded
              ? imagination
                ? "narrative-background-frame narrative-background-frame-imagination"
                : "narrative-background-frame narrative-background-frame-current"
              : "narrative-background-frame narrative-background-frame-loading"
            : "narrative-background-frame"
        }
        bindanimationend={imagination ? undefined : handleSettled}
      >
        <image
          className={
            motionEnabled && loaded
              ? imagination
                ? "narrative-background-image narrative-background-image-imagination"
                : "narrative-background-image narrative-background-image-current"
              : "narrative-background-image"
          }
          data-testid="narrative-background-image"
          data-motion={motionEnabled ? "animated" : "static"}
          src={src}
          mode="aspectFill"
          bindload={handleLoad}
        />
      </view>
      {imagination && loaded && !settled ? (
        <view
          className="narrative-background-imagination-veil"
          data-testid="narrative-imagination-veil"
          bindanimationend={handleSettled}
        />
      ) : null}
    </view>
  );
}
