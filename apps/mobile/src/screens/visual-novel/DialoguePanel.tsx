import type { DialoguePanelProps } from "./visual-novel.contract";
import "./visual-novel.css";

/** Importable inert dialogue/action shell. */
export function DialoguePanel({
  beatId,
  speakerName,
  dialogue,
  translation,
  romanization,
  action,
}: DialoguePanelProps) {
  return (
    <view className="visual-novel-dialogue" data-testid={`visual-novel-dialogue-${beatId}`}>
      <scroll-view
        className="visual-novel-dialogue-scroll"
        scroll-orientation="vertical"
        accessibility-element={true}
        accessibility-label={[speakerName, dialogue, romanization, translation]
          .filter(Boolean)
          .join(", ")}
        data-testid={`visual-novel-dialogue-content-${beatId}`}
      >
        <view className="visual-novel-dialogue-content">
          <text accessibility-element={false} className="visual-novel-dialogue-speaker">
            {speakerName}
          </text>
          <text accessibility-element={false} className="visual-novel-dialogue-body">
            {dialogue}
          </text>
          {romanization ? (
            <text className="visual-novel-dialogue-support" accessibility-element={false}>
              {romanization}
            </text>
          ) : null}
          {translation ? (
            <text className="visual-novel-dialogue-support" accessibility-element={false}>
              {translation}
            </text>
          ) : null}
        </view>
      </scroll-view>
      <view
        data-testid={
          action.kind === "advance" ? "visual-novel-advance-button" : "visual-novel-replay-button"
        }
        accessibility-element={true}
        accessibility-label={action.label}
        accessibility-traits="button"
        bindtap={action.onSelect}
        className="visual-novel-dialogue-action"
      >
        <text accessibility-element={false} className="visual-novel-dialogue-action-label">
          {action.label}
        </text>
      </view>
    </view>
  );
}
