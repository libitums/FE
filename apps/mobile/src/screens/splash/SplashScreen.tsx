import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { entrySplashDurationMs } from "../../lib/entry-flow";
import type { SplashScreenProps } from "./splash.contract";

import "./splash-screen.css";

// LIB-261 (ui-implementation): 계약(.agent-harness/work/lib-261/spec.md §0.3 D-a ·
// §4.2~§4.5)과 design.md §3의 값을 채운다.
//
// 고정 시간 뒤 정확히 1회 `onTimeout`을 부르고, 언마운트하면 정리한다(§0.3 D-a ·
// SP2~SP4). 나가는 수단이 없다 — 유일한 전이 채널은 이 타이머뿐이다(§4.2).
export function SplashScreen({ onTimeout }: SplashScreenProps): ReactNode {
  useEffect(() => {
    const timer = setTimeout(onTimeout, entrySplashDurationMs);
    return () => clearTimeout(timer);
  }, [onTimeout]);

  return (
    <view className="splash-screen">
      {/* design §3.2 — 세로 가운데 정렬을 쓰지 않는다(ADR-0022 D4). 스크롤
          컨테이너에 accessibility-*를 붙이지 않는다(ADR-0022 D5, SP1). */}
      <scroll-view
        className="splash-screen-scroll"
        data-testid="splash-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="splash-screen-content">
          {/* 서비스 이름은 뒤따르는 구획을 이름 짓지 않는다 — `header` trait을 주지
              않는다(ADR-0016 D12 G1 거짓, A2 · SP5). */}
          <text className="splash-screen-service-name" data-testid="splash-screen-service-name">
            Duru
          </text>
          <text className="splash-screen-tagline" data-testid="splash-screen-tagline">
            한국어를 여정으로 배웁니다
          </text>
        </view>
      </scroll-view>
    </view>
  );
}
