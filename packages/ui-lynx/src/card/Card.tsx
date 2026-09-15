import { createContext, useContext } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";
import arrowRight from "@libitums/icons/lynx/arrow-right";

import {
  getCardContract,
  validateCardHeader,
  type CardBodyProps,
  type CardBodyTextProps,
  type CardContentProps,
  type CardFooterProps,
  type CardHeaderProps,
  type CardMediaProps,
  type CardProps,
} from "./card.contract";

type CardContextValue = {
  readonly interactive: boolean;
};

const CardContext = createContext<CardContextValue | null>(null);

function useCardContext(component: string): CardContextValue {
  const value = useContext(CardContext);
  if (value === null) throw new Error(`${component} must be rendered inside Card`);
  return value;
}

function CardRoot(props: CardProps) {
  const contract = getCardContract(props);

  function handleTap() {
    "background only";
    if (props.interaction === "interactive") props.bindtap();
  }

  return (
    <CardContext.Provider
      value={{
        interactive: contract.interaction === "interactive",
      }}
    >
      <view
        className={contract.className}
        data-testid="ui-lynx-card"
        data-interaction={contract.interaction}
        data-padding={contract.padding}
        data-direction={contract.direction}
        accessibility-element={contract.accessibilityElement}
        accessibility-label={contract.accessibilityLabel}
        accessibility-value={contract.accessibilityDescription}
        accessibility-traits={contract.accessibilityRole}
        focusable={contract.focusable}
        bindtap={contract.interaction === "interactive" ? handleTap : undefined}
      >
        <view
          className="ui-lynx-card-regions"
          accessibility-elements-hidden={contract.interaction === "interactive"}
        >
          {props.children}
        </view>
      </view>
    </CardContext.Provider>
  );
}

function CardMedia({ children, accessibilityLabel }: CardMediaProps) {
  useCardContext("Card.Media");
  if (
    accessibilityLabel !== undefined &&
    (typeof accessibilityLabel !== "string" || accessibilityLabel.trim().length === 0)
  ) {
    throw new Error("Card Media accessibilityLabel must not be empty");
  }
  const informative = accessibilityLabel !== undefined;

  return (
    <view
      className="ui-lynx-card-media"
      data-testid="ui-lynx-card-media"
      accessibility-element={informative}
      accessibility-label={informative ? accessibilityLabel : undefined}
      accessibility-traits={informative ? "image" : undefined}
      accessibility-elements-hidden={!informative}
    >
      <view className="ui-lynx-card-media-content" accessibility-elements-hidden={informative}>
        {children}
      </view>
    </view>
  );
}

function CardContent({ children }: CardContentProps) {
  useCardContext("Card.Content");
  return (
    <view className="ui-lynx-card-content" data-testid="ui-lynx-card-content">
      {children}
    </view>
  );
}

function CardHeader({ title, overline, trailing }: CardHeaderProps) {
  const { interactive } = useCardContext("Card.Header");
  validateCardHeader(title, overline);
  if (interactive && trailing !== undefined) {
    throw new Error("Interactive Card must not contain a trailing action or indicator");
  }

  const arrowContent = arrowRight.replace(/currentColor/g, color.fg["neutral-subtle"]);

  return (
    <view className="ui-lynx-card-header" data-testid="ui-lynx-card-header">
      <view className="ui-lynx-card-title-block">
        {overline ? <text className="ui-lynx-card-overline">{overline}</text> : null}
        <text className="ui-lynx-card-title" accessibility-traits="header">
          {title}
        </text>
      </view>
      {interactive ? (
        <view className="ui-lynx-card-trailing" accessibility-elements-hidden={true}>
          <svg
            className="ui-lynx-card-arrow"
            data-testid="ui-lynx-card-arrow"
            content={arrowContent}
            current-color={color.fg["neutral-subtle"]}
          />
        </view>
      ) : trailing !== undefined ? (
        <view className="ui-lynx-card-trailing" data-testid="ui-lynx-card-trailing">
          {trailing}
        </view>
      ) : null}
    </view>
  );
}

function CardBody({ children }: CardBodyProps) {
  useCardContext("Card.Body");
  return (
    <view className="ui-lynx-card-body" data-testid="ui-lynx-card-body">
      {children}
    </view>
  );
}

function CardBodyText({ children, languageTag }: CardBodyTextProps) {
  useCardContext("Card.BodyText");
  if (typeof children !== "string" || children.trim().length === 0) {
    throw new Error("Card BodyText must not be empty");
  }
  const normalizedLanguageTag = languageTag?.trim();

  return (
    <text
      className="ui-lynx-card-body-text"
      data-testid="ui-lynx-card-body-text"
      data-lang={normalizedLanguageTag || undefined}
    >
      {children}
    </text>
  );
}

function CardFooter({ primaryAction, secondaryAction }: CardFooterProps) {
  const { interactive } = useCardContext("Card.Footer");
  if (interactive) throw new Error("Interactive Card must not contain footer actions");

  return (
    <view className="ui-lynx-card-footer" data-testid="ui-lynx-card-footer">
      {primaryAction}
      {secondaryAction}
    </view>
  );
}

export const Card = Object.assign(CardRoot, {
  Media: CardMedia,
  Content: CardContent,
  Header: CardHeader,
  Body: CardBody,
  BodyText: CardBodyText,
  Footer: CardFooter,
});
