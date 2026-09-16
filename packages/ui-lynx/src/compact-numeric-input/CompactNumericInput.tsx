import type {} from "@lynx-js/react";

import {
  getCompactNumericInputContract,
  getCompactNumericInputValue,
  type CompactNumericInputProps,
} from "./compact-numeric-input.contract";

type CompactNumericInputEvent = {
  readonly detail: {
    readonly value: string;
  };
};

export function CompactNumericInput(props: CompactNumericInputProps) {
  const contract = getCompactNumericInputContract(props);

  function handleInput(event: CompactNumericInputEvent) {
    "background only";
    props.bindinput?.(getCompactNumericInputValue(event.detail.value));
  }

  function handleFocus() {
    "background only";
    props.bindfocus?.();
  }

  function handleBlur() {
    "background only";
    props.bindblur?.();
  }

  return (
    <input
      className={contract.className}
      data-testid="ui-lynx-compact-numeric-input"
      data-size={contract.size}
      data-error={contract.error ? "true" : "false"}
      data-disabled={contract.disabled ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      type="digit"
      confirm-type="done"
      maxlength={1}
      input-filter="[^0-9]"
      default-value={contract.defaultValue}
      placeholder={contract.placeholder}
      disabled={contract.disabled}
      bindinput={contract.interactive ? handleInput : undefined}
      bindfocus={contract.interactive ? handleFocus : undefined}
      bindblur={contract.interactive ? handleBlur : undefined}
    />
  );
}
