import { color } from "@libitums/design-tokens";
import arrowRight from "@libitums/icons/lynx/arrow-right";

import { Avatar } from "../avatar";
import {
  getSettingsCellContract,
  validateSettingsGroup,
  type SettingsCellProps,
  type SettingsGroupProps,
} from "./settings-cell.contract";

const arrowContent = arrowRight.replace(/currentColor/g, color.fg["neutral-subtle"]);

function Cell(
  props: SettingsCellProps & { readonly position?: "first" | "middle" | "last" | "only" },
) {
  const contract = getSettingsCellContract(props);

  function handleTap() {
    "background only";
    if (props.disabled) return;
    if (props.trailing === "toggle") props.onChange(!props.checked);
    else props.onNavigate();
  }

  return (
    <view
      className={`${contract.className}${props.position ? ` ui-lynx-settings-cell-${props.position}` : ""}`}
      data-testid="ui-lynx-settings-cell"
      data-trailing={props.trailing}
      data-checked={props.trailing === "toggle" ? String(props.checked) : undefined}
      data-disabled={String(contract.disabled)}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits={contract.disabled ? "disabled" : "button"}
      accessibility-role-description={props.trailing === "toggle" ? "switch" : undefined}
      focusable={!contract.disabled}
      bindtap={contract.disabled ? undefined : handleTap}
    >
      {props.avatar ? <Avatar {...props.avatar} size="sm" accessibility="hidden" /> : null}
      <view className="ui-lynx-settings-cell-content">
        <text className="ui-lynx-settings-cell-title">{props.title.trim()}</text>
        {contract.description ? (
          <text className="ui-lynx-settings-cell-description">{contract.description}</text>
        ) : null}
      </view>
      {props.trailing === "toggle" ? (
        <view
          className={`ui-lynx-settings-cell-switch${props.checked ? " ui-lynx-settings-cell-switch-on" : ""}`}
          accessibility-elements-hidden={true}
        >
          <view className="ui-lynx-settings-cell-switch-knob" />
        </view>
      ) : (
        <view className="ui-lynx-settings-cell-navigation" accessibility-elements-hidden={true}>
          {contract.value ? (
            <text className="ui-lynx-settings-cell-value">{contract.value}</text>
          ) : null}
          <svg
            className="ui-lynx-settings-cell-arrow"
            content={arrowContent}
            current-color={color.fg["neutral-subtle"]}
          />
        </view>
      )}
    </view>
  );
}

export function SettingsCell(props: SettingsCellProps) {
  return <Cell {...props} />;
}

export function SettingsGroup(props: SettingsGroupProps) {
  validateSettingsGroup(props);
  return (
    <view
      className="ui-lynx-settings-group"
      data-testid="ui-lynx-settings-group"
      accessibility-element={true}
      accessibility-label={props.accessibilityLabel.trim()}
    >
      {props.items.map((item, index) => (
        <view className="ui-lynx-settings-group-item" key={item.id}>
          <Cell
            {...item}
            position={
              props.items.length === 1
                ? "only"
                : index === 0
                  ? "first"
                  : index === props.items.length - 1
                    ? "last"
                    : "middle"
            }
          />
          {index < props.items.length - 1 ? (
            <view className="ui-lynx-settings-group-divider" accessibility-elements-hidden={true} />
          ) : null}
        </view>
      ))}
    </view>
  );
}
