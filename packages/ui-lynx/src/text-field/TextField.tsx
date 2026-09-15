import type {
  BaseEvent,
  InputBlurEvent,
  InputConfirmEvent,
  InputFocusEvent,
  InputInputEvent,
} from "@lynx-js/types";
import { useState } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";

import { getTextFieldContract, type TextFieldProps } from "./text-field.contract";

function renderIcon(icon: string, testId: string, currentColor: string) {
  return (
    <svg
      className="ui-lynx-text-field-icon"
      data-testid={testId}
      content={icon}
      current-color={currentColor}
    />
  );
}

export function TextField(props: TextFieldProps) {
  const [value, setValue] = useState(props.defaultValue ?? "");
  const [focused, setFocused] = useState(false);
  const contract = getTextFieldContract(props, { focused, value });
  const iconColor =
    contract.visualState === "disabled"
      ? color.fg.disabled
      : contract.visualState === "error"
        ? color.feedback["incorrect-text"]
        : color.fg["neutral-subtle"];

  function handleInput(event: BaseEvent<"bindinput", InputInputEvent>) {
    "background only";
    setValue(event.detail.value);
    props.bindinput?.(event.detail.value);
  }

  function handleFocus(event: BaseEvent<"bindfocus", InputFocusEvent>) {
    "background only";
    setFocused(true);
    props.bindfocus?.(event.detail.value);
  }

  function handleBlur(event: BaseEvent<"bindblur", InputBlurEvent>) {
    "background only";
    setFocused(false);
    props.bindblur?.(event.detail.value);
  }

  function handleConfirm(event: BaseEvent<"bindconfirm", InputConfirmEvent>) {
    "background only";
    props.bindconfirm?.(event.detail.value);
  }

  function handleTrailingActionTap() {
    "background only";
    if (props.trailing?.kind === "action" && contract.availability !== "disabled") {
      props.trailing.bindtap();
    }
  }

  function handleTrailingActionFocus() {
    "background only";
    setFocused(true);
  }

  function handleTrailingActionBlur() {
    "background only";
    setFocused(false);
  }

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-text-field"
      data-availability={contract.availability}
      data-content={contract.content}
      data-interaction={contract.interaction}
      data-validation={contract.validation}
      data-state={contract.visualState}
    >
      {props.label ? (
        <view className="ui-lynx-text-field-label-row" data-testid="ui-lynx-text-field-label-row">
          <text className="ui-lynx-text-field-label" accessibility-element={false}>
            {props.label}
          </text>
          {props.qualifier ? (
            <text className="ui-lynx-text-field-qualifier" accessibility-element={false}>
              {props.qualifier}
            </text>
          ) : null}
        </view>
      ) : null}

      <view className="ui-lynx-text-field-surface" data-testid="ui-lynx-text-field-surface">
        {props.leading ? (
          <view
            className="ui-lynx-text-field-leading"
            data-testid="ui-lynx-text-field-leading"
            accessibility-elements-hidden={true}
          >
            {props.leading.kind === "icon" ? (
              renderIcon(props.leading.icon, "ui-lynx-text-field-leading-icon", iconColor)
            ) : (
              <text className="ui-lynx-text-field-affix">{props.leading.text}</text>
            )}
          </view>
        ) : null}

        <input
          className="ui-lynx-text-field-input"
          data-testid="ui-lynx-text-field-input"
          accessibility-element={true}
          accessibility-label={contract.accessibilityLabel}
          accessibility-traits={contract.availability === "disabled" ? "disabled" : undefined}
          default-value={props.defaultValue}
          placeholder={props.placeholder}
          type={contract.nativeType}
          confirm-type={contract.nativeConfirmType}
          maxlength={props.counter?.maxLength}
          readonly={contract.availability === "read-only"}
          disabled={contract.availability === "disabled"}
          bindinput={handleInput}
          bindfocus={handleFocus}
          bindblur={handleBlur}
          bindconfirm={handleConfirm}
        />

        {props.trailing ? (
          props.trailing.kind === "action" ? (
            <view
              className="ui-lynx-text-field-trailing-action"
              data-testid="ui-lynx-text-field-trailing-action"
              accessibility-element={true}
              accessibility-label={props.trailing.accessibilityLabel}
              accessibility-traits={contract.availability === "disabled" ? "disabled" : "button"}
              bindtap={contract.availability === "disabled" ? undefined : handleTrailingActionTap}
              bindfocus={
                contract.availability === "disabled" ? undefined : handleTrailingActionFocus
              }
              bindblur={contract.availability === "disabled" ? undefined : handleTrailingActionBlur}
            >
              <view accessibility-elements-hidden={true}>
                {renderIcon(
                  props.trailing.icon,
                  "ui-lynx-text-field-trailing-action-icon",
                  iconColor,
                )}
              </view>
            </view>
          ) : (
            <view
              className="ui-lynx-text-field-trailing"
              data-testid="ui-lynx-text-field-trailing"
              accessibility-elements-hidden={true}
            >
              {props.trailing.kind === "icon" ? (
                renderIcon(props.trailing.icon, "ui-lynx-text-field-trailing-icon", iconColor)
              ) : (
                <text className="ui-lynx-text-field-affix">{props.trailing.text}</text>
              )}
            </view>
          )
        ) : null}
      </view>

      {props.supporting || contract.counterLabel ? (
        <view
          className="ui-lynx-text-field-supporting-row"
          data-testid="ui-lynx-text-field-supporting-row"
          accessibility-elements-hidden={true}
        >
          {props.supporting ? (
            <text className="ui-lynx-text-field-supporting-message">
              {props.supporting.message}
            </text>
          ) : (
            <view className="ui-lynx-text-field-supporting-spacer" />
          )}
          {contract.counterLabel ? (
            <text className="ui-lynx-text-field-counter">{contract.counterLabel}</text>
          ) : null}
        </view>
      ) : null}
    </view>
  );
}
