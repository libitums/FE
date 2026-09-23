import type { PhoneCallMapItemProps } from "../phone-call/phone-call.contract";
import phone from "@libitums/icons/lynx/phone";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import "./phone-call-map-item.css";

export function PhoneCallMapItem({ id, title, status, onSelect }: PhoneCallMapItemProps) {
  const handleSelect = () => {
    "background only";
    onSelect(id);
  };

  return (
    <view
      className="phone-call-map-item"
      data-testid={`journey-map-phone-call-${id}`}
      data-status={status}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={status === "completed" ? `${title}, 완료됨` : title}
      bindtap={handleSelect}
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
