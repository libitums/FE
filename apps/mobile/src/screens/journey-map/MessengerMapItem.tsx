import type { MessengerMapItemProps } from "../messenger/messenger.contract";
import message02 from "@libitums/icons/lynx/message-02";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import "./messenger-map-item.css";

// 특별 유닛은 일반 스텝 상태와 독립적으로 언제나 선택할 수 있습니다.
export function MessengerMapItem({ id, title, status, onSelect }: MessengerMapItemProps) {
  return (
    <view
      className="messenger-map-item"
      data-testid={`journey-messenger-item-${id}`}
      data-status={status}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={status === "completed" ? `${title}, 완료됨` : title}
      bindtap={() => onSelect(id)}
    >
      <svg className="messenger-map-item-icon" content={message02} current-color={color.fg.brand} />
      <text className="messenger-map-item-title">{title}</text>
      {status === "completed" ? (
        <view className="messenger-map-item-completed">
          <svg
            className="messenger-map-item-tick"
            content={tick}
            current-color={color.feedback["correct-text"]}
          />
          <text className="messenger-map-item-status">, 완료됨</text>
        </view>
      ) : null}
    </view>
  );
}
