import { color } from "@libitums/design-tokens";
import arrowRight from "@libitums/icons/lynx/arrow-right";

import { Avatar } from "../avatar";
import { motionClassName } from "../motion/motion.contract";
import { useMotion } from "../motion/MotionProvider";
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
  const motion = useMotion();
  const contract = getSettingsCellContract(props, motion);
  // 형태 토큰(position)이 motion 토큰보다 앞에 오도록 contract의 motion 토큰을 떼어 뒤에 다시 붙입니다.
  const motionToken = motionClassName("ui-lynx-settings-cell", motion);
  const className = [
    ...contract.className.split(" ").filter((token) => token !== motionToken),
    props.position ? `ui-lynx-settings-cell-${props.position}` : undefined,
    motionToken,
  ]
    .filter(Boolean)
    .join(" ");

  function handleTap() {
    "background only";
    if (props.disabled) return;
    if (props.trailing === "toggle") props.onChange(!props.checked);
    else props.onNavigate();
  }

  return (
    <view
      className={className}
      data-testid="ui-lynx-settings-cell"
      data-motion={motion === "reduced" ? "reduced" : undefined}
      data-trailing={props.trailing}
      data-checked={props.trailing === "toggle" ? String(props.checked) : undefined}
      data-disabled={String(contract.disabled)}
      accessibility-element={true}
      flatten={false}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits={contract.disabled ? "disabled" : "button"}
      accessibility-enable-tap={contract.accessibilityTapEnabled ? true : undefined}
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
      // 그룹은 접근성 요소가 아닙니다 — 요소로 두면 iOS에서 자손 셀이 그 안에 묶여 셀 하나하나에
      // 닿을 수 없습니다(기기 확인). 셀이 각각 이름 · 상태 · 버튼 특성을 집니다. 그룹 이름은
      // 요소가 아닌 상자에 실어 둡니다 — 화면이 그룹을 가려 집는 손잡이입니다.
      accessibility-element={false}
      accessibility-label={props.accessibilityLabel.trim()}
    >
      {props.items.map((item, index) => (
        // 항목 상자에 `id`를 싣습니다 — 셀의 testid는 모두 같아, 화면이 어느 항목인지 가려
        // 집을 손잡이가 여기뿐입니다.
        <view
          className="ui-lynx-settings-group-item"
          data-testid={`ui-lynx-settings-group-item-${item.id}`}
          key={item.id}
        >
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
