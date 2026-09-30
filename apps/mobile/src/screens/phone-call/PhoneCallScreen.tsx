import { CallLineBubble } from "../../components/CallCaller";
import minseoProfile from "../../assets/characters/minseo-profile.jpg";
import { useEffect, useState } from "@lynx-js/react";
import { playAudio, stopAudio } from "../../lib/audio";
import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import { useUiCopy } from "../../lib/ui-copy";
import type {
  PhoneCallScreenProps,
  PhoneCallSessionState,
  PhoneCallTranscriptEntry,
} from "./phone-call.contract";
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
import { CallControls } from "../../components/CallControls";
import { CallScreen } from "../../components/CallScreen";

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
  reducedMotion = false,
}: PhoneCallScreenProps) {
  const copy = useUiCopy();
  const exitLabel = specialUnitExitLabel(exitTo, copy);
  const [session, setSession] = useState(() => initialPhoneCallSessionState(completionStatus));
  const [subtitleReplayKey, setSubtitleReplayKey] = useState(0);
  const [completionLatched, setCompletionLatched] = useState(completionStatus === "completed");
  const entries = visiblePhoneCallEntries(conversation, session);
  const turn = currentPhoneCallTurn(conversation, session);
  const reply = currentPhoneCallReply(conversation, session);
  const playLabel = phoneCallPlayLabel(session, copy);
  const incoming = session.mode === "ready" && session.turnIndex === 0;
  const displayedEntries = incoming
    ? []
    : session.mode === "completed"
      ? entries
      : entries.filter((entry) => entry.speaker !== "self" && entry.turnId === turn?.id);

  useEffect(() => () => stopAudio(), []);

  const playSession = (target: PhoneCallSessionState) => {
    "background only";
    const targetTurn = currentPhoneCallTurn(conversation, target);
    if (!targetTurn || target.mode === "completed") return;
    stopAudio();
    setSubtitleReplayKey((key) => key + 1);
    const next = phoneCallSessionReducer(target, { type: "play" });
    setSession(next);
    const outcome = playAudio(targetTurn.audioSource, () => {
      setSession((current) => phoneCallSessionReducer(current, { type: "audio-settled" }));
    });
    if (outcome === "unavailable")
      setSession((current) => phoneCallSessionReducer(current, { type: "audio-unavailable" }));
  };

  const handlePlay = () => {
    "background only";
    playSession(session);
  };

  const handleReply = () => {
    "background only";
    const next = phoneCallSessionReducer(session, { type: "reply" });
    if (next === session) return;
    if (next.mode === "completed" && session.mode !== "completed") {
      setCompletionLatched(true);
      onComplete(unitId);
    }
    if (next.mode === "completed") setSession(next);
    else playSession(next);
  };

  const handleExit = () => {
    "background only";
    stopAudio();
    onExit(completionLatched ? "completed" : phoneCallExitOutcome(session));
  };

  return (
    <CallScreen
      title={conversation.title}
      status={phoneCallStatusLabel(session, copy)}
      phase={incoming ? "incoming" : session.mode === "completed" ? "completed" : "active"}
      callerName={conversation.turns[0].speakerName}
      callerPortrait={minseoProfile}
      clockRunning={!incoming && session.mode !== "completed"}
      exitLabel={exitLabel}
      onBack={handleExit}
      testId="phone-call-screen"
      testIdPrefix="phone-call"
      backTestId="phone-call-exit-button"
      actions={
        <>
          {session.mode === "completed" && conversation.completion ? (
            <text className="phone-call-story-context" data-testid="phone-call-story-completion">
              {conversation.completion}
            </text>
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
          <CallControls
            ended={session.mode === "completed"}
            incoming={incoming}
            playLabel={playLabel}
            onPlay={handlePlay}
            onHangUp={handleExit}
          />
        </>
      }
    >
      <view className="phone-call-transcript-list">
        {displayedEntries.map((entry) => (
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
              {session.mode === "completed" ? (
                <text className="phone-call-transcript-speaker">
                  {entrySpeakerName(entry, copy.common.me)}
                </text>
              ) : null}
              <CallLineBubble
                text={entry.text}
                reveal={
                  entry.speaker !== "self" &&
                  entry.turnId === turn?.id &&
                  session.mode === "playing"
                    ? "typewriter"
                    : "instant"
                }
                resetKey={subtitleReplayKey}
                reducedMotion={reducedMotion}
                translation={[entry.romanization, entry.translation].filter(Boolean).join("\n")}
                testIdPrefix={`phone-call-line-${entry.speaker}-${entry.speaker === "self" ? entry.replyId : entry.turnId}`}
              />
            </view>
          </view>
        ))}
      </view>
    </CallScreen>
  );
}
