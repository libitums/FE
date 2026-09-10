import { useReducer } from "@lynx-js/react";

import { DialoguePanel } from "./DialoguePanel";
import { VisualNovelScene } from "./VisualNovelScene";
import {
  advanceVisualNovel,
  currentVisualNovelBeat,
  initialVisualNovelSessionState,
  visualNovelExitOutcome,
  visualNovelProgressLabel,
  visualNovelSessionReducer,
} from "./visual-novel";
import { artworkFor } from "./visual-novel-artwork";
import type { VisualNovelScreenProps } from "./visual-novel.contract";
import "./visual-novel.css";

export function VisualNovelScreen({
  story,
  progress,
  onAdvance,
  onExit,
  onReplay,
}: VisualNovelScreenProps) {
  const [session, dispatch] = useReducer(
    visualNovelSessionReducer,
    progress,
    initialVisualNovelSessionState,
  );
  const beat = currentVisualNovelBeat(story, session);

  const handleAdvance = () => {
    "background only";
    onAdvance(story.unitId, advanceVisualNovel(session, progress));
    dispatch({ type: "advance" });
  };
  const handleReplay = () => {
    "background only";
    onReplay(story.unitId);
    dispatch({ type: "replay" });
  };
  const handleExit = () => {
    "background only";
    onExit(visualNovelExitOutcome(progress), beat.id);
  };

  return (
    <view
      className="visual-novel-screen visual-novel-large-text-reflow"
      data-testid="visual-novel-screen"
    >
      <view className="visual-novel-header visual-novel-large-text-reflow">
        <text
          className="visual-novel-title"
          data-testid="visual-novel-title"
          accessibility-traits="header"
        >
          {story.title}
        </text>
        <text className="visual-novel-progress" data-testid="visual-novel-progress">
          {visualNovelProgressLabel(session)}
        </text>
      </view>
      <view className="visual-novel-scene-shell">
        <VisualNovelScene
          beat={beat}
          backgroundArtwork={artworkFor(beat.backgroundId)}
          characterArtwork={artworkFor(beat.characterPoseId)}
          replaying={session.replaying}
        />
        <DialoguePanel
          beatId={beat.id}
          speakerName={beat.speakerName}
          dialogue={beat.dialogue}
          action={
            session.mode === "final"
              ? { kind: "replay", label: "처음부터 보기", onSelect: handleReplay }
              : { kind: "advance", label: "다음", onSelect: handleAdvance }
          }
        />
      </view>
      <view
        className="visual-novel-exit"
        data-testid="visual-novel-exit-button"
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label="맵으로"
        bindtap={handleExit}
      >
        <text accessibility-element={false}>맵으로</text>
      </view>
    </view>
  );
}
