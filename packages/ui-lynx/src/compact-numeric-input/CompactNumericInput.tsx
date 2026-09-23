import { useState } from "@lynx-js/react";

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
  // Lynx가 input의 `:focus`를 칠하지 않아(2026-09-21 시뮬레이터 확인) 포커스를 상태로 들고
  // 클래스로 냅니다.
  const [focused, setFocused] = useState(false);

  function handleInput(event: CompactNumericInputEvent) {
    "background only";
    props.bindinput?.(getCompactNumericInputValue(event.detail.value));
  }

  function handleFocus() {
    "background only";
    setFocused(true);
    props.bindfocus?.();
  }

  function handleBlur() {
    "background only";
    setFocused(false);
    props.bindblur?.();
  }

  return (
    <input
      className={
        focused && contract.interactive
          ? `${contract.className} ui-lynx-compact-numeric-input-focused`
          : contract.className
      }
      data-testid="ui-lynx-compact-numeric-input"
      data-size={contract.size}
      data-error={contract.error ? "true" : "false"}
      data-disabled={contract.disabled ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      type="digit"
      confirm-type="done"
      maxlength={1}
      // input-filter는 **허용할** 문자를 적습니다. `[^0-9]`로 두었을 때 iOS에서 숫자가 하나도
      // 들어가지 않았습니다(2026-09-21, 시뮬레이터 확인).
      input-filter="[0-9]"
      default-value={contract.defaultValue}
      placeholder={contract.placeholder}
      disabled={contract.disabled}
      bindinput={contract.interactive ? handleInput : undefined}
      bindfocus={contract.interactive ? handleFocus : undefined}
      bindblur={contract.interactive ? handleBlur : undefined}
    />
  );
}
