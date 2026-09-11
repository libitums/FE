import type {} from "@lynx-js/react";
import { color } from "@libitums/design-tokens";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import info02 from "@libitums/icons/lynx/info-02";
import type { BackHeaderProps } from "./contract";

export function BackHeader(props: BackHeaderProps) {
  function handleBack() {
    "background only";
    props.onBack();
  }
  function handleInfo() {
    "background only";
    props.onInfo?.();
  }
  return (
    <view className="ui-lynx-back-header" data-testid="ui-lynx-back-header">
      <view className="ui-lynx-back-header-leading" bindtap={handleBack}>
        <view
          className="ui-lynx-back-header-back-icon-area"
          data-testid="ui-lynx-back-header-back"
          accessibility-element={true}
          accessibility-label={`뒤로, ${props.title}`}
          accessibility-traits="button"
          catchtap={handleBack}
        >
          <svg
            className="ui-lynx-back-header-icon ui-lynx-back-header-icon-default"
            data-testid="ui-lynx-back-header-back-icon"
            content={arrowLeft03}
            current-color={color.fg["neutral-subtle"]}
          />
          <svg
            className="ui-lynx-back-header-icon ui-lynx-back-header-icon-pressed"
            content={arrowLeft03}
            current-color={color.fg.neutral}
          />
        </view>
        <view className="ui-lynx-back-header-copy">
          <text
            className="ui-lynx-back-header-title"
            data-testid="ui-lynx-back-header-title"
            accessibility-traits="header"
          >
            {props.title}
          </text>
          {props.subtitle ? (
            <text
              className="ui-lynx-back-header-subtitle"
              data-testid="ui-lynx-back-header-subtitle"
            >
              {props.subtitle}
            </text>
          ) : null}
        </view>
      </view>
      {props.showInfo && props.onInfo ? (
        <view
          className="ui-lynx-back-header-info"
          data-testid="ui-lynx-back-header-info"
          accessibility-element={true}
          accessibility-label="화면 정보"
          accessibility-traits="button"
          bindtap={handleInfo}
        >
          <svg
            className="ui-lynx-back-header-icon ui-lynx-back-header-icon-default"
            data-testid="ui-lynx-back-header-info-icon"
            content={info02}
            current-color={color.fg["neutral-subtle"]}
          />
          <svg
            className="ui-lynx-back-header-icon ui-lynx-back-header-icon-pressed"
            content={info02}
            current-color={color.fg.neutral}
          />
        </view>
      ) : null}
    </view>
  );
}
