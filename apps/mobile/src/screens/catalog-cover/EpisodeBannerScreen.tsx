import { useEffect, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import type { EpisodeBannerScreenProps } from "./catalog-cover.contract";
import {
  EPISODE_BANNER_HOLD_MS,
  claimEpisodeBannerDone,
  episodeBannerMotionOf,
  episodeBannerTextClassName,
  episodeBannerTextOf,
} from "./episode-banner";

import "./episode-banner-screen.css";

// 컷을 끝까지 본 뒤 한 번 서는 배너입니다 — 검은 면에 주황 글자 한 줄. 화면 전체가 조작
// 하나이고, 닫히는 길 셋(유지 시간 · 탭 · 시스템 뒤로)이 같은 가드를 지나 `onDone`을 한
// 번만 부릅니다. 퇴장 모션은 없어 닫히면 곧 다음 화면입니다.
export function EpisodeBannerScreen({ insets, kind, onDone }: EpisodeBannerScreenProps): ReactNode {
  const copy = useUiCopy();
  const motion = episodeBannerMotionOf(useMotion());
  const text = episodeBannerTextOf(kind, copy.catalogCover);
  const guard = useRef({ done: false });
  // 재렌더로 `onDone`이 바뀌어도 타이머는 다시 걸지 않고 마지막 함수를 부릅니다.
  const latest = useRef({ onDone });
  latest.current.onDone = onDone;

  const finish = () => {
    "background only";
    if (claimEpisodeBannerDone(guard.current)) {
      latest.current.onDone();
    }
  };

  useEffect(() => {
    const timer = setTimeout(finish, EPISODE_BANNER_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);
  useScreenBack(finish);

  return (
    <view
      className="episode-banner-screen"
      data-testid="episode-banner-screen"
      data-kind={kind}
      data-statusbar={lightStatusBarIcons}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={text}
      bindtap={finish}
    >
      {/* 여백 상자 — 가장자리 여백을 인라인으로 잡습니다. 면은 가장자리까지 깔립니다. */}
      <view
        className="episode-banner-screen-safe"
        data-testid="episode-banner-screen-safe"
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="episode-banner-screen-body">
          <text
            className={episodeBannerTextClassName(motion)}
            data-testid="episode-banner-screen-text"
            data-motion={motion}
          >
            {text}
          </text>
        </view>
      </view>
    </view>
  );
}
