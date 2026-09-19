import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import { entryLanguageLabel, entryLanguages } from "../../lib/entry-language";
import type { LanguageSelectScreenProps } from "./language-select.contract";

import "./language-select-screen.css";

// LIB-261 (ui-implementation): 계약(.agent-harness/work/lib-261/spec.md §0.3 D-b ·
// §4.2~§4.5)과 design.md §7의 값을 채운다. `.listening-choice` 어휘를 그대로
// 잇는다(design §7.2).
//
// 선택은 App이 소유한다(§6) — 이 화면은 `selected`·`onSelect`·`onContinue`만
// 받는다. 선택 상태는 표식(아이콘 + 낱말)의 유무와 경계색 둘로 가른다 — 색
// 하나에 기대지 않는다(WCAG 1.4.1 · ADR-0016 D3).
export function LanguageSelectScreen({
  selected,
  onSelect,
  onContinue,
}: LanguageSelectScreenProps): ReactNode {
  return (
    <view className="language-select-screen">
      <text
        className="language-select-screen-title"
        data-testid="language-select-screen-title"
        accessibility-traits="header"
      >
        언어 선택
      </text>

      <scroll-view
        className="language-select-screen-scroll"
        data-testid="language-select-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="language-select-screen-content">
          <view className="language-select-screen-options">
            {entryLanguages.map((language) => {
              const isSelected = language === selected;
              const label = entryLanguageLabel(language);
              return (
                <view
                  key={language}
                  className={
                    "language-select-option" +
                    (isSelected ? " language-select-option-selected" : "")
                  }
                  data-testid={`language-select-option-${language}`}
                  data-selected={isSelected ? "true" : "false"}
                  accessibility-element={true}
                  // 선택된 것만 ", 선택됨" 접미사다 — 「선택 여부」 축이다(ADR-0016
                  // D3, D13의 게이트를 새로 열지 않는다).
                  accessibility-label={isSelected ? `${label}, 선택됨` : label}
                  accessibility-traits="button"
                  bindtap={() => onSelect(language)}
                >
                  <text
                    className="language-select-option-label"
                    data-testid={`language-select-option-label-${language}`}
                  >
                    {label}
                  </text>
                  {isSelected ? (
                    <view
                      className="language-select-option-mark"
                      data-testid={`language-select-option-mark-${language}`}
                      // 가림은 래퍼가 진다 — `<svg>`와 `<text>` 자손이 둘 다 있다
                      // (ADR-0016 D5, `AssessmentItem` 정본 형태).
                      accessibility-elements-hidden={true}
                    >
                      <svg
                        className="language-select-option-mark-icon"
                        content={tick}
                        current-color={color.fg["neutral-muted"]}
                      />
                      <text className="language-select-option-mark-label">선택됨</text>
                    </view>
                  ) : null}
                </view>
              );
            })}
          </view>
        </view>
      </scroll-view>

      <view
        className="language-select-screen-next"
        data-testid="language-select-screen-next"
        accessibility-element={true}
        accessibility-label="다음"
        accessibility-traits="button"
        bindtap={onContinue}
      >
        <text className="language-select-screen-next-label">다음</text>
      </view>
    </view>
  );
}
