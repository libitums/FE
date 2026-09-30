import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import "./narrative-background.css";

export type NarrativeBackgroundProps = {
  readonly src: string;
  readonly previousSrc: string | null;
  readonly animated: boolean;
};

/** 새 그림이 로드된 뒤 페이드합니다. 로드 중에는 이전 그림을 남겨 빈 화면을 피합니다. */
export function NarrativeBackground({
  src,
  previousSrc,
  animated,
}: NarrativeBackgroundProps): ReactNode {
  const [loaded, setLoaded] = useState(false);
  const [settled, setSettled] = useState(false);
  const showPrevious = animated && !settled && previousSrc !== null && previousSrc !== src;
  const handleLoad = () => {
    "background only";
    setLoaded(true);
  };
  const handleSettled = () => {
    "background only";
    setSettled(true);
  };

  return (
    <view className="narrative-background" accessibility-elements-hidden={true}>
      {showPrevious ? (
        <image className="narrative-background-image" src={previousSrc} mode="aspectFill" />
      ) : null}
      <view
        className={
          animated
            ? loaded
              ? "narrative-background-frame narrative-background-frame-current"
              : "narrative-background-frame narrative-background-frame-loading"
            : "narrative-background-frame"
        }
        bindanimationend={handleSettled}
      >
        <image
          className={
            animated && loaded
              ? "narrative-background-image narrative-background-image-current"
              : "narrative-background-image"
          }
          data-testid="narrative-background-image"
          data-motion={animated ? "animated" : "static"}
          src={src}
          mode="aspectFill"
          bindload={handleLoad}
        />
      </view>
    </view>
  );
}
