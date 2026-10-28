import { useCallback, useEffect, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import { entrySplashDurationMs } from "../../lib/entry-flow";
import { useUiCopy } from "../../lib/ui-copy";
import logoHandwriting from "./assets/logo-handwriting.webp";
import { SplashUpdateGauge } from "./SplashUpdateGauge";
import { splashMayLeave, splashUpdateAnnouncement, useSplashUpdate } from "./splash-update-context";
import type { SplashScreenProps } from "./splash.contract";

import "./splash-screen.css";

/**
 * 로고 손글씨 애니메이션(약 2.4초, 애니메이션 WebP)을 한 번 재생하고, 끝나면 포트에
 * 알립니다. 매니페스트 응답 전(checking)이거나 받을 갱신을 받는 중(gauge · wait)이면 **시간 제한 없이**
 * 머물고(ADR-0078 D6 정정 — 사용자 결정 2026-10-28), 그 밖에는 로고가 끝나는 즉시 `close` 뒤 정확히 1회
 * `onTimeout`을 부릅니다. 요청마다의 시간 제한은 전송 계층(파일 받기 60초 등)이 집니다.
 * 로고보다 일찍 나가지 않습니다. 끝났다는 신호가 오지 않는 경로(로드 실패 · 이벤트
 * 미수신 · 테스트 환경)는 `entrySplashDurationMs` 안전 타이머가 그 순간을 대신합니다.
 */
export function SplashScreen({ onTimeout }: SplashScreenProps): ReactNode {
  const port = useSplashUpdate();
  const copy = useUiCopy().splash;
  const announcedRef = useRef<"yes" | "no">("no");
  const logoEndedRef = useRef(false);
  const exitedRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // App의 결선(`wiring`)은 렌더마다 새로 지어져 `onTimeout`도 매번 새 함수입니다.
  // 스플래시 도중에도 App이 다시 그려지므로(safe area globalProps 도착 등) 콜백을
  // 의존성에 두면 안전 타이머가 그때마다 처음부터 다시 셉니다. 최신 콜백과 포트는
  // ref로만 읽습니다.
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;
  const portRef = useRef(port);
  portRef.current = port;

  const clearTimers = useCallback(() => {
    if (safetyTimerRef.current !== null) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = null;
  }, []);

  const exit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    clearTimers();
    portRef.current.close();
    onTimeoutRef.current();
  }, [clearTimers]);

  const logoEnded = useCallback(() => {
    if (logoEndedRef.current) return;
    logoEndedRef.current = true;
    portRef.current.logoFinished();
    // 기다리는 중이면 아래 effect가 뷰가 풀리는(다 받음 · 실패 · 응답 없음) 순간 나갑니다.
    if (splashMayLeave(portRef.current.view)) exit();
  }, [exit]);

  useEffect(() => {
    safetyTimerRef.current = setTimeout(logoEnded, entrySplashDurationMs);
    return clearTimers;
  }, [logoEnded, clearTimers]);

  // 로고가 끝난 뒤 게이지가 풀리면(다 갖춤 · 실패) 대기 시간을 기다리지 않고 나갑니다.
  useEffect(() => {
    if (logoEndedRef.current && splashMayLeave(port.view)) exit();
  }, [port.view, exit]);

  // 게이지가 처음 나타날 때 한 번만 알립니다. 퍼센트 · hold가 아니라 kind에만 의존하고,
  // 포커스는 옮기지 않습니다.
  useEffect(() => {
    const text = splashUpdateAnnouncement(port.view, announcedRef.current, copy);
    if (text === null) return;
    announcedRef.current = "yes";
    announce(text);
  }, [port.view.kind]);

  return (
    <view className="splash-screen">
      {/* 스크롤 상자를 두지 않습니다 — 로고를 화면 가운데에 두려면 flex 가운데 정렬이
          필요한데 `<scroll-view>`는 linear로 강제됩니다(ADR-0022 D4). 게이지 글은
          로고 아래 겹침 자리라 흐름을 밀지 않습니다. */}
      <view className="splash-screen-mark">
        {/* 서비스 이름을 그림이 집니다 — 스크린리더에는 이름 하나로 읽힙니다. 조작
            단위가 아니므로 tap을 두지 않고, 뒤따르는 구획이 없어 `header`도 아닙니다. */}
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
          bindfinalloopcomplete={logoEnded}
          binderror={logoEnded}
        />
        {port.view.kind === "gauge" ? <SplashUpdateGauge percent={port.view.percent} /> : null}
      </view>
    </view>
  );
}
