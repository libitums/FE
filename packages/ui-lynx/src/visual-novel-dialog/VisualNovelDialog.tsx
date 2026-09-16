import { color } from "@libitums/design-tokens";
import arrowDown from "@libitums/icons/lynx/arrow-down";

import {
  getVisualNovelDialogContract,
  type VisualNovelDialogProps,
  type VisualNovelDialogVariant,
} from "./visual-novel-dialog.contract";

const indicatorColors = {
  speech: color.gray["300"],
  narration: color.gray["600"],
  thought: color.brand["reward-disabled-surface"],
} as const satisfies Readonly<Record<VisualNovelDialogVariant, string>>;

const indicatorContents = {
  speech: arrowDown.replace(/currentColor/g, indicatorColors.speech),
  narration: arrowDown.replace(/currentColor/g, indicatorColors.narration),
  thought: arrowDown.replace(/currentColor/g, indicatorColors.thought),
} as const satisfies Readonly<Record<VisualNovelDialogVariant, string>>;

export function VisualNovelDialog(props: VisualNovelDialogProps) {
  const contract = getVisualNovelDialogContract(props);

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
      event-through={true}
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
              className="ui-lynx-visual-novel-dialog-indicator-frame"
              data-testid="ui-lynx-visual-novel-dialog-continue-indicator"
            >
              <svg
                className="ui-lynx-visual-novel-dialog-indicator"
                content={indicatorContents[contract.variant]}
                current-color={indicatorColors[contract.variant]}
              />
            </view>
          ) : null}
        </view>
      </view>
    </view>
  );
}
