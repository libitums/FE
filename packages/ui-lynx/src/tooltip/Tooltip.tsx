import type {} from "@lynx-js/react";

import { getTooltipContract, type TooltipProps } from "./tooltip.contract";

export function Tooltip(props: TooltipProps) {
  const contract = getTooltipContract(props);
  const renderedArrow = contract.layout?.arrow ?? contract.arrow;
  const rootStyle = contract.layout
    ? {
        left: `${contract.layout.left}px`,
        top: `${contract.layout.top}px`,
        right: "auto",
        bottom: "auto",
      }
    : undefined;
  const horizontalArrow =
    (contract.layout?.placement ?? contract.placement) === "top" ||
    (contract.layout?.placement ?? contract.placement) === "bottom";
  const arrowStyle =
    contract.layout?.arrowOffset === undefined
      ? undefined
      : horizontalArrow
        ? { left: `${contract.layout.arrowOffset}px`, right: "auto" }
        : { top: `${contract.layout.arrowOffset}px`, bottom: "auto" };

  return (
    <view
      className={contract.className}
      style={rootStyle}
      data-testid="ui-lynx-tooltip"
      data-alignment={contract.alignment}
      data-arrow={contract.arrow}
      data-direction={contract.direction}
      data-language={contract.contentLanguage}
      data-lang={contract.languageTag}
      data-placement={contract.placement}
      data-resolvedplacement={contract.layout?.placement ?? contract.placement}
      data-tone={contract.tone}
      data-visibility={contract.visibility}
      accessibility-element={contract.accessibilityElement}
      accessibility-label={contract.accessibilityElement ? props.message : undefined}
      accessibility-traits={contract.accessibilityElement ? "text" : undefined}
      accessibility-elements-hidden={!contract.accessibilityElement}
      event-through={true}
      focusable={false}
    >
      <view className="ui-lynx-tooltip-bubble">
        <text className="ui-lynx-tooltip-message" accessibility-element={false}>
          {props.message}
        </text>
      </view>
      {renderedArrow === "on" ? (
        <view
          className="ui-lynx-tooltip-arrow"
          style={arrowStyle}
          data-testid="ui-lynx-tooltip-arrow"
          accessibility-element={false}
          accessibility-elements-hidden={true}
        />
      ) : null}
    </view>
  );
}
