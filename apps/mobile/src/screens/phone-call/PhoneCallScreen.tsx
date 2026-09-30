import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { Button } from "@libitums/ui-lynx/button";
import { CallCaller, CallLineBubble } from "../../components/CallCaller";
import { artworkFor } from "../visual-novel/visual-novel-artwork";
import { useEffect, useState } from "@lynx-js/react";
import { playAudio, stopAudio } from "../../lib/audio";
import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import { useUiCopy } from "../../lib/ui-copy";
import type { PhoneCallScreenProps, PhoneCallTranscriptEntry } from "./phone-call.contract";
import {
  currentPhoneCallReply,
  currentPhoneCallTurn,
  initialPhoneCallSessionState,
  phoneCallExitOutcome,
  phoneCallPlayLabel,
  phoneCallSessionReducer,
  phoneCallStatusLabel,
  visiblePhoneCallEntries,
} from "./phone-call";
import "./phone-call-screen.css";

// 나(self) 항목은 이름 필드가 없습니다(계약) — 화면이 문구표의 `common.me`를 씁니다.
const entrySpeakerName = (entry: PhoneCallTranscriptEntry, me: string): string =>
  entry.speaker === "self" ? me : entry.speakerName;

// 전화 화면은 세션만 소유하고 완료 기록은 상위 콜백으로 넘깁니다.
// `exitLabel`은 어느 탭에서 열렸는지를 화면이 알아서가 아니라 데이터로 받습니다
// (ADR-0007 D3). 기본값은 여정 라벨이라 기존 호출은 수정 없이 성립합니다.
export function PhoneCallScreen({
  unitId,
  conversation,
  completionStatus,
  exitTo = "journey",
  onComplete,
  onExit,
}: PhoneCallScreenProps) {
  const copy = useUiCopy();
  const exitLabel = specialUnitExitLabel(exitTo, copy);
  const [session, setSession] = useState(() => initialPhoneCallSessionState(completionStatus));
  const [replayKey, setReplayKey] = useState(0);
  const [completionLatched, setCompletionLatched] = useState(completionStatus === "completed");
  const entries = visiblePhoneCallEntries(conversation, session);
  const turn = currentPhoneCallTurn(conversation, session);
  const reply = currentPhoneCallReply(conversation, session);
  const playLabel = phoneCallPlayLabel(session, copy);

  useEffect(() => () => stopAudio(), []);

  const handlePlay = () => {
    "background only";
    if (!turn || session.mode === "completed") return;
    stopAudio();
    const next = phoneCallSessionReducer(session, { type: "play" });
    setSession(next);
    const outcome = playAudio(turn.audioSource, () => {
      setSession((current) => phoneCallSessionReducer(current, { type: "audio-settled" }));
    });
    if (outcome === "unavailable")
      setSession((current) => phoneCallSessionReducer(current, { type: "audio-unavailable" }));
  };

  const handleReply = () => {
    "background only";
    const next = phoneCallSessionReducer(session, { type: "reply" });
    if (next.mode === "completed" && session.mode !== "completed") {
      setCompletionLatched(true);
      onComplete(unitId);
    }
    setSession(next);
  };

  const handleReplay = () => {
    "background only";
    stopAudio();
    setReplayKey((key) => key + 1);
    setSession(phoneCallSessionReducer(session, { type: "replay" }));
  };

  const handleExit = () => {
    "background only";
    stopAudio();
    onExit(completionLatched ? "completed" : phoneCallExitOutcome(session));
  };

  return (
    <view className="phone-call-screen" data-testid="phone-call-screen">
      <view className="phone-call-screen-header">
        <view
          className="phone-call-screen-exit"
          data-testid="phone-call-exit-button"
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
        <text
          className="phone-call-screen-title"
          data-testid="phone-call-title"
          accessibility-traits="header"
        >
          {conversation.title}
        </text>
      </view>
      <scroll-view
        className="phone-call-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="phone-call-screen-content">
          <view data-testid="phone-call-contact-name">
            <CallCaller
              key={replayKey}
              callerName={conversation.turns[0].speakerName}
              callerPortrait={artworkFor(`${conversation.turns[0].speakerId}-neutral`).source}
              clockRunning={
                session.mode === "playing" ||
                session.mode === "reply-ready" ||
                (session.mode === "ready" && session.turnIndex > 0)
              }
              testIdPrefix="phone-call"
            />
          </view>
          <text className="phone-call-screen-status" data-testid="phone-call-status">
            {phoneCallStatusLabel(session, copy)}
          </text>
          <view className="phone-call-transcript-list">
            {entries.map((entry) => (
              <view
                key={entry.speaker === "self" ? entry.replyId : entry.turnId}
                className={`phone-call-transcript phone-call-transcript-${entry.speaker}`}
                data-testid={
                  entry.speaker === "self"
                    ? `phone-call-transcript-self-${entry.replyId}`
                    : `phone-call-transcript-${entry.speaker}-${entry.turnId}`
                }
                accessibility-element={true}
                accessibility-traits="text"
                accessibility-label={[
                  entrySpeakerName(entry, copy.common.me),
                  entry.text,
                  entry.romanization,
                  entry.translation,
                ]
                  .filter(Boolean)
                  .join(", ")}
              >
                <view accessibility-elements-hidden={true}>
                  <text className="phone-call-transcript-speaker">
                    {entrySpeakerName(entry, copy.common.me)}
                  </text>
                  <CallLineBubble
                    text={entry.text}
                    translation={[entry.romanization, entry.translation].filter(Boolean).join("\n")}
                    testIdPrefix={`phone-call-line-${entry.speaker}-${entry.speaker === "self" ? entry.replyId : entry.turnId}`}
                  />
                </view>
              </view>
            ))}
          </view>
        </view>
      </scroll-view>
      <view className="phone-call-screen-actions">
        {playLabel ? (
          <view
            className="phone-call-audio-button"
            data-testid="phone-call-audio-button"
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={playLabel}
            bindtap={handlePlay}
          >
            <view accessibility-elements-hidden={true}>
              <Button label={playLabel} variant="brand" size="xl" width="fill" />
            </view>
          </view>
        ) : null}
        {reply ? (
          <view
            className="phone-call-reply-button"
            data-testid={`phone-call-reply-${reply.id}`}
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={[reply.text, reply.romanization, reply.translation]
              .filter(Boolean)
              .join(", ")}
            bindtap={handleReply}
          >
            <text accessibility-element={false}>{reply.text}</text>
            {reply.romanization ? (
              <text className="phone-call-reply-support" accessibility-element={false}>
                {reply.romanization}
              </text>
            ) : null}
            {reply.translation ? (
              <text className="phone-call-reply-support" accessibility-element={false}>
                {reply.translation}
              </text>
            ) : null}
          </view>
        ) : null}
        {session.mode === "completed" ? (
          <view
            className="phone-call-replay-button"
            data-testid="phone-call-replay-button"
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={copy.common.startOver}
            bindtap={handleReplay}
          >
            <view accessibility-elements-hidden={true}>
              <Button label={copy.common.startOver} variant="outline" size="xl" width="fill" />
            </view>
          </view>
        ) : null}
      </view>
    </view>
  );
}
