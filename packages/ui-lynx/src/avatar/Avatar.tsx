import { useState } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";
import user from "@libitums/icons/lynx/user";

import type { AvatarImageStatus, AvatarProps } from "./avatar.contract";
import { getAvatarContract } from "./avatar.contract";

const placeholderIcon = user.replace(/currentColor/g, color.fg["neutral-subtle"]);

export function Avatar(props: AvatarProps) {
  const normalizedSource = typeof props.imageSource === "string" ? props.imageSource.trim() : "";
  const [loadedSource, setLoadedSource] = useState<string | undefined>();
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const imageStatus: AvatarImageStatus = !normalizedSource
    ? "idle"
    : loadedSource === normalizedSource
      ? "loaded"
      : failedSource === normalizedSource
        ? "error"
        : "loading";
  const contract = getAvatarContract(props, imageStatus);

  function handleImageLoad() {
    setFailedSource(undefined);
    setLoadedSource(normalizedSource);
  }

  function handleImageError() {
    setLoadedSource(undefined);
    setFailedSource(normalizedSource);
  }

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-avatar"
      data-content={contract.content}
      data-size={contract.size}
      accessibility-element={contract.accessibilityElement}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits={contract.accessibilityElement ? "image" : undefined}
      accessibility-elements-hidden={!contract.accessibilityElement}
      focusable={false}
    >
      {contract.imageSource ? (
        <image
          key={contract.imageSource}
          className={`ui-lynx-avatar-image ui-lynx-avatar-image-${imageStatus}`}
          data-testid="ui-lynx-avatar-image"
          src={contract.imageSource}
          mode="aspectFill"
          bindload={handleImageLoad}
          binderror={handleImageError}
          accessibility-elements-hidden={true}
        />
      ) : null}
      {contract.content === "initials" ? (
        <text
          className="ui-lynx-avatar-initials"
          data-testid="ui-lynx-avatar-initials"
          accessibility-elements-hidden={true}
        >
          {contract.initials}
        </text>
      ) : null}
      {contract.content === "placeholder" ? (
        <svg
          className="ui-lynx-avatar-placeholder"
          data-testid="ui-lynx-avatar-placeholder"
          content={placeholderIcon}
          current-color={color.fg["neutral-subtle"]}
          accessibility-elements-hidden={true}
        />
      ) : null}
    </view>
  );
}
