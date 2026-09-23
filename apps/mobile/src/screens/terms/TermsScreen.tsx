import type { ReactNode } from "@lynx-js/react";

import type { TermsScreenProps } from "./terms.contract";

import "./terms-screen.css";

// 나가기(라벨·이름 `설정으로`) · 제목 · 흐름 scroll(유일한 직계 자식
// `terms-screen-content`) · 액션 행 없음(ADR-0022 D1). 절 제목 넷은
// `header`입니다(ADR-0016 D12 G1). 문단은 접근성 속성 0개 — 화면 안 조작
// 단위는 나가기 하나입니다. 외부 링크 · 웹뷰 0건입니다.
export function TermsScreen({ sections, onExit }: TermsScreenProps): ReactNode {
  return (
    <view className="terms-screen">
      <view className="terms-screen-header">
        {/* 나가는 수단 — 머리 행의 첫 자식입니다. */}
        <view
          className="terms-screen-exit"
          data-testid="terms-screen-exit"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="설정으로"
          bindtap={onExit}
        >
          <text className="terms-screen-exit-label">설정으로</text>
        </view>
        <text
          className="terms-screen-title"
          data-testid="terms-screen-title"
          accessibility-traits="header"
        >
          개인정보 보호 및 약관
        </text>
      </view>

      {/* [흐름] 스크롤 3분할(ADR-0022) — 유일한 직계 자식이 `terms-screen-content`입니다. */}
      <scroll-view
        className="terms-screen-scroll"
        data-testid="terms-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="terms-screen-content" data-testid="terms-screen-content">
          {sections.map((section) => (
            <view
              className="terms-screen-section"
              data-testid={`terms-section-${section.id}`}
              key={section.id}
            >
              {/* 절 제목 — 뒤따르는 문단의 이름입니다(ADR-0016 D12 G1). */}
              <text
                className="terms-screen-section-title"
                data-testid={`terms-section-title-${section.id}`}
                accessibility-traits="header"
              >
                {section.title}
              </text>
              {section.paragraphs.map((paragraph, index) => (
                <text
                  className="terms-screen-paragraph"
                  data-testid={`terms-section-paragraph-${section.id}-${index}`}
                  key={index}
                >
                  {paragraph}
                </text>
              ))}
            </view>
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
