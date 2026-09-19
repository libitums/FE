import type { ReactNode } from "@lynx-js/react";

import { entryLanguageLabel } from "../../lib/entry-language";
import type { JourneyEntryScreenProps } from "./journey-entry.contract";

import "./journey-entry-screen.css";

// LIB-261 (ui-implementation): 계약(.agent-harness/work/lib-261/spec.md §0.5 A5 ·
// §4.2~§4.5)과 design.md §8의 값을 채운다.
//
// 고른 언어의 라벨을 그대로 한 줄 보인다(A5) — 새 문장을 짓지 않는다. 고르는
// 수단·미리보기를 두지 않는다(design §8.2, `docs/screens.md` 「고르지 않는다 …
// 단순 입장 화면」).
export function JourneyEntryScreen({ language, onEnter }: JourneyEntryScreenProps): ReactNode {
  return (
    <view className="journey-entry-screen">
      <text
        className="journey-entry-screen-title"
        data-testid="journey-entry-screen-title"
        accessibility-traits="header"
      >
        여정 입장
      </text>

      <scroll-view
        className="journey-entry-screen-scroll"
        data-testid="journey-entry-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="journey-entry-screen-content">
          <text className="journey-entry-screen-body">
            준비가 끝났습니다. 여정에 들어가 볼까요?
          </text>
          <text
            className="journey-entry-screen-language"
            data-testid="journey-entry-screen-language"
          >
            {entryLanguageLabel(language)}
          </text>
        </view>
      </scroll-view>

      <view
        className="journey-entry-screen-start"
        data-testid="journey-entry-screen-start"
        accessibility-element={true}
        accessibility-label="여정 시작하기"
        accessibility-traits="button"
        bindtap={onEnter}
      >
        <text className="journey-entry-screen-start-label">여정 시작하기</text>
      </view>
    </view>
  );
}
