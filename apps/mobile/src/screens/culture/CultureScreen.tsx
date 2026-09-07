import type { ReactNode } from "@lynx-js/react";

import { cultureScreenTitle } from "./culture";
import type { CultureNarrative } from "./culture";

import "./culture-screen.css";

// LIB-238 (ui): 나가는 수단이 어느 시점에도 정확히 하나다(ADR-0022 D1).
//
// LIB-244 D3 — 「나아가는 수단이 없어 액션 행을 두지 않는다」는 근거가 소멸했다.
// 문화 퀴즈가 서면서 나아갈 곳이 생겼다 — 루트는 이제 [고정] 머리 + [흐름] 내용 +
// [고정] 액션 행 셋이다(D3.1 — `맵으로`와 `퀴즈 풀기`가 동시에 선다. 이 화면이
// 스택에서 사라지지 않으므로 「나가는 수단은 정확히 하나」와 어긋나지 않는다).
//
// 서사를 값으로 만들어 주는 함수는 import하지 않는다 — 서사는 props로 받는다
// (이음매 계약, `App.tsx` 결선이 그 값을 넘긴다). `CultureNarrative`는 타입으로만
// 가져온다. `culture-quiz/`에서는 아무것도 import하지 않는다 — 화면 간 결선은
// `App.tsx`가 진다(계약 §5.4).

export type CultureScreenProps = {
  stepOrdinal: number;
  narrative: CultureNarrative;
  onExit: () => void;
  // 계약 §5.4는 이 필드가 는다고만 적고 옵셔널 여부를 코드 블록으로 고정하지
  // 않았다(CultureQuizScreenProps의 §4.2 블록과 달리 이 타입은 계약의 fenced
  // code가 아니다). `?`를 둔 것은 이 화면의 기존 `ui` 테스트(diff 0줄 — 고치지
  // 않는다)의 기본 렌더 헬퍼가 이 콜백 없이 호출되기 때문이다. 실기 결선
  // (`App.tsx`)은 항상 값을 채워 넘긴다 — 액션 행은 그와 무관하게 조건 없이
  // 렌더된다(D3.1).
  onStartQuiz?: () => void;
};

export function CultureScreen({
  stepOrdinal,
  narrative,
  onExit,
  onStartQuiz = () => {},
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

      {/* [고정] 액션 행 — `<scroll-view>` 밖의 화면 직계 자식이다(ADR-0022 D1: 액션
          행은 고정). 조건 없이 렌더된다(D3.1) — 「끝까지 읽었는가」로 게이트하지
          않는다. 그것은 판정으로 못 쓴다고 이미 거부한 대리 지표를 어포던스
          게이트로 이름만 바꿔 들이는 것이 된다. */}
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
