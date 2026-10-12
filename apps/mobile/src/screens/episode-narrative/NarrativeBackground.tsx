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
  const [loadedRaw, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [settled, setSettled] = useState(false);
  // 실패는 걸쇠입니다 — 실패한 뒤 같은 요소에 로드 신호가 와도 전환을 시작하지 않습니다.
  const loaded = loadedRaw && !failed;
  const motionEnabled = animated && !reducedMotion;
  const profile = motionEnabled ? entryTransition : undefined;
  // 새 그림이 실패하면 이전 그림 층을 걷습니다 — 로드되지 않은 그림 뒤에 앞 컷이 남으면
  // 다른 장면의 그림 위에 지금 장면의 글이 서게 됩니다. 호출자의 단색 바탕이 보입니다.
  const showPrevious =
    motionEnabled && !settled && !failed && entryPreviousSrc !== null && entryPreviousSrc !== src;
  const handleLoad = () => {
    "background only";
    setLoaded(true);
  };
  const handleError = () => {
    "background only";
    setFailed(true);
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
      // 데이터셋 키는 카멜로 적습니다(하이픈 키는 테스트 환경이 거부합니다) — 속성 이름은 `data-load-state`가 됩니다.
      data-loadState={failed ? "failed" : loaded ? "loaded" : "loading"}
      accessibility-elements-hidden={true}
    >
      {showPrevious ? (
        <view
          className={
            profile && loaded
              ? `narrative-background-motion narrative-background-motion-${profile}-departing`
              : "narrative-background-motion"
          }
          data-testid="narrative-background-previous-motion"
        >
          <image className="narrative-background-image" src={entryPreviousSrc} mode="aspectFill" />
        </view>
      ) : null}
      <view
        className={
          motionEnabled
            ? loaded
              ? `narrative-background-frame narrative-background-frame-${profile ?? "current"}`
              : "narrative-background-frame narrative-background-frame-loading"
            : "narrative-background-frame"
        }
        data-testid="narrative-background-frame"
        bindanimationend={profile ? undefined : handleSettled}
      >
        <view
          className={
            motionEnabled && loaded
              ? `narrative-background-motion narrative-background-motion-${profile ?? "current"}`
              : "narrative-background-motion"
          }
          data-testid="narrative-background-motion"
        >
          <image
            className="narrative-background-image"
            data-testid="narrative-background-image"
            data-motion={motionEnabled ? "animated" : "static"}
            src={src}
            mode="aspectFill"
            bindload={handleLoad}
            binderror={handleError}
          />
        </view>
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
