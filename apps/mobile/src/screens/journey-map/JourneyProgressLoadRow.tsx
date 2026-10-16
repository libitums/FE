import { useEffect, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import time from "@libitums/icons/lynx/time";
import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";
import type { Motion } from "@libitums/ui-lynx/motion";

import { announce } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import { progressLoadRowAnnouncementFor } from "./journey-map-load";
import type { JourneyProgressLoadRowProps } from "./journey-map-load.contract";

import "./journey-progress-load-row.css";

const clockContent = time.replace(/currentColor/g, color.fg["neutral-muted"]);

// 등장 전환은 모션에 따라 클래스를 고릅니다 — 길이 · 가속은 CSS가 토큰으로 정합니다.
function enterClassOf(motion: Motion): string {
  return motion === "reduced"
    ? "journey-progress-load-row-enter-quick"
    : "journey-progress-load-row-enter";
}

// 움직임 줄이기에서는 고리를 돌리지 않고 멈춘 시계를 그립니다.
function LoadingMark({ motion }: { readonly motion: Motion }): ReactNode {
  return (
    <view
      className="journey-progress-load-row-mark"
      data-testid="journey-progress-load-row-spinner"
    >
      {motion === "reduced" ? (
        <svg
          className="journey-progress-load-row-clock"
          content={clockContent}
          current-color={color.fg["neutral-muted"]}
        />
      ) : (
        <view className="journey-progress-load-row-ring journey-progress-load-row-spin" />
      )}
    </view>
  );
}

// 줄이 서고 상태가 바뀔 때 한 번씩 읽습니다. 루트는 하나라 상태가 바뀌어도 같은 노드이고 등장 페이드를
// 다시 틀지 않습니다. 불러오는 중에는 루트가 접근성 요소 하나(고리는 장식), 실패에서는 문구와 버튼이 섭니다.
export function JourneyProgressLoadRow(props: JourneyProgressLoadRowProps): ReactNode {
  const copy = useUiCopy().progressLoad;
  const motion = useMotion();
  const previous = useRef<JourneyProgressLoadRowProps["status"] | null>(null);
  const { status } = props;

  useEffect(() => {
    const text = progressLoadRowAnnouncementFor(previous.current, status, copy);
    previous.current = status;
    if (text !== null) announce(text);
  }, [status, copy]);

  // standard에서는 data-motion 속성을 아예 넘기지 않습니다(ui-lynx 관례).
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};
  const failed = props.status === "failed";
  function handleRetry() {
    "background only";
    if (props.status === "failed") props.onRetry();
  }
  return (
    <view
      className={`journey-progress-load-row${failed ? " journey-progress-load-row-failed" : ""} ${enterClassOf(motion)}`}
      data-testid="journey-progress-load-row"
      data-status={status}
      {...motionProps}
      accessibility-element={!failed}
      accessibility-label={failed ? undefined : copy.loadingAnnouncement}
    >
      {failed ? null : <LoadingMark motion={motion} />}
      <text
        className={`journey-progress-load-row-message journey-progress-load-row-message-${status}`}
        data-testid="journey-progress-load-row-message"
      >
        {failed ? copy.failed : copy.loading}
      </text>
      {props.status === "failed" ? (
        <view
          data-testid="journey-progress-load-row-retry"
          accessibility-elements-hidden={props.obscured ?? false}
        >
          <Button label={copy.retry} variant="text" size="s" width="hug" bindtap={handleRetry} />
        </view>
      ) : null}
    </view>
  );
}
