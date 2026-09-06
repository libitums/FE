import type { ReactNode } from "@lynx-js/react";

import type { CultureNarrative } from "./culture";

// LIB-238 (ui-scaffold): 골격만 선 상태다 — import와 최소 렌더만 가능하다. 접근성
// 속성 일체, 스크롤 방향과 스크롤바 노출 속성, 탭 시 나가기 연결과 데이터 바인딩
// (제목 문자열 계산 · 서사 문단 렌더)은 다음 계층(ui)이 채운다. 그 계층의 red
// 자리를 여기서 채우지 않는다 — 특히 narrative-title·paragraph 요소는 아직
// 렌더하지 않는다(content는 빈 상자다).

export type CultureScreenProps = {
  stepOrdinal: number;
  narrative: CultureNarrative;
  onExit: () => void;
};

// 골격만 선 상태라 세 프롭 모두 아직 쓰이지 않는다. ui 계층이 stepOrdinal을
// cultureScreenTitle에, narrative.title·narrative.paragraphs를 content 안 렌더에,
// onExit을 culture-screen-exit의 탭 핸들러에 연결한다(계약 §3.1~§3.3). 프롭 이름은
// 계약이라 지우거나 `_` 접두를 붙이지 않는다.
export function CultureScreen({
  // eslint-disable-next-line no-unused-vars
  stepOrdinal,
  // eslint-disable-next-line no-unused-vars
  narrative,
  // eslint-disable-next-line no-unused-vars
  onExit,
}: CultureScreenProps): ReactNode {
  return (
    <view className="culture-screen">
      <view className="culture-screen-header">
        <view className="culture-screen-exit" data-testid="culture-screen-exit">
          <text className="culture-screen-exit-label">맵으로</text>
        </view>
        <text className="culture-screen-title" data-testid="culture-screen-title" />
      </view>
      <scroll-view className="culture-screen-scroll" data-testid="culture-screen-scroll">
        <view className="culture-screen-content" />
      </scroll-view>
    </view>
  );
}
