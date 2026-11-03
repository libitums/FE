import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { EntryStepBar } from "../../components/EntryStepBar";
import {
  entryLanguageLabel,
  entryLanguages,
  isEntryLanguageAvailable,
  type EntryLanguage,
} from "../../lib/entry-language";
import { useUiCopy } from "../../lib/ui-copy";
import type { LanguageSelectScreenProps } from "./language-select.contract";
import { useScreenBack } from "../../lib/use-back-handler";
import { languageFlags } from "./language-flags";

import "./language-select-screen.css";

// 선택은 App이 소유합니다 — 이 화면은 `selected`·`onSelect`·`onContinue`만
// 받습니다.
//
// 2026-09-21 디자인 반영: 머리는 로그인과 같은 형태입니다(좌상단 RoundButton
// 뒤로가기 → 제목 · 안내). 언어 넷을 ui-lynx OptionSelector(outlined · single ·
// deferred)로 국기와 함께 늘어놓고 영어 말고는 고를 수 없게 둡니다
// (`isEntryLanguageAvailable`). 아래에 Continue →.
// 미리보기 카드의 한국어 예문입니다 — 학습 내용이라 UI 언어를 따르지 않습니다(한글 리터럴 검사의 허용 선언, ADR-0093 D7).
const languagePreviewSample = { korean: "감사합니다", romanization: "gamsahamnida" } as const;

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
  showSteps = true,
}: LanguageSelectScreenProps): ReactNode {
  // 시스템 뒤로가기 = 보이는 뒤로 버튼과 같은 함수입니다(버튼이 없으면 등록하지 않습니다).
  useScreenBack(onBack);
  const copy = useUiCopy();
  const preview = copy.languageSelect.preview;
  return (
    <view className="language-select-screen">
      <view className="language-select-screen-header" data-testid="language-select-screen-header">
        {onBack ? (
          <RoundButton
            accessibilityLabel={copy.common.back}
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={onBack}
          />
        ) : null}
        {/* 가입 직후 세 화면(이름 → 나라 → 언어)의 마지막 칸입니다. 설정에서 열면 단계가 없어 그리지 않습니다. */}
        {showSteps ? <EntryStepBar current={3} total={3} /> : null}
      </view>

      <scroll-view
        className="language-select-screen-scroll"
        data-testid="language-select-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="language-select-screen-content">
          <view className="language-select-screen-heading">
            <text
              className="language-select-screen-title"
              data-testid="language-select-screen-title"
              accessibility-traits="header"
            >
              {copy.languageSelect.title}
            </text>
            <text
              className="language-select-screen-caption"
              data-testid="language-select-screen-caption"
            >
              {copy.languageSelect.caption}
            </text>
          </view>

          {/* 고른 언어로 레슨이 어떻게 보이는지의 작은 예시입니다(시안 A). 장식이 아니라 내용이라 한 덩어리로 읽힙니다. */}
          <view
            className="language-select-screen-preview"
            data-testid="language-select-screen-preview"
            accessibility-element={true}
            accessibility-label={`${preview.question} ${languagePreviewSample.korean}, ${preview.meaning}`}
          >
            <text className="language-select-screen-preview-question">{preview.question}</text>
            <text className="language-select-screen-preview-korean">
              {languagePreviewSample.korean}
            </text>
            <text className="language-select-screen-preview-roman">
              {languagePreviewSample.romanization}
            </text>
            <text className="language-select-screen-preview-meaning">{preview.meaning}</text>
            <view className="language-select-screen-preview-button">
              <text className="language-select-screen-preview-button-label">
                {copy.common.check}
              </text>
            </view>
          </view>

          <view
            className="language-select-screen-options"
            data-testid="language-select-screen-options"
          >
            <OptionSelector
              groupLabel={copy.languageSelect.title}
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
          label={copy.common.continue}
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
