import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";

import { useUiCopy } from "../../lib/ui-copy";
import { splashGaugeFillWidth, splashUpdateClassName } from "./splash-update-context";
import type { SplashUpdateGaugeProps } from "./splash.contract";

/**
 * 로고 아래 겹침 자리에 서는 갱신 게이지입니다. 막대와 글을 하나의 접근성 요소로 묶어
 * 진행률과 함께 읽히고, 안쪽은 숨겨 두 번 읽히지 않게 합니다. 조작 단위가 아닙니다.
 */
export function SplashUpdateGauge({ percent }: SplashUpdateGaugeProps): ReactNode {
  const copy = useUiCopy().splash;
  const motion = useMotion();
  const width = splashGaugeFillWidth(percent);

  return (
    <view
      className={splashUpdateClassName(motion)}
      data-testid="splash-update"
      data-percent={String(percent)}
      data-motion={motion}
      accessibility-element={true}
      accessibility-label={copy.updatingLabel(percent)}
    >
      <view className="splash-update-content" accessibility-elements-hidden={true}>
        <view className="splash-update-track" data-testid="splash-update-track">
          {width !== null ? (
            <view
              className="splash-update-fill"
              data-testid="splash-update-fill"
              style={{ width }}
            />
          ) : null}
        </view>
        <text className="splash-update-label" data-testid="splash-update-label">
          {copy.updating}
        </text>
      </view>
    </view>
  );
}
