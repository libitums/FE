import { useCallback, useEffect, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { entrySplashDurationMs } from "../../lib/entry-flow";
import logoHandwriting from "./assets/logo-handwriting.webp";
import type { SplashScreenProps } from "./splash.contract";

import "./splash-screen.css";

// 로고 손글씨 애니메이션(약 2.4초, 애니메이션 WebP)을 한 번 재생하고, 끝나면 정확히 1회
// `onTimeout`을 부른다. 끝났다는 신호가 오지 않는 경로(로드 실패 · 이벤트 미수신 ·
// 테스트 환경)는 `entrySplashDurationMs` 안전 타이머가 받친다. 어느 쪽이 먼저 오든
// 두 번 부르지 않는다.
//
// 스크롤 상자를 두지 않는다 — 글자가 없어 Dynamic Type으로 넘칠 것이 없고, 로고를
// 화면 가운데에 두려면 flex 가운데 정렬이 필요한데 `<scroll-view>`는 linear로 강제된다
// (ADR-0022 D4).
export function SplashScreen({ onTimeout }: SplashScreenProps): ReactNode {
  const finishedRef = useRef(false);
  // App의 결선(`wiring`)은 렌더마다 새로 지어져 `onTimeout`도 매번 새 함수다. 스플래시
  // 도중에도 App이 다시 그려지므로(safe area globalProps 도착 등) 콜백을 의존성에 두면
  // 안전 타이머가 그때마다 처음부터 다시 센다. 최신 콜백은 ref로만 읽는다.
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onTimeoutRef.current();
  }, []);

  useEffect(() => {
    const timer = setTimeout(finish, entrySplashDurationMs);
    return () => clearTimeout(timer);
  }, [finish]);

  return (
    <view className="splash-screen">
      {/* 서비스 이름을 그림이 진다 — 스크린리더에는 이름 하나로 읽힌다. 조작 단위가
          아니므로 tap을 두지 않고, 뒤따르는 구획이 없어 `header`도 아니다(A2). */}
      <image
        className="splash-screen-logo"
        data-testid="splash-screen-logo"
        src={logoHandwriting}
        mode="aspectFit"
        autoplay={true}
        loop-count={1}
        accessibility-element={true}
        accessibility-label="Duru"
        accessibility-traits="image"
        bindfinalloopcomplete={finish}
        binderror={finish}
      />
    </view>
  );
}
