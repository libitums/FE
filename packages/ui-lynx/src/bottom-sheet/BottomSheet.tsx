import { useRef } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";
import cross from "@libitums/icons/lynx/cross";

import { Button } from "../button/Button";
import {
  getBottomSheetContract,
  shouldDismissBottomSheetDrag,
  type BottomSheetProps,
} from "./bottom-sheet.contract";

type BottomSheetTouchEvent = {
  readonly detail: { readonly y: number };
};

export function BottomSheet(props: BottomSheetProps) {
  const contract = getBottomSheetContract(props);
  const dragStartY = useRef<number | null>(null);

  function handleScrimTap() {
    "background only";
    props.ondismiss("scrim");
  }

  function handlePanelTap() {
    "background only";
  }

  function handleCloseTap() {
    "background only";
    props.ondismiss("close-button");
  }

  function handleDragStart(event: BottomSheetTouchEvent) {
    "background only";
    // The ref deliberately carries gesture-local state between native touch callbacks.
    // oxlint-disable-next-line react/immutability
    dragStartY.current = event.detail.y;
  }

  function handleDragEnd(event: BottomSheetTouchEvent) {
    "background only";
    const startY = dragStartY.current;
    // oxlint-disable-next-line react/immutability
    dragStartY.current = null;
    if (startY !== null && shouldDismissBottomSheetDrag(startY, event.detail.y)) {
      props.ondismiss("drag");
    }
  }

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-bottom-sheet"
      data-motion={contract.motion}
      data-draggable={contract.draggable ? "true" : "false"}
    >
      <view
        className="ui-lynx-bottom-sheet-scrim"
        data-testid="ui-lynx-bottom-sheet-scrim"
        accessibility-elements-hidden={true}
        bindtap={handleScrimTap}
      />
      <view
        className="ui-lynx-bottom-sheet-panel"
        data-testid="ui-lynx-bottom-sheet-panel"
        accessibility-role-description="dialog"
        catchtap={handlePanelTap}
      >
        <view
          className="ui-lynx-bottom-sheet-drag-area"
          data-testid="ui-lynx-bottom-sheet-drag-area"
          accessibility-elements-hidden={true}
          pan-intercept-direction={contract.draggable ? 1 : undefined}
          catchtouchstart={contract.draggable ? handleDragStart : undefined}
          catchtouchend={contract.draggable ? handleDragEnd : undefined}
        >
          {contract.draggable ? (
            <view
              className="ui-lynx-bottom-sheet-handle"
              data-testid="ui-lynx-bottom-sheet-handle"
            />
          ) : null}
        </view>

        <view className="ui-lynx-bottom-sheet-header">
          <view className="ui-lynx-bottom-sheet-heading">
            {contract.overline === undefined ? null : (
              <text
                className="ui-lynx-bottom-sheet-overline"
                data-testid="ui-lynx-bottom-sheet-overline"
              >
                {contract.overline}
              </text>
            )}
            <text
              className="ui-lynx-bottom-sheet-title"
              data-testid="ui-lynx-bottom-sheet-title"
              accessibility-traits="header"
            >
              {contract.title}
            </text>
          </view>
          <view
            className="ui-lynx-bottom-sheet-close"
            data-testid="ui-lynx-bottom-sheet-close"
            accessibility-element={true}
            accessibility-label={contract.closeAccessibilityLabel}
            accessibility-traits="button"
            bindtap={handleCloseTap}
          >
            <view className="ui-lynx-bottom-sheet-close-surface">
              <svg
                className="ui-lynx-bottom-sheet-close-icon ui-lynx-bottom-sheet-close-icon-default"
                content={cross}
                current-color={color.fg["neutral-subtle"]}
              />
              <svg
                className="ui-lynx-bottom-sheet-close-icon ui-lynx-bottom-sheet-close-icon-pressed"
                content={cross}
                current-color={color.fg.neutral}
              />
            </view>
          </view>
        </view>

        {contract.hasBody ? (
          <scroll-view
            className="ui-lynx-bottom-sheet-body"
            data-testid="ui-lynx-bottom-sheet-body"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            {contract.description === undefined ? null : (
              <text
                className="ui-lynx-bottom-sheet-description"
                data-testid="ui-lynx-bottom-sheet-description"
              >
                {contract.description}
              </text>
            )}
            {contract.actions.length === 0 ? null : (
              <view
                className={
                  contract.description === undefined
                    ? "ui-lynx-bottom-sheet-actions"
                    : "ui-lynx-bottom-sheet-actions ui-lynx-bottom-sheet-actions-after-description"
                }
              >
                {contract.actions.map((action) => (
                  <view
                    key={action.id}
                    data-testid={`ui-lynx-bottom-sheet-action-${action.id}`}
                    data-size="m"
                    data-width="fill"
                  >
                    <Button
                      label={action.label}
                      variant="brand"
                      size="m"
                      width="fill"
                      disabled={action.disabled}
                      loading={action.loading}
                      icon={action.icon}
                      iconPosition={action.iconPosition}
                      bindtap={action.bindtap}
                    />
                  </view>
                ))}
              </view>
            )}
          </scroll-view>
        ) : null}
      </view>
    </view>
  );
}
