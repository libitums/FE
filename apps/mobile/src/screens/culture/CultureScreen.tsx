import type { ReactNode } from "@lynx-js/react";

import { cultureScreenTitle } from "./culture";
import type { CultureNarrative } from "./culture";

import "./culture-screen.css";

// 나가는 수단이 어느 시점에도 정확히 하나입니다(ADR-0022 D1). 문화 퀴즈가
// 서면서 나아갈 곳이 생겨 루트는 [고정] 머리 + [흐름] 내용 + [고정] 액션 행
// 셋입니다 — `맵으로`와 `퀴즈 풀기`가 함께 서지만, 이 화면이 스택에서 사라지지
// 않으므로 「나가는 수단은 정확히 하나」와 어긋나지 않습니다. 서사는 props로
// 받습니다 — 값을 만드는 함수는 import하지 않습니다. `culture-quiz/`에서는
// 아무것도 import하지 않습니다 — 화면 간 결선은 `App.tsx`가 집니다.

export type CultureScreenProps = {
  stepOrdinal: number;
  narrative: CultureNarrative;
  onExit: () => void;
  // 필수 필드입니다 — 액션 행(`culture-screen-quiz`)이 조건 없이 렌더되는데
  // 콜백이 비면 조용히 죽은 버튼이 됩니다. 실기 결선(`App.tsx`)은 항상 값을
  // 채워 넘깁니다.
  onStartQuiz: () => void;
};

export function CultureScreen({
  stepOrdinal,
  narrative,
  onExit,
  onStartQuiz,
}: CultureScreenProps): ReactNode {
  return (
    <view className="culture-screen">
      {/* [고정] 머리 — 나가는 수단 `맵으로` 하나 + 제목. */}
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
          적습니다 — 안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로
          불가능합니다. accessibility-*를 붙이지 않습니다 — 조작 단위가 아니라
          상자입니다(ADR-0022 D5). */}
      <scroll-view
        className="culture-screen-scroll"
        data-testid="culture-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 직계 자식은 이것 하나뿐입니다 — flex 어휘와 gap은 이 상자가 집니다
            (ADR-0022 D4). */}
        <view className="culture-screen-content">
          <text
            className="culture-screen-narrative-title"
            data-testid="culture-screen-narrative-title"
            accessibility-traits="header"
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

      {/* [고정] 액션 행 — `<scroll-view>` 밖의 화면 직계 자식입니다(ADR-0022 D1: 액션
          행은 고정입니다). 조건 없이 렌더됩니다 — 「끝까지 읽었는가」로 게이트하지
          않습니다. 그것은 판정으로 못 쓴다고 이미 거부한 대리 지표를 어포던스
          게이트로 이름만 바꿔 들이는 것이 됩니다. */}
      <view
        className="culture-screen-quiz"
        data-testid="culture-screen-quiz"
        accessibility-element={true}
        accessibility-label="퀴즈 풀기"
        accessibility-traits="button"
        bindtap={onStartQuiz}
      >
        <text className="culture-screen-quiz-label">퀴즈 풀기</text>
      </view>
    </view>
  );
}
