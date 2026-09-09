import type { PhoneCallMapItemProps } from "../phone-call/phone-call.contract";
import phone from "@libitums/icons/lynx/phone";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import "./phone-call-map-item.css";

// 전화 맵 항목의 계약만 먼저 연결한다. 실제 마크업과 동작은 UI red 이후 구현한다.
export function PhoneCallMapItem({ id, title, status, onSelect }: PhoneCallMapItemProps) {
  return (
    <view
      className="phone-call-map-item"
      data-testid={`journey-map-phone-call-${id}`}
      data-status={status}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={status === "completed" ? `${title}, 완료됨` : title}
      bindtap={() => onSelect(id)}
    >
      <svg className="phone-call-map-item-icon" content={phone} current-color={color.fg.brand} />
      <text className="phone-call-map-item-title">{title}</text>
      {status === "completed" ? (
        <view className="phone-call-map-item-completed">
          <svg
            className="phone-call-map-item-tick"
            content={tick}
            current-color={color.feedback["correct-text"]}
          />
          <text className="phone-call-map-item-status">, 완료됨</text>
        </view>
      ) : null}
    </view>
  );
}
