import type { CompactNumericInputSize } from "@libitums/ui-lynx/compact-numeric-input";

// ui-lynx `getCompactNumericInputValue`와 같은 규칙(마지막 숫자 한 자리)이다. 패키지 진입점에서
// 값을 import하면 컴포넌트(useState)까지 실려 Node 통합 테스트가 Lynx 런타임 없이 멈춘다 —
// 이 파일은 타입만 가져온다.
function getCompactNumericInputValue(value: string): string {
  return value.match(/[0-9](?!.*[0-9])/)?.[0] ?? "";
}

export type CompactNumericInputInitData = {
  readonly accessibilityLabel: string;
  readonly defaultValue: string;
  readonly placeholder: string;
  readonly size: CompactNumericInputSize;
  readonly error: boolean;
  readonly disabled: boolean;
};

export type CompactNumericInputStoryActionEnvelope = {
  readonly channel: "STORYBOOK_ACTION";
  readonly name: "onInput";
  readonly args: readonly [value: string];
};

export type CompactNumericInputStoryBridge = (
  envelope: CompactNumericInputStoryActionEnvelope,
) => void;

const sizes = new Set<CompactNumericInputSize>(["s", "m", "l"]);

export function normalizeCompactNumericInputStoryArgs(input: unknown): CompactNumericInputInitData {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const accessibilityLabel =
    typeof args.accessibilityLabel === "string" && args.accessibilityLabel.trim()
      ? args.accessibilityLabel
      : "반복 횟수";
  const size = sizes.has(args.size as CompactNumericInputSize)
    ? (args.size as CompactNumericInputSize)
    : "m";

  return {
    accessibilityLabel,
    defaultValue: getCompactNumericInputValue(
      typeof args.defaultValue === "string" ? args.defaultValue : "",
    ),
    placeholder: getCompactNumericInputValue(
      typeof args.placeholder === "string" ? args.placeholder : "0",
    ),
    size,
    error: args.error === true,
    disabled: args.disabled === true,
  };
}

export function dispatchCompactNumericInputStoryInput(
  data: CompactNumericInputInitData,
  value: string,
  bridge: CompactNumericInputStoryBridge,
): boolean {
  if (data.disabled) return false;
  bridge({
    channel: "STORYBOOK_ACTION",
    name: "onInput",
    args: [getCompactNumericInputValue(value)],
  });
  return true;
}
