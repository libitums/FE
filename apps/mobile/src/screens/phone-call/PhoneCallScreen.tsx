import { useEffect, useState } from "@lynx-js/react";
import { playAudio, stopAudio } from "../../lib/audio";
import type { PhoneCallScreenProps } from "./phone-call.contract";
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

// 전화 화면은 세션만 소유하고 완료 기록은 상위 콜백으로 넘긴다.
export function PhoneCallScreen({
  unitId,
  conversation,
  completionStatus,
  onComplete,
  onExit,
}: PhoneCallScreenProps) {
  const [session, setSession] = useState(() => initialPhoneCallSessionState(completionStatus));
  const [completionLatched, setCompletionLatched] = useState(completionStatus === "completed");
  const entries = visiblePhoneCallEntries(conversation, session);
  const turn = currentPhoneCallTurn(conversation, session);
  const reply = currentPhoneCallReply(conversation, session);
  const playLabel = phoneCallPlayLabel(session);

  useEffect(() => () => stopAudio(), []);

  const handlePlay = () => {
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
    const next = phoneCallSessionReducer(session, { type: "reply" });
    if (next.mode === "completed" && session.mode !== "completed") {
      setCompletionLatched(true);
      onComplete(unitId);
    }
    setSession(next);
  };

  const handleReplay = () => {
    stopAudio();
    setSession(phoneCallSessionReducer(session, { type: "replay" }));
  };

  return (
    <view className="phone-call-screen" data-testid="phone-call-screen">
      <view className="phone-call-screen-header">
        <view
          className="phone-call-screen-exit"
          data-testid="phone-call-exit-button"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="맵으로"
          bindtap={() => {
            stopAudio();
            onExit(completionLatched ? "completed" : phoneCallExitOutcome(session));
          }}
        >
          <text>맵으로</text>
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
          <text
            className="phone-call-contact-name"
            data-testid="phone-call-contact-name"
            accessibility-element={true}
          >
            지민
          </text>
          <text className="phone-call-screen-status" data-testid="phone-call-status">
            {phoneCallStatusLabel(session)}
          </text>
          <view className="phone-call-transcript-list">
            {entries.map((entry) => (
              <view
                key={entry.speaker === "jimin" ? entry.turnId : entry.replyId}
                className={`phone-call-transcript phone-call-transcript-${entry.speaker}`}
                data-testid={
                  entry.speaker === "jimin"
                    ? `phone-call-transcript-jimin-${entry.turnId}`
                    : `phone-call-transcript-self-${entry.replyId}`
                }
                accessibility-element={true}
                accessibility-traits="text"
                accessibility-label={`${entry.speakerName}, ${entry.text}`}
              >
                <text className="phone-call-transcript-speaker" accessibility-element={false}>
                  {entry.speakerName}
                </text>
                <text className="phone-call-transcript-text" accessibility-element={false}>
                  {entry.text}
                </text>
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
            <text>{playLabel}</text>
          </view>
        ) : null}
        {reply ? (
          <view
            className="phone-call-reply-button"
            data-testid={`phone-call-reply-${reply.id}`}
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={reply.text}
            bindtap={handleReply}
          >
            <text>{reply.text}</text>
          </view>
        ) : null}
        {session.mode === "completed" ? (
          <view
            className="phone-call-replay-button"
            data-testid="phone-call-replay-button"
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label="처음부터 보기"
            bindtap={handleReplay}
          >
            <text>처음부터 보기</text>
          </view>
        ) : null}
      </view>
    </view>
  );
}
