import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";
import { Dialog } from "@libitums/ui-lynx/dialog";

import { ChatLog } from "../../components/chat/ChatLog";
import {
  ChatIncomingRow,
  ChatOutgoingRow,
  ChatTextBubble,
} from "../../components/chat/ChatMessageRow";
import { ChatTypingRow } from "../../components/chat/ChatTypingRow";
import { useSpeechAttempt } from "../../components/use-speech-attempt";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { UnsentMessage } from "../messenger-chat/ChatDelivery";
import { CorrectionCard } from "../messenger-chat/CorrectionCard";
import { canAskHint, canSendMission } from "./mission-session";
import { missionTestIds as ids } from "./mission-test-ids";
import { MissionComposer } from "./MissionComposer";
import { MissionTopBar } from "./MissionTopBar";
import type { MissionLine, MissionTalkScreenProps } from "./roleplay-mission.contract";

import "./roleplay-mission-talk.css";

type Speech = "idle" | "listening" | "unavailable";

/**
 * 미션 대화입니다(PRD §4.2) — 위 띠(장면 · 목표 · 남은 턴), 가운데 메신저 부품의 말풍선 · 입력 중 · 교정 카드,
 * 아래 새 입력 줄(글 · 마이크 · 힌트). 마지막 턴이 오면 끝 줄과 채점 중 줄이 서고, 흐름이 리포트로 넘깁니다.
 * 그만두기는 확인 뒤 리포트 없이 나갑니다(PRD §3.6).
 */
export function MissionTalkScreen({
  insets,
  card,
  state,
  onSend,
  onHint,
  onDismissHint,
  onQuit,
}: MissionTalkScreenProps): ReactNode {
  const copy = useUiCopy();
  const mission = copy.roleplayMission;
  const [confirming, setConfirming] = useState(false);
  const [speech, setSpeech] = useState<Speech>("idle");
  const [prefill, setPrefill] = useState({ text: "", key: 0 });
  const enabled = canSendMission(state);

  const attempt = useSpeechAttempt((outcome) => {
    if (outcome.kind === "heard" && outcome.text.trim() !== "") {
      setSpeech("idle");
      onSend(outcome.text, "voice");
      return;
    }
    setSpeech("unavailable");
  });
  const tapMic = () => {
    "background only";
    if (speech === "listening") {
      attempt.stop();
      return;
    }
    setSpeech("listening");
    attempt.start();
  };
  const askQuit = () => {
    "background only";
    attempt.stop();
    setConfirming(true);
  };
  useScreenBack(confirming ? () => setConfirming(false) : askQuit);

  const avatar = { name: state.counterpartLabel || card.item.counterpartLabel, imageUrl: null };
  const note =
    speech === "listening"
      ? mission.listening
      : speech === "unavailable"
        ? mission.speechUnavailable
        : null;
  const streaming = state.turn?.bubbles ?? [];

  const renderLine = (line: MissionLine) => {
    if (line.kind === "them") {
      return (
        <ChatIncomingRow key={line.id} avatar={avatar} testId={ids.line(line.id)}>
          <ChatTextBubble
            direction="incoming"
            speaker={avatar.name}
            message={line.ko}
            translation={line.translation}
          />
        </ChatIncomingRow>
      );
    }
    return (
      <ChatOutgoingRow key={line.id} testId={ids.line(line.id)}>
        <view className="mission-talk-mine">
          {line.failed ? (
            <UnsentMessage
              ko={line.ko}
              speaker={copy.roleplayStory.me}
              onOpen={() => onSend(line.ko, line.inputMode)}
            />
          ) : (
            <ChatTextBubble
              direction="outgoing"
              speaker={copy.roleplayStory.me}
              message={line.ko}
              translation={null}
            />
          )}
          {line.correction === null ? null : (
            <CorrectionCard correction={line.correction} onResend={null} />
          )}
        </view>
      </ChatOutgoingRow>
    );
  };

  const status =
    state.phase === "grading"
      ? mission.grading
      : state.phase === "ended" && state.endReason !== null
        ? mission.ended[state.endReason]
        : null;

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
        onQuit={askQuit}
      />
      <view className="mission-talk-body" accessibility-elements-hidden={confirming}>
        <ChatLog testId={ids.log} jumpKey={state.sentCount}>
          {state.lines.map(renderLine)}
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
          <view className="mission-hint" data-testid={ids.hintCard}>
            <view
              accessibility-element={true}
              accessibility-label={`${mission.hintTitle}: ${state.hint.ko}, ${state.hint.roman}, ${state.hint.meaning}`}
            >
              <text className="mission-hint-title">{mission.hintTitle}</text>
              <text className="mission-hint-ko">{state.hint.ko}</text>
              <text className="mission-hint-sub">{state.hint.roman}</text>
              <text className="mission-hint-sub">{state.hint.meaning}</text>
              <text className="mission-hint-sub">{mission.hintPenalty}</text>
            </view>
            <view className="mission-hint-actions">
              <view className="mission-hint-action" data-testid={ids.hintUse}>
                <Button
                  label={mission.hintUse}
                  variant="brand"
                  size="m"
                  width="fill"
                  bindtap={() => {
                    if (state.hint !== null)
                      setPrefill((value) => ({ text: state.hint?.ko ?? "", key: value.key + 1 }));
                    onDismissHint();
                  }}
                />
              </view>
              <view className="mission-hint-action" data-testid={ids.hintClose}>
                <Button
                  label={mission.hintClose}
                  variant="subtle"
                  size="m"
                  width="fill"
                  bindtap={onDismissHint}
                />
              </view>
            </view>
          </view>
        )}
        <MissionComposer
          enabled={enabled}
          listening={speech === "listening"}
          hintsLeft={state.hintsLeft}
          canHint={canAskHint(state)}
          note={note}
          prefill={prefill}
          bottomInset={insets.bottom}
          onSend={(text) => onSend(text, "text")}
          onMic={tapMic}
          onHint={onHint}
        />
      </view>
      {confirming ? (
        <view data-testid={ids.quitDialog}>
          <Dialog
            title={mission.quitTitle}
            description={mission.quitBody}
            actions={[
              { id: "quit", label: mission.quitConfirm },
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
