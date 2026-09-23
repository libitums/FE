import { useReducer } from "@lynx-js/react";

import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
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

// `exitLabel`은 어느 탭에서 열렸는지를 화면이 알아서가 아니라 데이터로 받습니다
// (ADR-0007 D3). 기본값은 여정 라벨이라 기존 호출은 수정 없이 성립합니다.
//
// 머리 재배치입니다 — 나가기가 머리의 첫 흐름 자식이고, 제목·진행을 제목 묶음
// `<view className="visual-novel-header-text">`(testid·접근성 속성 없음)로
// 감쌉니다. 여정·롤플레이 두 경로 공통입니다.
export function VisualNovelScreen({
  story,
  progress,
  exitLabel = specialUnitExitLabel("journey"),
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
        <view
          className="visual-novel-exit"
          data-testid="visual-novel-exit-button"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={exitLabel}
          bindtap={handleExit}
        >
          <text accessibility-element={false}>{exitLabel}</text>
        </view>
        <view className="visual-novel-header-text">
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
    </view>
  );
}
