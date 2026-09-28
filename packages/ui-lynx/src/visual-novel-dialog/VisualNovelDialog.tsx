import { color } from "@libitums/design-tokens";
import arrowDown from "@libitums/icons/lynx/arrow-down";

import {
  getVisualNovelDialogContract,
  type VisualNovelDialogProps,
  type VisualNovelDialogVariant,
} from "./visual-novel-dialog.contract";

// 계속 표시는 세 갈래 모두 brand.primary입니다(FE override, 2026-09-28 디자인 반영) — 대사를
// 다 읽은 뒤 「눌러서 넘기라」를 알리는 자리라, 흐린 회색이면 눈에 들지 않았습니다.
const indicatorColors = {
  speech: color.brand.primary,
  narration: color.brand.primary,
  thought: color.brand.primary,
} as const satisfies Readonly<Record<VisualNovelDialogVariant, string>>;

const indicatorContents = {
  speech: arrowDown.replace(/currentColor/g, indicatorColors.speech),
  narration: arrowDown.replace(/currentColor/g, indicatorColors.narration),
  thought: arrowDown.replace(/currentColor/g, indicatorColors.thought),
} as const satisfies Readonly<Record<VisualNovelDialogVariant, string>>;

export function VisualNovelDialog(props: VisualNovelDialogProps) {
  const contract = getVisualNovelDialogContract(props);
  const tappable = props.bindtap !== undefined;
  const handleTap = () => {
    "background only";
    props.bindtap?.();
  };

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-visual-novel-dialog"
      data-advance={contract.advance}
      data-avatar={contract.avatar}
      data-language={contract.contentLanguage}
      data-lang={contract.languageTag}
      data-reveal={contract.reveal}
      data-status={contract.status}
      data-surface={contract.surface}
      data-variant={contract.variant}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits="text"
      // 누를 곳이 없으면 탭을 흘려보내고, `bindtap`이 있으면 직접 받아 전파를 끊습니다.
      event-through={!tappable}
      catchtap={tappable ? handleTap : undefined}
      focusable={false}
    >
      <view
        className="ui-lynx-visual-novel-dialog-surface"
        data-testid="ui-lynx-visual-novel-dialog-surface"
        accessibility-elements-hidden={true}
      />
      <view className="ui-lynx-visual-novel-dialog-content" accessibility-elements-hidden={true}>
        {contract.speakerName ? (
          <view
            className="ui-lynx-visual-novel-dialog-speaker-row"
            data-testid="ui-lynx-visual-novel-dialog-speaker-row"
          >
            {props.avatar !== undefined ? (
              <view
                className="ui-lynx-visual-novel-dialog-avatar"
                data-testid="ui-lynx-visual-novel-dialog-avatar"
              >
                {props.avatar}
              </view>
            ) : null}
            <text
              className="ui-lynx-visual-novel-dialog-speaker"
              data-testid="ui-lynx-visual-novel-dialog-speaker"
            >
              {contract.speakerName}
            </text>
          </view>
        ) : null}
        <view className="ui-lynx-visual-novel-dialog-line-row">
          <text
            className="ui-lynx-visual-novel-dialog-line"
            data-testid="ui-lynx-visual-novel-dialog-line"
          >
            {contract.visibleLine || "\u200B"}
          </text>
          {contract.showContinueIndicator ? (
            <view
              className={`ui-lynx-visual-novel-dialog-indicator-frame ui-lynx-visual-novel-dialog-indicator-${contract.indicatorMotion}`}
              data-testid="ui-lynx-visual-novel-dialog-continue-indicator"
              data-motion={contract.indicatorMotion}
            >
              <svg
                className="ui-lynx-visual-novel-dialog-indicator"
                content={indicatorContents[contract.variant]}
                current-color={indicatorColors[contract.variant]}
              />
            </view>
          ) : null}
        </view>
        {contract.showTranslation ? (
          <view
            className="ui-lynx-visual-novel-dialog-translation-block"
            data-testid="ui-lynx-visual-novel-dialog-translation-block"
          >
            <view className="ui-lynx-visual-novel-dialog-divider" />
            <text
              className="ui-lynx-visual-novel-dialog-translation"
              data-testid="ui-lynx-visual-novel-dialog-translation"
            >
              {contract.translation}
            </text>
          </view>
        ) : null}
      </view>
    </view>
  );
}
