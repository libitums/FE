import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { zeroSafeAreaInsets } from "../../lib/safe-area";
import { useReducer, useState } from "@lynx-js/react";

import { announceCompletion } from "../../lib/accessibility";
import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import { useUiCopy } from "../../lib/ui-copy";
import { DialoguePanel } from "./DialoguePanel";
import { VisualNovelScene } from "./VisualNovelScene";
import {
  advanceVisualNovel,
  currentVisualNovelBeat,
  initialVisualNovelSessionState,
  visualNovelExitOutcome,
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
  insets = zeroSafeAreaInsets,
  story,
  progress,
  exitTo = "journey",
  onAdvance,
  onExit,
  onFinish,
}: VisualNovelScreenProps) {
  const copy = useUiCopy();
  const exitLabel = specialUnitExitLabel(exitTo, copy);
  const [session, dispatch] = useReducer(
    visualNovelSessionReducer,
    progress,
    initialVisualNovelSessionState,
  );
  const beat = currentVisualNovelBeat(story, session);
  const [showReply, setShowReply] = useState(false);
  const line = showReply && beat.reply ? beat.reply : beat;
  const finishing = session.mode === "final" && (showReply || !beat.reply);

  const handleAdvance = () => {
    "background only";
    if (beat.reply && !showReply) {
      setShowReply(true);
      return;
    }
    const outcome = advanceVisualNovel(session, progress);
    // 마지막 장면은 내 응답까지 읽고 Continue를 눌러야 완료합니다.
    if (session.mode === "final" || outcome.session.mode !== "final") {
      onAdvance(story.unitId, outcome);
      if (outcome.completedNow && outcome.announcement !== null)
        announceCompletion(copy.visualNovel.storyComplete);
    }
    if (session.mode === "final") {
      onFinish(story.unitId);
      return;
    }
    setShowReply(false);
    dispatch({ type: "advance" });
  };
  const handleExit = () => {
    "background only";
    onExit(visualNovelExitOutcome(progress), beat.id);
  };

  return (
    <view
      className="visual-novel-screen visual-novel-large-text-reflow"
      data-testid="visual-novel-screen"
      style={{
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      }}
    >
      <VisualNovelScene
        beat={beat}
        backgroundArtwork={artworkFor(beat.backgroundId)}
        characterArtwork={artworkFor(beat.characterPoseId)}
        replaying={session.replaying}
      />
      <view
        className="visual-novel-shade"
        event-through={true}
        accessibility-elements-hidden={true}
      />
      <view className="visual-novel-header visual-novel-large-text-reflow">
        <view
          className="visual-novel-exit"
          data-testid="visual-novel-exit-button"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={exitLabel}
          bindtap={handleExit}
        >
          <view accessibility-elements-hidden={true}>
            <RoundButton
              accessibilityLabel={exitLabel}
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
            />
          </view>
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
            {copy.visualNovel.sceneProgress(session.beatIndex + 1, story.beats.length)}
          </text>
          {beat.context ? (
            <text className="visual-novel-context" data-testid="visual-novel-context">
              {beat.context}
            </text>
          ) : null}
        </view>
      </view>
      <view className="visual-novel-scene-shell">
        <DialoguePanel
          beatId={beat.id}
          speakerName={showReply ? copy.common.me : beat.speakerName}
          dialogue={line.dialogue}
          translation={line.translation}
          romanization={line.romanization}
          action={
            finishing
              ? { kind: "finish", label: copy.common.continue, onSelect: handleAdvance }
              : { kind: "advance", label: copy.common.next, onSelect: handleAdvance }
          }
        />
      </view>
    </view>
  );
}
