import type { ReactNode } from "@lynx-js/react";

import { color, motion } from "@libitums/design-tokens";
import { motionDurationMs, useMotion } from "@libitums/ui-lynx/motion";

import type { CatalogUnitKey } from "../../lib/catalog-progress";
import {
  FOOTPRINT_HEIGHT,
  FOOTPRINT_WIDTH,
  footprintEnterDelayMs,
  type MapFootprintSegment,
} from "./map-footprints";

import "./map-footprints.css";

export type MapFootprintsProps = {
  readonly episodeId: string;
  readonly segments: readonly MapFootprintSegment[];
  /** 이 유닛에서 시작하는 구간만 등장 모션입니다. 없으면 전부 정지. */
  readonly enteringFrom: CatalogUnitKey | null;
};

// 발자국 글리프 — 앞창 + 뒤축(시안 그대로), 12 × 14. 색은 ui-lynx 아이콘처럼 `currentColor` 자리에 토큰 값을 넣습니다
// (Lynx svg는 color를 물려받지 않습니다).
const glyph = (fill: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -9 10 18" width="${FOOTPRINT_WIDTH}" height="${FOOTPRINT_HEIGHT}">` +
  `<path d="M-3.2,-7 C-4.6,-3.4 -4.1,-0.4 -2.6,1.4 L2.6,1.4 C4.1,-0.4 4.6,-3.4 3.2,-7 C2.1,-9 -2.1,-9 -3.2,-7 Z" fill="${fill}"/>` +
  `<path d="M-2.3,3.6 C-2.6,5.8 -1.5,7.6 0,7.6 C1.5,7.6 2.6,5.8 2.3,3.6 Z" fill="${fill}"/>` +
  `</svg>`;

const FOOTPRINT_GLYPH = glyph(color.gray[500]);

// 등장 지연 토큰 — 유닛이 끝남 색으로 바뀐 뒤(d6) 발자국마다 d2씩 늦게.
const enterTokens = {
  d6: motionDurationMs(motion.duration.d6),
  d2: motionDurationMs(motion.duration.d2),
};

// 구획의 발자국 층입니다(ADR-0100 D3 · D4). 장식이라 낭독 요소가 아니고 탭도 받지 않습니다. 바깥 상자가 자리 ·
// 발끝 방향을, 안쪽 상자가 등장 모션을 집니다 — 애니메이션의 transform이 회전을 덮지 않게 둘을 나눕니다.
export function MapFootprints({
  episodeId,
  segments,
  enteringFrom,
}: MapFootprintsProps): ReactNode {
  const animated = useMotion() === "standard";
  return (
    <view
      className="map-footprints"
      data-testid={`map-footprints-${episodeId}`}
      accessibility-element={false}
      user-interaction-enabled={false}
    >
      {segments.flatMap((segment) => {
        const entering = animated && enteringFrom !== null && segment.from === enteringFrom;
        return segment.prints.map((print, index) => (
          <view
            key={`${segment.from}-${String(index)}`}
            className="map-footprint"
            data-testid={`map-footprint-${episodeId}-${segment.from}-${String(index)}`}
            style={{
              left: `${String(print.x - FOOTPRINT_WIDTH / 2)}px`,
              top: `${String(print.y - FOOTPRINT_HEIGHT / 2)}px`,
              transform: `rotate(${String(print.rotation)}deg) scaleX(${String(print.flip)})`,
            }}
          >
            <view
              className={entering ? "map-footprint-body map-footprint-enter" : "map-footprint-body"}
              {...(entering
                ? {
                    style: {
                      animationDelay: `${String(footprintEnterDelayMs(index, enterTokens))}ms`,
                    },
                  }
                : {})}
            >
              <svg className="map-footprint-glyph" content={FOOTPRINT_GLYPH} />
            </view>
          </view>
        ));
      })}
    </view>
  );
}
