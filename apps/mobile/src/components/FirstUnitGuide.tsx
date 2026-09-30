import arrowDown03 from "@libitums/icons/lynx/arrow-down-03";
import { color } from "@libitums/design-tokens";
import { Overlay } from "@libitums/ui-lynx/overlay";
import { useUiCopy } from "../lib/ui-copy";
import type { FirstUnitGuideStep } from "./first-unit-guide";
import "./first-unit-guide.css";

export function FirstUnitGuide({
  step,
  onDismiss,
}: {
  step: Exclude<FirstUnitGuideStep, "map">;
  onDismiss: () => void;
}) {
  const copy = useUiCopy().episodeIntro.guide;
  const message = copy[step];
  const handleDismiss = () => {
    "background only";
    onDismiss();
  };
  return (
    <view
      className="first-unit-guide"
      data-testid={`first-unit-guide-${step}`}
      catchtap={handleDismiss}
    >
      <Overlay scope="area" />
      <view
        className="first-unit-guide-content"
        accessibility-element={true}
        accessibility-exclusive-focus={true}
        accessibility-traits="button"
        accessibility-label={`${message.title}. ${message.description} ${copy.continue}`}
      >
        <text className="first-unit-guide-title">{message.title}</text>
        <text className="first-unit-guide-description">{message.description}</text>
        <view className="first-unit-guide-continue">
          <svg
            className="first-unit-guide-arrow"
            content={arrowDown03}
            current-color={color.brand.primary}
          />
          <text className="first-unit-guide-instruction">{copy.continue}</text>
        </view>
      </view>
    </view>
  );
}
