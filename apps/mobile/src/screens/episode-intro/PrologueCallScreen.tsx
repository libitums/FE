import { useEffect, useState } from "@lynx-js/react";
import { Button } from "@libitums/ui-lynx/button";
import type { PrologueCallScreenProps } from "./episode-intro.contract";
import { prologueCallProgress, prologueLineSeconds } from "./prologue-call";
import { CallLineBubble } from "../../components/CallCaller";
import { CallControls } from "../../components/CallControls";
import { CallScreen } from "../../components/CallScreen";
import { useUiCopy } from "../../lib/ui-copy";
import "./prologue-call-screen.css";

/** 받기 뒤 자막이 자동 진행되는 서사 통화입니다. 음성은 아직 제공되지 않습니다. */
export function PrologueCallScreen({
  insets,
  episodeLabel,
  call,
  callerPortrait,
  onComplete,
  onBack,
  reducedMotion = false,
}: PrologueCallScreenProps) {
  const copy = useUiCopy();
  const [accepted, setAccepted] = useState(false);
  const [lineTicks, setLineTicks] = useState(0);
  const [hungUp, setHungUp] = useState(false);
  const progress = prologueCallProgress(lineTicks * prologueLineSeconds, call.lines.length);
  const ended = hungUp || progress.ended;
  const incoming = !accepted && !ended;
  const line = call.lines[progress.lineIndex];
  const subtitleIntervalMs = Math.min(
    35,
    (prologueLineSeconds * 1000 - 1000) / Math.max(1, Array.from(line?.text ?? "").length),
  );

  useEffect(() => {
    if (!accepted || ended) return undefined;
    const timer = setInterval(() => setLineTicks((ticks) => ticks + 1), prologueLineSeconds * 1000);
    return () => clearInterval(timer);
  }, [accepted, ended]);

  const handleAccept = () => {
    "background only";
    setAccepted(true);
  };
  const handleHangUp = () => {
    "background only";
    setHungUp(true);
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
        clockRunning={accepted && !ended}
        exitLabel={copy.common.exitTo.journey}
        onBack={onBack}
        testId="prologue-call-screen"
        testIdPrefix="prologue-call-screen"
        backTestId="prologue-call-screen-back"
        actions={
          <>
            <CallControls
              incoming={incoming}
              ended={ended}
              playLabel={incoming ? copy.phoneCall.play.start : null}
              playTestId="prologue-call-screen-accept"
              hangUpTestId="prologue-call-screen-end"
              onPlay={handleAccept}
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
            resetKey={progress.lineIndex}
            reducedMotion={reducedMotion}
          />
        ) : null}
      </CallScreen>
    </view>
  );
}
