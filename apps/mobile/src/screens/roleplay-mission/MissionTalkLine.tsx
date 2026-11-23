import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import volume from "@libitums/icons/lynx/volume";

import {
  ChatIncomingRow,
  ChatOutgoingRow,
  ChatTextBubble,
} from "../../components/chat/ChatMessageRow";
import { useUiCopy } from "../../lib/ui-copy";
import { UnsentMessage } from "../messenger-chat/ChatDelivery";
import { CorrectionCard } from "../messenger-chat/CorrectionCard";
import { missionTestIds as ids } from "./mission-test-ids";
import type { MissionPlayback } from "./mission-voice.contract";
import type { MissionInputMode, MissionLine } from "./roleplay-mission.contract";

import "./roleplay-mission-voice.css";

export type MissionTalkLineProps = {
  readonly line: MissionLine;
  readonly avatar: { readonly name: string; readonly imageUrl: string | null };
  readonly playback: MissionPlayback;
  /** 상대역 메시지 다시 듣기(메시지 id). */
  readonly onReplay: (messageId: string) => void;
  readonly onSend: (text: string, inputMode: MissionInputMode) => void;
};

/** 행동 · 서술 지문 말풍선(「*…*」) — 읽지 않으므로 다시 듣기가 없습니다. */
const isAction = (ko: string): boolean => ko.startsWith("*") && ko.endsWith("*");

/**
 * 대화 줄 하나 — 상대역 말풍선(+ 다시 듣기) 또는 내 글(+ 교정 카드). 교정은 둘로 갈립니다(ADR-0177): 고치기(`correction` ·
 * `l1_to_ko`)는 메신저 연필 카드 그대로, 더 나은 표현(`better`)은 같은 카드를 다른 바탕 · 점선 테두리로 감쌉니다.
 */
export function MissionTalkLine({
  line,
  avatar,
  playback,
  onReplay,
  onSend,
}: MissionTalkLineProps): ReactNode {
  const copy = useUiCopy();
  if (line.kind === "them") {
    const messageId = line.messageId;
    const playable = messageId !== null && !isAction(line.ko);
    const state = playable && playback.key === messageId ? playback.status : "idle";
    return (
      <ChatIncomingRow avatar={avatar} testId={ids.line(line.id)}>
        <view className="mission-talk-theirs">
          <ChatTextBubble
            direction="incoming"
            speaker={avatar.name}
            message={line.ko}
            translation={line.translation}
          />
          {playable ? (
            <view
              className={`mission-talk-replay${state === "playing" ? " mission-talk-replay-playing" : ""}`}
              data-testid={ids.replay(line.id)}
              data-play={state}
              accessibility-element={true}
              accessibility-traits="button"
              accessibility-label={copy.roleplayMission.extra.voice.replay}
              bindtap={() => onReplay(messageId)}
            >
              <svg
                className="mission-talk-replay-icon"
                content={volume}
                current-color={state === "playing" ? color.white : color.fg["neutral-muted"]}
              />
            </view>
          ) : null}
        </view>
      </ChatIncomingRow>
    );
  }
  const card =
    line.correction === null ? null : (
      <CorrectionCard correction={line.correction} onResend={null} />
    );
  return (
    <ChatOutgoingRow testId={ids.line(line.id)}>
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
        {line.correction?.kind === "better" ? (
          <view className="mission-better" data-testid={ids.betterCard}>
            {card}
          </view>
        ) : (
          card
        )}
      </view>
    </ChatOutgoingRow>
  );
}
