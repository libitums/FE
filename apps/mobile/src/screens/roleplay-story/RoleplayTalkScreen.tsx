import { useEffect, useReducer, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import volume from "@libitums/icons/lynx/volume";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import { MicPermissionSheet } from "../../components/mic-permission/MicPermissionSheet";
import { useMicSpeechAttempt } from "../../components/mic-permission/use-mic-speech-attempt";
import { playAudio } from "../../lib/audio";
import { romanizeKorean } from "../../lib/korean-romanize";
import { judgeSpokenAnswer } from "../../lib/speaking-judge";
import { playSound } from "../../lib/sound-effects";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useAudioCue } from "../../lib/use-audio-cue";
import { useScreenBack } from "../../lib/use-back-handler";
import { NarrativeBackground } from "../episode-narrative/NarrativeBackground";
import {
  initialRoleplayTalkState,
  isRoleplayTalkDone,
  roleplayTalkReducer,
} from "./roleplay-story";
import type { RoleplayTalkScreenProps } from "./roleplay-story.contract";
import {
  roleplayHeaderLabel,
  roleplayProgressSegments,
  roleplayTurnReportOf,
} from "./roleplay-panel";
import { RoleplayProgressBar, RoleplayReplyDialogue } from "./RoleplayReplyDialogue";
import { RoleplayResultPanel } from "./RoleplayResultPanel";
import { RoleplaySpeakControls, roleplayTalkMic } from "./RoleplaySpeakControls";
import { useRoleplayAnnouncements } from "./use-roleplay-announcements";

import "./roleplay-story-screen.css";

/** 맞힌 뒤 다음 턴으로 저절로 넘어가기까지(시안 R3) — 누르면 바로 넘어갑니다. */
export const ROLEPLAY_CORRECT_ADVANCE_MS = 2000;

/**
 * 롤플레이 대화입니다 — 표지와 같은 장면 위에 상대 대사가 서고, 아래 흰 패널에 내 문장 · 공용 마이크가 섭니다(시안 R1 ~ R5).
 * 맞으면 내 말풍선 뒤로 상대의 다음 줄이 곧장 반응하고 2초 뒤 다음 턴, 틀리면 정답 문장이 주인공인 패널이 섭니다.
 */
export function RoleplayTalkScreen({
  insets,
  ordinal,
  counterpartName,
  turns,
  wildcards,
  onFinish,
  onExit,
  onTurnAnswered,
  mic,
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

  const { attempt, permission } = useMicSpeechAttempt(roleplayTalkMic(mic), (outcome) => {
    if (outcome.kind === "heard") {
      // 결말 콜백(배경 스레드)에서 채점합니다 — 렌더는 담아 둔 판정만 읽습니다(ADR-0201 개정 ⟨렌더 밖 판정⟩).
      const judgement = judgeSpokenAnswer(turn.accepted, outcome.text, wildcards);
      dispatch({ type: "heard", text: outcome.text, verdict: judgement.result, judgement });
      return;
    }
    if (outcome.kind === "missed") {
      dispatch({ type: "missed", reason: outcome.reason });
      return;
    }
    dispatch({ type: "unavailable", reason: outcome.reason });
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
  }, [done, onFinish, state.results, state.skippedCount]);

  useRoleplayAnnouncements(state);

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
  const run = (type: "next" | "skip" | "retry" | "hint" | "hintShow") => () => {
    "background only";
    playSound("button");
    if (type === "next" || type === "skip") onTurnAnswered?.(roleplayTurnReportOf(state, type));
    dispatch({ type });
  };
  const hear = () => {
    "background only";
    if (turn.replyAudioSource === undefined) return;
    audio.stop();
    if (playAudio(turn.replyAudioSource, () => {}) === "started") dispatch({ type: "hintListen" });
  };
  const expire = () => {
    "background only";
    if (state.phase === "listening") attempt.stop();
  };

  // 맞힌 뒤 2초면 다음 턴으로(시안 R3). 턴 · 국면이 바뀌면 다시 잽니다.
  const advance = useRef(run("next"));
  advance.current = run("next");
  useEffect(() => {
    if (!correct) return undefined;
    const timer = setTimeout(() => advance.current(), ROLEPLAY_CORRECT_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [correct, state.turnIndex]);

  const reaction = correct ? turns[state.turnIndex + 1] : undefined;
  const expected = state.judgement?.expected ?? turn.accepted[0];
  const segments = roleplayProgressSegments(state.turnIndex, turns.length, correct);

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
              {roleplayHeaderLabel(copy.catalogMap.episodeLabel(ordinal))}
            </text>
            <RoleplayProgressBar
              segments={segments}
              label={copy.roleplayStory.lineProgress(
                Math.min(state.turnIndex + 1, turns.length),
                turns.length,
              )}
            />
          </view>
        </view>

        <view className="roleplay-story-screen-spacer" />

        {/* 아래 묶음은 화면보다 길면 줄고, 줄 때는 대사 스크롤만 줄어 말하기 묶음 · 버튼은 늘 화면 안에 섭니다. */}
        <view className="roleplay-story-screen-bottom roleplay-story-screen-bottom-fit">
          <scroll-view
            className="roleplay-story-bottom-scroll"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            {correct ? (
              <RoleplayReplyDialogue
                line={expected}
                translation={turn.replyTranslation}
                counterpartName={counterpartName}
                reaction={reaction}
                reducedMotion={reducedMotion}
              />
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
          </scroll-view>

          {heard ? (
            <view
              data-testid={correct ? undefined : "roleplay-talk-reply"}
              data-verdict={state.verdict ?? ""}
            >
              <RoleplayResultPanel
                correct={correct}
                expected={expected}
                roman={romanizeKorean(expected)}
                heard={state.heard}
                isLast={isLast}
                onHear={turn.replyAudioSource === undefined ? undefined : hear}
                onRetry={run("retry")}
                onNext={run("next")}
              />
            </view>
          ) : (
            <RoleplaySpeakControls
              phase={state.phase}
              unavailableReason={state.unavailableReason}
              missedReason={state.missedReason}
              retrying={state.retrying}
              meaning={turn.replyTranslation}
              korean={
                state.hintUsed === "show"
                  ? { ko: turn.accepted[0], roman: romanizeKorean(turn.accepted[0]) }
                  : null
              }
              hintOpen={state.hintShown}
              canHear={turn.replyAudioSource !== undefined}
              onMic={tapMic}
              onExpire={expire}
              onHint={run("hint")}
              onHear={hear}
              onShowKorean={run("hintShow")}
              onSkip={run("skip")}
            />
          )}
        </view>
      </view>
      <MicPermissionSheet mic={permission} />
    </view>
  );
}
