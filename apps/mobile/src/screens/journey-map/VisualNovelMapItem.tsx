import type { VisualNovelMapItemProps } from "../visual-novel/visual-novel.contract";
import book from "@libitums/icons/lynx/book";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import "./visual-novel-map-item.css";

/** Importable UI scaffold; interaction and visual treatment are supplied by the UI layer. */
export function VisualNovelMapItem({ id, title, status, onSelect }: VisualNovelMapItemProps) {
  const handleSelect = () => {
    "background only";
    onSelect(id);
  };

  return (
    <view
      className="visual-novel-map-item"
      data-testid={`journey-map-visual-novel-${id}`}
      data-status={status}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={status === "completed" ? `${title}, 완료됨` : title}
      bindtap={handleSelect}
    >
      <svg className="visual-novel-map-item-icon" content={book} current-color={color.fg.brand} />
      <text className="visual-novel-map-item-title visual-novel-map-item-action-label">
        {title}
      </text>
      {status === "completed" ? (
        <view className="visual-novel-map-item-completed">
          <svg
            className="visual-novel-map-item-tick"
            content={tick}
            current-color={color.feedback["correct-text"]}
          />
          <text className="visual-novel-map-item-status">완료됨</text>
        </view>
      ) : null}
    </view>
  );
}
