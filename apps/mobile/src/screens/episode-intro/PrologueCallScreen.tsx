import { FirstUnitGuide } from "../../components/FirstUnitGuide";
import { useFirstUnitGuide } from "../../components/first-unit-guide";
import { useEffect, useState } from "@lynx-js/react";
import { Button } from "@libitums/ui-lynx/button";
import type { PrologueCallScreenProps } from "./episode-intro.contract";
import { prologueLineSeconds } from "./prologue-call";
import { CallLineBubble } from "../../components/CallCaller";
import { CallControls } from "../../components/CallControls";
import { CallScreen } from "../../components/CallScreen";
import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { playSound, stopRing } from "../../lib/sound-effects";
import { usePrologueCallPlayback } from "./usePrologueCallPlayback";
import "./prologue-call-screen.css";

/** 받기 뒤 자막이 자동 진행되는 서사 통화입니다. 음원 대사는 재생 완료 후, 무음 대사는 읽기 시간 후 전환합니다. */
export function PrologueCallScreen({
  insets,
  guided = false,
  episodeLabel,
  call,
  callerPortrait,
  onComplete,
  onBack,
  reducedMotion = false,
}: PrologueCallScreenProps) {
  const copy = useUiCopy();
  const guide = useFirstUnitGuide("call", guided);
  const [accepted, setAccepted] = useState(false);
  const {
    ended,
    line,
    lineIndex,
    replayKey,
    paused,
    audioSource,
    togglePlayback,
    replay,
    hangUp,
    stop,
  } = usePrologueCallPlayback(call, accepted && !guide.visible);
  const incoming = !accepted && !ended;
  useEffect(() => {
    if (!incoming || guide.visible) return undefined;
    playSound("ring_bell");
    return () => stopRing();
  }, [incoming, guide.visible]);
  const subtitleIntervalMs = Math.max(
    0,
    Math.min(
      35,
      (prologueLineSeconds * 1000 - 1000) / Math.max(1, Array.from(line?.text ?? "").length),
    ),
  );

  const handleBack = () => {
    "background only";
    stopRing();
    stop();
    onBack();
  };
  // 시스템 뒤로가기 = 보이는 뒤로와 같은 함수입니다(벨 · 재생 정지 포함).
  useScreenBack(handleBack);

  const handleAccept = () => {
    "background only";
    if (!guide.visible) {
      stopRing();
      playSound("accept_call");
      setAccepted(true);
    }
  };
  const handleHangUp = () => {
    "background only";
    stopRing();
    hangUp();
  };

  return (
    <view
      className="prologue-call-screen-safe"
      style={{
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      }}
    >
      <CallScreen
        title={episodeLabel}
        status={copy.phoneCall.status[ended ? "completed" : incoming ? "incoming" : "playing"]}
        phase={ended ? "completed" : incoming ? "incoming" : "active"}
        callerName={call.callerName}
        callerPortrait={callerPortrait}
        clockRunning={accepted && !ended && !guide.visible}
        exitLabel={copy.common.exitTo.journey}
        onBack={handleBack}
        testId="prologue-call-screen"
        testIdPrefix="prologue-call-screen"
        backTestId="prologue-call-screen-back"
        actions={
          <>
            <CallControls
              incoming={incoming}
              ended={ended}
              playLabel={
                incoming
                  ? copy.phoneCall.play.start
                  : audioSource
                    ? copy.phoneCall.play["listen-again"]
                    : null
              }
              playTestId={incoming ? "prologue-call-screen-accept" : "prologue-call-screen-replay"}
              hangUpTestId="prologue-call-screen-end"
              onPlay={incoming ? handleAccept : replay}
              playback={
                audioSource
                  ? { paused, onToggle: togglePlayback, testId: "prologue-call-screen-playback" }
                  : undefined
              }
              onHangUp={handleHangUp}
            />
            {ended ? (
              <view
                data-testid="prologue-call-screen-complete"
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-label={copy.common.continue}
                bindtap={onComplete}
              >
                <view accessibility-elements-hidden={true}>
                  <Button label={copy.common.continue} size="xl" width="fill" />
                </view>
              </view>
            ) : null}
          </>
        }
      >
        {!incoming && line ? (
          <CallLineBubble
            text={line.text}
            translation={line.translation}
            testIdPrefix="prologue-call-screen"
            reveal={ended ? "instant" : "typewriter"}
            intervalMs={subtitleIntervalMs}
            resetKey={`${lineIndex}:${replayKey}`}
            reducedMotion={reducedMotion}
          />
        ) : null}
      </CallScreen>
      {guide.visible ? <FirstUnitGuide step="call" onDismiss={guide.dismiss} /> : null}
    </view>
  );
}
