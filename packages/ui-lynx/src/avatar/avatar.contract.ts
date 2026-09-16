export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarContent = "image" | "initials" | "placeholder";
export type AvatarAccessibility = "label" | "hidden";
export type AvatarImageStatus = "idle" | "loading" | "loaded" | "error";

export type AvatarProps = {
  readonly imageSource?: string;
  readonly name?: string;
  readonly size?: AvatarSize;
  readonly accessibility?: AvatarAccessibility;
  readonly accessibilityLabel?: string;
  readonly children?: never;
};

export type AvatarContract = {
  readonly accessibilityElement: boolean;
  readonly accessibilityLabel?: string;
  readonly className: string;
  readonly content: AvatarContent;
  readonly imageSource?: string;
  readonly initials?: string;
  readonly name?: string;
  readonly size: AvatarSize;
};

const avatarSizes: readonly AvatarSize[] = ["xs", "sm", "md", "lg", "xl"];
const avatarAccessibilities: readonly AvatarAccessibility[] = ["label", "hidden"];
const avatarImageStatuses: readonly AvatarImageStatus[] = ["idle", "loading", "loaded", "error"];
const cjkInitialPattern = /^[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const latinInitialPattern = /^[A-Za-zÀ-ÖØ-öø-ÿ]/;

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function validateAvatarProps(props: AvatarProps): void {
  if (props === null || typeof props !== "object") {
    throw new Error("Avatar props must be an object");
  }
  if (props.size !== undefined && !avatarSizes.includes(props.size)) {
    throw new Error("Avatar size must be xs, sm, md, lg, or xl");
  }
  if (props.accessibility !== undefined && !avatarAccessibilities.includes(props.accessibility)) {
    throw new Error("Avatar accessibility must be label or hidden");
  }
  for (const [key, value] of [
    ["imageSource", props.imageSource],
    ["name", props.name],
    ["accessibilityLabel", props.accessibilityLabel],
  ] as const) {
    if (value !== undefined && typeof value !== "string") {
      throw new Error(`Avatar ${key} must be a string`);
    }
  }
}

export function getAvatarInitials(name: string | undefined): string | undefined {
  const normalizedName = normalizeOptionalText(name);
  if (!normalizedName) return undefined;

  const firstCharacter = Array.from(normalizedName)[0];
  if (!firstCharacter) return undefined;
  if (cjkInitialPattern.test(firstCharacter)) return firstCharacter;
  if (!latinInitialPattern.test(firstCharacter)) return undefined;

  const initials = normalizedName
    .split(/\s+/)
    .map((word) => Array.from(word)[0])
    .filter((character): character is string =>
      Boolean(character && latinInitialPattern.test(character)),
    )
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || undefined;
}

export function getAvatarContract(
  props: AvatarProps,
  imageStatus?: AvatarImageStatus,
): AvatarContract {
  validateAvatarProps(props);
  const normalizedImageStatus = imageStatus ?? (props.imageSource ? "loading" : "idle");
  if (!avatarImageStatuses.includes(normalizedImageStatus)) {
    throw new Error("Avatar imageStatus must be idle, loading, loaded, or error");
  }

  const size = props.size ?? "md";

  const name = normalizeOptionalText(props.name);
  const imageSource = normalizeOptionalText(props.imageSource);
  const initials = getAvatarInitials(name);
  const content: AvatarContent =
    imageSource && normalizedImageStatus === "loaded"
      ? "image"
      : initials
        ? "initials"
        : "placeholder";
  const accessibility = props.accessibility ?? "label";
  const explicitAccessibilityLabel = normalizeOptionalText(props.accessibilityLabel);
  const accessibilityLabel =
    accessibility === "hidden"
      ? undefined
      : (explicitAccessibilityLabel ??
        name ??
        (content === "placeholder" ? "프로필 사진 없음" : "프로필 사진"));

  return {
    accessibilityElement: accessibility === "label",
    ...(accessibilityLabel ? { accessibilityLabel } : {}),
    className: ["ui-lynx-avatar", `ui-lynx-avatar-${size}`, `ui-lynx-avatar-${content}`].join(" "),
    content,
    ...(imageSource ? { imageSource } : {}),
    ...(initials ? { initials } : {}),
    ...(name ? { name } : {}),
    size,
  };
}
