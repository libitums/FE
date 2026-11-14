import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { coinIcon } from "../../components/coin-icon";
import { measureRects } from "../journey-map/journey-map-scroll";
import {
  coinFlightDurationMs,
  coinFlightStaggerMs,
} from "../lesson-complete/lesson-complete-reward";

// 엽전 모달의 「Got it」 뒤 엽전 날기(ADR-0140, 기기 확인 2026-11-14 「날아오는 게 부자연스러움」으로 다시 씀) — 결과 화면의
// 엽전 날기(ADR-0116)와 같은 방식입니다. 모달의 잔액 엽전과 지도 머리 엽전 칩 아이콘의 **실제 자리**를 재어 그 사이를
// 전환으로 날고, 하나 닿을 때마다 `onLanded(닿은 수)`를 알려 칩 숫자가 그만큼 오릅니다. 셋 중 하나라도 못 재면 날지 않고
// 한꺼번에 닿은 것으로 알립니다. 장식이라 낭독에서 뺍니다.

export const launchCoinLayerId = "launch-coin-layer";
export const launchCoinSourceId = "launch-coin-source";

/** 날아가는 엽전 수입니다 — 액수와 상관없이 같은 길이로 보이게 고정합니다. */
export const LAUNCH_FLYING_COINS = 6;
const coinSize = 24;
/** 측정이 늦거나 오지 않을 때 기다리는 여유입니다. */
const FLIGHT_GRACE_MS = 600;
const landingScale = 0.7;

type FlightPath = {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
};

export function LaunchCoinFlight({
  targetId,
  onLanded,
}: {
  readonly targetId: string;
  readonly onLanded: (landed: number) => void;
}): ReactNode {
  const [path, setPath] = useState<FlightPath | null>(null);
  const [launched, setLaunched] = useState(false);
  const [landed, setLanded] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;
    let reported = 0;
    // 이미 알린 수 이하는 다시 알리지 않습니다 — 안전 타이머가 실제 착지 뒤에 와도 무동작.
    const land = (n: number) => {
      if (n <= reported) return;
      reported = n;
      setLanded(n);
      onLanded(n);
    };
    // 측정이 성공도 실패도 알리지 않는 기기가 있습니다(Android selector query) — 날기 길이를 넘기면 다 닿은 것으로 칩니다.
    // 이 모달은 마지막 엽전이 닿아야 닫히므로, 이 안전 타이머가 없으면 막이 화면을 덮은 채 멈춥니다(안정성 리뷰 1).
    const giveUp = setTimeout(
      () => land(LAUNCH_FLYING_COINS),
      LAUNCH_FLYING_COINS * coinFlightStaggerMs + coinFlightDurationMs + FLIGHT_GRACE_MS,
    );
    timers.push(giveUp);
    measureRects([launchCoinLayerId, launchCoinSourceId, targetId], (rects) => {
      if (!alive) return;
      const [layer, source, target] = rects ?? [];
      if (layer?.left == null || source?.centerX == null || target?.centerX == null) {
        land(LAUNCH_FLYING_COINS);
        return;
      }
      const fromY = source.top + source.height / 2;
      setPath({
        x: source.centerX - layer.left - coinSize / 2,
        y: fromY - layer.top - coinSize / 2,
        dx: target.centerX - source.centerX,
        dy: target.top + target.height / 2 - fromY,
      });
      // 처음 자리를 한 번 그린 뒤에 목표 자리를 줍니다 — 같은 그림에서 바꾸면 전환 없이 건너뜁니다.
      timers.push(setTimeout(() => setLaunched(true), 0));
      for (let index = 0; index < LAUNCH_FLYING_COINS; index += 1)
        timers.push(
          setTimeout(() => land(index + 1), index * coinFlightStaggerMs + coinFlightDurationMs),
        );
    });
    return () => {
      alive = false;
      // Lynx의 clearTimeout은 인자가 꼭 하나라 `forEach(clearTimeout)`로 넘기면 던집니다.
      timers.forEach((timer) => clearTimeout(timer));
    };
    // 한 번 시작한 비행을 다시 시작하지 않습니다 — `onLanded`는 부모가 매번 새로 만듭니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const flying =
    path === null ? [] : Array.from({ length: LAUNCH_FLYING_COINS }, (_, i) => i).slice(landed);
  return (
    <view id={launchCoinLayerId} className="launch-flight" accessibility-elements-hidden={true}>
      {path === null
        ? null
        : flying.map((index) => (
            <view
              key={index}
              className="launch-flight-coin"
              data-testid="launch-flight-coin"
              style={{
                left: `${path.x}px`,
                top: `${path.y}px`,
                transform: launched
                  ? `translate(${path.dx}px, ${path.dy}px) scale(${landingScale})`
                  : "translate(0px, 0px) scale(1)",
                transitionDelay: `${index * coinFlightStaggerMs}ms`,
              }}
            >
              <svg className="launch-flight-icon" content={coinIcon} />
            </view>
          ))}
    </view>
  );
}
