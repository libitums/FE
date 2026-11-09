import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { coinIcon } from "../../components/coin-icon";
import { coinFlightCount } from "../../lib/coins";
import { measureRects } from "../journey-map/journey-map-scroll";
import { coinFlightDurationMs, coinFlightStaggerMs } from "./lesson-complete-reward";

import "./lesson-complete-coin-flight.css";

// 결과 화면에서 보상 카드의 엽전이 하나씩 머리 엽전 칩으로 날아가는 층입니다(ADR-0116). 보상 하나에 엽전 하나가
// `coinFlightStaggerMs` 간격으로 떠나 `coinFlightDurationMs` 동안 날고, 닿는 순간 사라지며 `onLanded`로 닿은 수를
// 알립니다 — 칩 숫자는 화면이 그 수로 올립니다(`coinFlightValueAt`).
//
// 자리는 `delayMs` 뒤(보상 카드가 다 올라온 뒤)에 잽니다. 층 · 카드 아이콘 · 칩 아이콘 셋 중 하나라도 못 재면 날지
// 않고 한꺼번에 닿은 것으로 알립니다 — 칩이 보상 전 값에 멈춰 있지 않게. 장식이라 낭독에서 뺍니다.
// 움직임 줄이기 · 미통과 · 보상 0에서는 화면이 이 층을 세우지 않습니다.

export const coinFlightLayerId = "lesson-complete-coin-layer";
export const coinFlightSourceId = "lesson-complete-coin-source";
export const coinFlightTargetId = "lesson-complete-coin-target";

/** 날아가는 엽전의 한 변입니다(아이콘 24). 가운데를 맞추려고 절반만큼 당깁니다. */
const coinSize = 24;
/** 칩에 닿을 때의 크기입니다 — 칩 아이콘(동전 약 17)에 맞춰 작아집니다. */
const landingScale = 0.7;

type FlightPath = {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
};

export function LessonCompleteCoinFlight({
  reward,
  delayMs,
  onLanded,
}: {
  readonly reward: number;
  readonly delayMs: number;
  readonly onLanded: (landed: number) => void;
}): ReactNode {
  const count = coinFlightCount(reward);
  const [path, setPath] = useState<FlightPath | null>(null);
  const [launched, setLaunched] = useState(false);
  const [landed, setLanded] = useState(0);

  useEffect(() => {
    if (count === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;
    const land = (n: number) => {
      setLanded(n);
      onLanded(n);
    };
    const begin = setTimeout(() => {
      measureRects([coinFlightLayerId, coinFlightSourceId, coinFlightTargetId], (rects) => {
        if (!alive) return;
        const [layer, source, target] = rects ?? [];
        const from = source?.centerX ?? null;
        const to = target?.centerX ?? null;
        if (
          layer?.left == null ||
          source === undefined ||
          target === undefined ||
          from === null ||
          to === null
        ) {
          land(count);
          return;
        }
        const fromY = source.top + source.height / 2;
        setPath({
          x: from - layer.left - coinSize / 2,
          y: fromY - layer.top - coinSize / 2,
          dx: to - from,
          dy: target.top + target.height / 2 - fromY,
        });
        // 처음 자리를 한 번 그린 뒤에 목표 자리를 줍니다 — 같은 그림에서 바꾸면 전환 없이 건너뜁니다.
        timers.push(setTimeout(() => setLaunched(true), 0));
        for (let index = 0; index < count; index += 1) {
          timers.push(
            setTimeout(() => land(index + 1), index * coinFlightStaggerMs + coinFlightDurationMs),
          );
        }
      });
    }, delayMs);
    return () => {
      alive = false;
      clearTimeout(begin);
      // Lynx의 clearTimeout은 인자가 꼭 하나라 `forEach(clearTimeout)`(인자 셋)로 넘기면 던집니다.
      timers.forEach((timer) => clearTimeout(timer));
    };
    // `onLanded`는 부모가 매번 새로 만들어 넘기므로 뺍니다 — 한 번 시작한 비행을 다시 시작하지 않습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, delayMs]);

  const flying =
    path === null ? [] : Array.from({ length: count }, (_, index) => index).slice(landed);
  return (
    <view
      id={coinFlightLayerId}
      className="lesson-complete-coin-flight"
      data-testid="lesson-complete-coin-flight"
      accessibility-elements-hidden={true}
    >
      {path === null
        ? null
        : flying.map((index) => (
            <view
              key={index}
              className="lesson-complete-coin-flight-coin"
              data-testid="lesson-complete-coin-flight-coin"
              style={{
                left: `${path.x}px`,
                top: `${path.y}px`,
                transform: launched
                  ? `translate(${path.dx}px, ${path.dy}px) scale(${landingScale})`
                  : "translate(0px, 0px) scale(1)",
                transitionDelay: `${index * coinFlightStaggerMs}ms`,
              }}
            >
              <svg className="lesson-complete-coin-flight-icon" content={coinIcon} />
            </view>
          ))}
    </view>
  );
}
