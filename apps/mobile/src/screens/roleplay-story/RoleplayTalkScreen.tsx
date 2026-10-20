import { useEffect, useReducer, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import volume from "@libitums/icons/lynx/volume";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import { useSpeechAttempt } from "../../components/use-speech-attempt";
import { announce } from "../../lib/accessibility";
import { playSound } from "../../lib/sound-effects";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useAudioCue } from "../../lib/use-audio-cue";
import { useScreenBack } from "../../lib/use-back-handler";
import { NarrativeBackground } from "../episode-narrative/NarrativeBackground";
import {
  initialRoleplayTalkState,
  isRoleplayTalkDone,
  judgeRoleplayReply,
  roleplayTalkReducer,
} from "./roleplay-story";
import type { RoleplayTalkScreenProps } from "./roleplay-story.contract";
import { RoleplaySpeakControls } from "./RoleplaySpeakControls";

import "./roleplay-story-screen.css";

/**
 * 롤플레이 대화입니다 — 표지와 같은 장면 위에 상대 대사 다이얼로그가 서고, 그 아래 마이크로 내 대답을 말합니다.
 * 들은 뒤에는 같은 다이얼로그의 「Me」(독백 꼴)로 내 말을 보이고 판정을 붙입니다. 인식은 앱 내장 모듈(기기 안)입니다.
 */
export function RoleplayTalkScreen({
  insets,
  ordinal,
  counterpartName,
  turns,
  wildcards,
  onFinish,
  onExit,
}: RoleplayTalkScreenProps): ReactNode {
  const copy = useUiCopy();
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  const [state, dispatch] = useReducer(roleplayTalkReducer, initialRoleplayTalkState);
  const [replays, setReplays] = useState(0);
  const finished = useRef(false);
  const done = isRoleplayTalkDone(state, turns.length);
  const turn = turns[Math.min(state.turnIndex, turns.length - 1)] ?? turns[0];
  const isLast = state.turnIndex === turns.length - 1;
  const heard = state.phase === "heard";
  const correct = heard && state.verdict === "correct";

  const attempt = useSpeechAttempt((outcome) => {
    if (outcome.kind === "heard") {
      dispatch({
        type: "heard",
        text: outcome.text,
        verdict: judgeRoleplayReply(turn.accepted, outcome.text, wildcards),
      });
      return;
    }
    dispatch({ type: "unavailable" });
  });

  const cueSource = correct ? turn.replyAudioSource : turn.counterpartAudioSource;
  const audio = useAudioCue(
    cueSource === undefined || done
      ? null
      : {
          key: `${String(state.turnIndex)}:${correct ? "reply" : String(replays)}`,
          source: cueSource,
        },
  );

  useEffect(() => {
    if (!done || finished.current) return;
    finished.current = true;
    onFinish(state.results, state.skippedCount);
  }, [done]);

  useEffect(() => {
    if (state.verdict !== null) {
      announce(
        state.verdict === "correct" ? copy.roleplayStory.great : copy.roleplayStory.notQuite,
      );
    }
  }, [state.turnIndex, state.verdict]);

  const handleExit = () => {
    "background only";
    audio.stop();
    attempt.stop();
    onExit();
  };
  useScreenBack(handleExit);

  const tapMic = () => {
    "background only";
    playSound("button");
    if (state.phase === "listening") {
      attempt.stop();
      return;
    }
    audio.stop();
    dispatch({ type: "start" });
    attempt.start();
  };
  const run = (type: "next" | "skip" | "retry" | "hint") => () => {
    "background only";
    playSound("button");
    dispatch({ type });
  };

  const micLabel = state.phase === "listening" ? copy.roleplayStory.stop : copy.roleplayStory.speak;

  return (
    <view
      className="roleplay-story-screen"
      data-testid="roleplay-talk-screen"
      data-statusbar={lightStatusBarIcons}
      data-turnIndex={state.turnIndex}
      data-phase={state.phase}
    >
      <view className="roleplay-story-screen-backdrop" />
      <view className="roleplay-story-screen-scene" accessibility-elements-hidden={true}>
        {turn.imageUrl === null ? null : (
          <NarrativeBackground
            key={turn.imageUrl}
            src={turn.imageUrl}
            previousSrc={turns[state.turnIndex - 1]?.imageUrl ?? null}
            animated
            reducedMotion={reducedMotion}
          />
        )}
        <view className="roleplay-story-screen-shade" />
      </view>

      <view
        className="roleplay-story-screen-safe"
        flatten={false}
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="roleplay-story-screen-header">
          <view data-testid="roleplay-talk-back">
            <RoundButton
              accessibilityLabel={copy.common.exitTo.roleplay}
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
              bindtap={handleExit}
            />
          </view>
          <view className="roleplay-story-screen-header-text">
            <text className="roleplay-story-screen-title" accessibility-traits="header">
              {copy.catalogMap.episodeLabel(ordinal)}
            </text>
            <text className="roleplay-story-screen-progress" data-testid="roleplay-talk-progress">
              {copy.roleplayStory.lineProgress(
                Math.min(state.turnIndex + 1, turns.length),
                turns.length,
              )}
            </text>
          </view>
        </view>

        <view className="roleplay-story-screen-spacer" />

        <view className="roleplay-story-screen-bottom">
          {heard ? (
            <view data-testid="roleplay-talk-reply" data-verdict={state.verdict ?? ""}>
              <text
                className={`roleplay-story-verdict roleplay-story-verdict-${correct ? "correct" : "incorrect"}`}
                data-testid="roleplay-talk-verdict"
              >
                {correct ? copy.roleplayStory.great : copy.roleplayStory.notQuite}
              </text>
              <VisualNovelDialog
                variant="thought"
                speakerName={copy.roleplayStory.me}
                line={correct ? turn.accepted[0] : state.heard || copy.roleplayStory.heardNothing}
                translation={
                  correct
                    ? (turn.replyTranslation ?? undefined)
                    : copy.catalogFinal.correctAnswer(turn.accepted[0])
                }
                reveal="instant"
                continueIndicator="off"
                surface="opaque"
                contentLanguage="learning"
                languageTag="ko"
                reducedMotion={reducedMotion}
              />
            </view>
          ) : (
            <view className="roleplay-story-line" data-testid="roleplay-talk-line">
              <VisualNovelDialog
                speakerName={counterpartName}
                line={turn.line.ko}
                translation={turn.line.en ?? turn.line.roman ?? undefined}
                reveal="instant"
                continueIndicator="off"
                surface="opaque"
                contentLanguage="learning"
                languageTag="ko"
                reducedMotion={reducedMotion}
              />
              {turn.counterpartAudioSource === undefined ? null : (
                <view className="roleplay-story-replay" data-testid="roleplay-talk-replay">
                  <RoundButton
                    accessibilityLabel={copy.roleplayStory.playAgain}
                    icon={volume}
                    variant="neutral"
                    size="m"
                    bindtap={() => setReplays((count) => count + 1)}
                  />
                </view>
              )}
            </view>
          )}

          {heard ? (
            <view className="roleplay-story-actions" data-testid="roleplay-talk-actions">
              {correct ? null : (
                <view data-testid="roleplay-talk-retry">
                  <Button
                    label={copy.speaking.tryAgain}
                    variant="brand"
                    size="xl"
                    width="fill"
                    bindtap={run("retry")}
                  />
                </view>
              )}
              <view data-testid="roleplay-talk-next">
                <Button
                  label={isLast ? copy.common.seeResults : copy.common.next}
                  variant={correct ? "brand" : "text"}
                  size="xl"
                  width="fill"
                  bindtap={run("next")}
                />
              </view>
            </view>
          ) : (
            <RoleplaySpeakControls
              phase={state.phase}
              hint={state.hintShown ? turn.replyTranslation : null}
              canShowHint={turn.replyTranslation !== null && !state.hintShown}
              onMic={tapMic}
              onHint={run("hint")}
              onSkip={run("skip")}
            />
          )}
        </view>
      </view>
    </view>
  );
}
