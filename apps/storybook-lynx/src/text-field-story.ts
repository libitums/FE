import type { TextFieldAvailability, TextFieldInputPurpose } from "@libitums/ui-lynx/text-field";

export type TextFieldStoryData = {
  readonly label: string;
  readonly qualifier?: string;
  readonly defaultValue: string;
  readonly placeholder: string;
  readonly purpose: TextFieldInputPurpose;
  readonly availability: TextFieldAvailability;
  readonly supporting: "none" | "helper" | "error";
  readonly supportingMessage: string;
  readonly counterMaxLength: number;
  readonly adornment: "none" | "icons" | "prefix-suffix" | "action";
};

const purposes = new Set<TextFieldInputPurpose>([
  "text",
  "email",
  "password",
  "search",
  "url",
  "telephone",
]);
const availabilities = new Set<TextFieldAvailability>(["enabled", "read-only", "disabled"]);
const supportingKinds = new Set<TextFieldStoryData["supporting"]>(["none", "helper", "error"]);
const adornments = new Set<TextFieldStoryData["adornment"]>([
  "none",
  "icons",
  "prefix-suffix",
  "action",
]);

export function normalizeTextFieldStoryArgs(input: unknown): TextFieldStoryData {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const counterMaxLength =
    typeof args.counterMaxLength === "number" &&
    Number.isInteger(args.counterMaxLength) &&
    args.counterMaxLength > 0
      ? args.counterMaxLength
      : 0;

  return {
    label: typeof args.label === "string" && args.label.trim() ? args.label : "이메일 주소",
    ...(typeof args.qualifier === "string" && args.qualifier.trim()
      ? { qualifier: args.qualifier }
      : {}),
    defaultValue: typeof args.defaultValue === "string" ? args.defaultValue : "",
    placeholder:
      typeof args.placeholder === "string" && args.placeholder.trim()
        ? args.placeholder
        : "예: name@example.com",
    purpose: purposes.has(args.purpose as TextFieldInputPurpose)
      ? (args.purpose as TextFieldInputPurpose)
      : "email",
    availability: availabilities.has(args.availability as TextFieldAvailability)
      ? (args.availability as TextFieldAvailability)
      : "enabled",
    supporting: supportingKinds.has(args.supporting as TextFieldStoryData["supporting"])
      ? (args.supporting as TextFieldStoryData["supporting"])
      : "helper",
    supportingMessage:
      typeof args.supportingMessage === "string" && args.supportingMessage.trim()
        ? args.supportingMessage
        : "로그인할 때 사용할 이메일 주소를 입력해 주세요.",
    counterMaxLength,
    adornment: adornments.has(args.adornment as TextFieldStoryData["adornment"])
      ? (args.adornment as TextFieldStoryData["adornment"])
      : "none",
  };
}
