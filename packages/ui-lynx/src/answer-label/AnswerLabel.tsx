import type {} from "@lynx-js/react";
import cross from "@libitums/icons/lynx/cross";
import tick from "@libitums/icons/lynx/tick";

import type { AnswerLabelProps } from "./answer-label.contract";
import { getAnswerLabelContract } from "./answer-label.contract";

const icons = { cross, tick } as const;

export function AnswerLabel(props: AnswerLabelProps) {
  const contract = getAnswerLabelContract(props);
  const iconContent =
    contract.icon === null
      ? null
      : icons[contract.icon].replace(/currentColor/g, contract.foregroundColor);

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-answer-label"
      data-result={contract.result}
      data-emphasis={contract.emphasis}
      data-size={contract.size}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
    >
      <view
        className="ui-lynx-answer-label-content"
        data-testid="ui-lynx-answer-label-content"
        accessibility-elements-hidden={true}
      >
        {iconContent === null ? null : (
          <view className="ui-lynx-answer-label-icon-wrap">
            <svg
              className="ui-lynx-answer-label-icon"
              data-testid="ui-lynx-answer-label-icon"
              content={iconContent}
              current-color={contract.foregroundColor}
            />
          </view>
        )}
        <text className="ui-lynx-answer-label-text" data-testid="ui-lynx-answer-label-text">
          {contract.label}
        </text>
      </view>
    </view>
  );
}
