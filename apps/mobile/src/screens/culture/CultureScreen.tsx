import type { ReactNode } from "@lynx-js/react";

import { cultureScreenTitle } from "./culture";
import type { CultureNarrative } from "./culture";

import "./culture-screen.css";

// LIB-238 (ui): 계약(실행 브리프 u10 §1.1~§1.3 · §3.2~§3.5)의 속성 전부를 채운다.
// 나가는 수단이 어느 시점에도 정확히 하나다(ADR-0022 D1) — 이 화면에는 나아가는
// 수단이 없어(판정도 다음 문항도 결과 보기도 없다) 액션 행을 두지 않는다. 루트는
// [고정] 머리 + [흐름] 내용 둘뿐이다.
//
// 서사를 값으로 만들어 주는 함수는 import하지 않는다 — 서사는 props로 받는다
// (이음매 계약, `App.tsx` 결선이 그 값을 넘긴다). `CultureNarrative`는 타입으로만
// 가져온다.

export type CultureScreenProps = {
  stepOrdinal: number;
  narrative: CultureNarrative;
  onExit: () => void;
};

export function CultureScreen({ stepOrdinal, narrative, onExit }: CultureScreenProps): ReactNode {
  return (
    <view className="culture-screen">
      {/* [고정] 머리 — 나가는 수단 `맵으로` 하나 + 제목. 액션 행이 없다(§1.2). */}
      <view className="culture-screen-header">
        <view
          className="culture-screen-exit"
          data-testid="culture-screen-exit"
          accessibility-element={true}
          accessibility-label="맵으로"
          accessibility-traits="button"
          bindtap={onExit}
        >
          <text className="culture-screen-exit-label">맵으로</text>
        </view>
        <text
          className="culture-screen-title"
          data-testid="culture-screen-title"
          accessibility-traits="header"
        >
          {cultureScreenTitle(stepOrdinal)}
        </text>
      </view>

      {/* [흐름] 내용 슬롯 — ADR-0022 D3. `scroll-orientation`·`scroll-bar-enable`을
          적는다 — 안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로
          불가능하다. accessibility-*를 붙이지 않는다 — 조작 단위가 아니라 상자다
          (ADR-0022 D5). */}
      <scroll-view
        className="culture-screen-scroll"
        data-testid="culture-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 직계 자식은 이것 하나뿐이다 — flex 어휘와 gap은 이 상자가 진다
            (ADR-0022 D4). */}
        <view className="culture-screen-content">
          <text
            className="culture-screen-narrative-title"
            data-testid="culture-screen-narrative-title"
          >
            {narrative.title}
          </text>
          {narrative.paragraphs.map((paragraph, index) => (
            <text
              key={index}
              className="culture-screen-paragraph"
              data-testid={`culture-screen-paragraph-${index}`}
            >
              {paragraph}
            </text>
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
