import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import {
  entryLanguageLabel,
  entryLanguages,
  isEntryLanguageAvailable,
  type EntryLanguage,
} from "../../lib/entry-language";
import type { LanguageSelectScreenProps } from "./language-select.contract";
import { languageFlags } from "./language-flags";

import "./language-select-screen.css";

// 선택은 App이 소유합니다 — 이 화면은 `selected`·`onSelect`·`onContinue`만
// 받습니다.
//
// 2026-09-21 디자인 반영: 머리는 로그인과 같은 형태입니다(좌상단 RoundButton
// 뒤로가기 → 제목 · 안내). 언어 넷을 ui-lynx OptionSelector(outlined · single ·
// deferred)로 국기와 함께 늘어놓고 영어 말고는 고를 수 없게 둡니다
// (`isEntryLanguageAvailable`). 아래에 Continue →.
const languageOptions = entryLanguages.map((language) => ({
  id: language,
  label: entryLanguageLabel(language),
  icon: languageFlags[language],
  disabled: !isEntryLanguageAvailable(language),
}));

export function LanguageSelectScreen({
  selected,
  onSelect,
  onContinue,
  onBack,
}: LanguageSelectScreenProps): ReactNode {
  return (
    <view className="language-select-screen">
      <view className="language-select-screen-header" data-testid="language-select-screen-header">
        {onBack ? (
          <RoundButton
            accessibilityLabel="Back"
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={onBack}
          />
        ) : null}
      </view>

      <scroll-view
        className="language-select-screen-scroll"
        data-testid="language-select-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="language-select-screen-content">
          <view className="language-select-screen-heading">
            <text
              className="language-select-screen-title"
              data-testid="language-select-screen-title"
              accessibility-traits="header"
            >
              Select Language
            </text>
            <text
              className="language-select-screen-caption"
              data-testid="language-select-screen-caption"
            >
              Choose the language you want to proceed with
            </text>
          </view>

          <view
            className="language-select-screen-options"
            data-testid="language-select-screen-options"
          >
            <OptionSelector
              groupLabel="Select Language"
              options={languageOptions}
              selectedIds={[selected]}
              variant="outlined"
              size="m"
              selection="single"
              commit="deferred"
              onChange={(ids) => {
                const next = ids[0];
                if (next) onSelect(next as EntryLanguage);
              }}
            />
          </view>
        </view>
      </scroll-view>

      <view className="language-select-screen-next" data-testid="language-select-screen-next">
        <Button
          label="Continue"
          variant="brand"
          size="xl"
          width="fill"
          icon={arrowRight}
          iconPosition="trailing"
          bindtap={onContinue}
        />
      </view>
    </view>
  );
}
