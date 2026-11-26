import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";

import { ChatLog } from "../../components/chat/ChatLog";
import { ChatIncomingRow, ChatTextBubble } from "../../components/chat/ChatMessageRow";
import { ChatTypingRow } from "../../components/chat/ChatTypingRow";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useMissionCopy } from "../../lib/ui-copy-roleplay-mission-tables";
import type { RoleplayMissionCopy } from "../../lib/ui-copy-roleplay-mission";
import { useScreenBack } from "../../lib/use-back-handler";
import { canAskHint, canFinishMission, canSendMission } from "./mission-session";
import { missionTestIds as ids } from "./mission-test-ids";
import { recordClock } from "./mission-voice";
import type { MissionVoiceState } from "./mission-voice.contract";
import { MissionComposer } from "./MissionComposer";
import { MissionHintCard, MissionSuccessCard } from "./MissionTalkCards";
import { MissionTalkLine } from "./MissionTalkLine";
import { MissionTopBar } from "./MissionTopBar";
import type { MissionTalkScreenProps } from "./roleplay-mission.contract";
import { loadMissionAutoPlay, saveMissionAutoPlay } from "./mission-autoplay-storage";
import { useMissionVoice } from "./use-mission-voice";

import "./roleplay-mission-talk.css";

/** 입력 줄 위 안내 — 녹음 중(시간) · 받아 적는 중 · 받아 적기 실패. */
function voiceNote(voice: MissionVoiceState, copy: RoleplayMissionCopy): string | null {
  if (voice.rec === "recording") return `${copy.listening} ${recordClock(voice.seconds)}`;
  if (voice.rec === "transcribing") return copy.extra.voice.transcribing;
  switch (voice.notice) {
    case null:
      return null;
    case "unavailable":
      return copy.speechUnavailable;
    default:
      return copy.extra.voice[voice.notice];
  }
}

/**
 * 미션 대화입니다(PRD §4.2 · 파이프라인 문서 §10.2) — 위 띠(장면 · 목표 · 남은 턴 · 성공 표시), 가운데 메신저 부품의 말풍선 ·
 * 입력 중 · 교정 카드(고치기 / 더 나은 표현), 아래 새 입력 줄(글 · 마이크 · 힌트 · 끝내기). 필수를 이루면 「Mission success!」
 * 카드(계속하기 / 끝내기)가 한 번 서고, 마지막 턴이 오면 끝 줄과 채점 중 줄이 서고 흐름이 리포트로 넘깁니다. 마이크는 서버 받아 적기,
 * 상대역 말은 서버 합성을 자동 재생합니다. 그만두기는 확인 뒤 — 필수 전이면 리포트 없이 나가고, 필수를 이뤘으면 끝내기입니다.
 */
export function MissionTalkScreen({
  insets,
  card,
  state,
  onSend,
  onHint,
  onDismissHint,
  onQuit,
  onKeepGoing,
  onFinish,
  voice: ports,
}: MissionTalkScreenProps): ReactNode {
  const copy = useUiCopy();
  const mission = useMissionCopy();
  const [confirming, setConfirming] = useState(false);
  const [prefill, setPrefill] = useState({ text: "", key: 0 });
  // 받아 적은 글을 입력 칸에 넣었으면 학습자가 (고쳐서) 보낸 글도 음성 턴입니다.
  const [heardPending, setHeardPending] = useState(false);
  // 상대역 말 자동 재생(기기에 기억) — 꺼도 다시 듣기 · 힌트 예문 듣기는 됩니다.
  const [autoPlay, setAutoPlay] = useState(loadMissionAutoPlay);
  const enabled = canSendMission(state);
  const voice = useMissionVoice(ports, state.conversationId);

  const tapMic = () => {
    "background only";
    voice.tapMic((decision) => {
      if (decision.kind === "send") {
        setHeardPending(false);
        onSend(decision.text, "voice");
        return;
      }
      setHeardPending(true);
      setPrefill((value) => ({ text: decision.text, key: value.key + 1 }));
    });
  };
  const askQuit = () => {
    "background only";
    voice.cancelRecording();
    voice.stopPlayback();
    setConfirming(true);
  };
  useScreenBack(confirming ? () => setConfirming(false) : askQuit);

  // 판이 끝나거나 답을 기다리는 동안에는 녹음을 버립니다(마이크 잠금, 문서 §6.1).
  useEffect(() => {
    if (!enabled && voice.state.rec === "recording") voice.cancelRecording();
  }, [enabled]);
  // 상대역의 새 말(진입 대사 포함)을 한 번 자동 재생합니다 — 행동 지문은 서버가 읽지 않습니다.
  const lastThem = [...state.lines].reverse().find((line) => line.kind === "them");
  const lastMessageId = lastThem?.kind === "them" ? lastThem.messageId : null;
  useEffect(() => {
    if (lastMessageId !== null && autoPlay)
      voice.autoPlay(lastMessageId, { kind: "message", message_id: lastMessageId });
  }, [lastMessageId]);

  const avatar = { name: state.counterpartLabel || card.item.counterpartLabel, imageUrl: null };
  const streaming = state.turn?.bubbles ?? [];
  const status =
    state.phase === "grading"
      ? mission.grading
      : state.phase === "ended" && state.endReason !== null
        ? mission.ended[state.endReason]
        : null;
  const canFinish = canFinishMission(state);
  const successShown = state.successPrompt === "shown" && state.endReason === null;
  const check =
    voice.state.check === null || voice.state.rec !== "idle"
      ? null
      : {
          text:
            voice.state.check === "notKorean"
              ? mission.extra.voice.heardNotKorean
              : mission.extra.voice.heardCheck,
          again: mission.extra.voice.sayAgain,
        };
  const dialog = state.requiredDone
    ? { ...mission.extra.quitSuccess }
    : { title: mission.quitTitle, body: mission.quitBody, confirm: mission.quitConfirm };

  return (
    <view
      className="mission-talk-screen"
      data-testid={ids.talk}
      data-statusbar={lightStatusBarIcons}
      data-phase={state.phase}
    >
      <MissionTopBar
        insetTop={insets.top}
        title={card.item.title.en}
        imageUrl={card.imageUrl}
        goals={state.goals}
        turnsLeft={state.turnsLeft}
        success={state.requiredDone}
        autoPlay={autoPlay}
        onToggleAutoPlay={() => {
          const next = !autoPlay;
          setAutoPlay(next);
          saveMissionAutoPlay(next);
          if (!next) voice.stopPlayback();
        }}
        onQuit={askQuit}
      />
      <view className="mission-talk-body" accessibility-elements-hidden={confirming}>
        <ChatLog testId={ids.log} jumpKey={state.sentCount}>
          {state.lines.map((line) => (
            <MissionTalkLine
              key={line.id}
              line={line}
              avatar={avatar}
              playback={voice.state.playback}
              onReplay={(messageId) =>
                voice.play(messageId, { kind: "message", message_id: messageId })
              }
              onSend={onSend}
            />
          ))}
          {state.phase === "awaiting" && streaming.length === 0 ? (
            <ChatTypingRow
              avatar={avatar}
              label={mission.typing(avatar.name)}
              testId={ids.typing}
            />
          ) : null}
          {streaming.map((bubble, index) => (
            <ChatIncomingRow
              key={`streaming-${String(index)}`}
              avatar={avatar}
              testId={ids.line(`streaming-${String(index)}`)}
            >
              <ChatTextBubble
                direction="incoming"
                speaker={avatar.name}
                message={bubble.ko}
                translation={null}
              />
            </ChatIncomingRow>
          ))}
          {status === null ? null : (
            <text className="mission-talk-status" data-testid={ids.status}>
              {status}
            </text>
          )}
        </ChatLog>
        {state.hint === null ? null : (
          <MissionHintCard
            hint={state.hint}
            listening={voice.state.playback.key === "hint"}
            onListen={
              state.hint.hintNo === undefined
                ? null
                : () => {
                    const hintNo = state.hint?.hintNo;
                    if (hintNo !== undefined) voice.play("hint", { kind: "hint", hint_no: hintNo });
                  }
            }
            onUse={() => {
              if (state.hint !== null)
                setPrefill((value) => ({ text: state.hint?.ko ?? "", key: value.key + 1 }));
              setHeardPending(false);
              voice.clearCheck();
              onDismissHint();
            }}
            onClose={onDismissHint}
          />
        )}
        {successShown ? (
          <MissionSuccessCard canFinish={canFinish} onKeepGoing={onKeepGoing} onFinish={onFinish} />
        ) : null}
        <MissionComposer
          enabled={enabled}
          recording={voice.state.rec === "recording"}
          transcribing={voice.state.rec === "transcribing"}
          hintsLeft={state.hintsLeft}
          canHint={canAskHint(state)}
          note={voiceNote(voice.state, mission)}
          check={check}
          onFinish={canFinish && state.successPrompt === "dismissed" ? onFinish : null}
          prefill={prefill}
          bottomInset={insets.bottom}
          onSend={(text) => {
            onSend(text, heardPending ? "voice" : "text");
            setHeardPending(false);
            voice.clearCheck();
          }}
          onMic={tapMic}
          onHint={onHint}
        />
      </view>
      {confirming ? (
        <view data-testid={ids.quitDialog}>
          <Dialog
            title={dialog.title}
            description={dialog.body}
            actions={[
              { id: "quit", label: dialog.confirm },
              { id: "cancel", label: mission.quitCancel },
            ]}
            phase="visible"
            bindaction={(action) => {
              setConfirming(false);
              if (action === "quit") onQuit();
            }}
          />
        </view>
      ) : null}
    </view>
  );
}
