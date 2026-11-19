import type { ReactNode } from "@lynx-js/react";
import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import type { FriendProfile } from "./friend-catalog.contract";
import { friendProfileTestIds as ids } from "./friend-profile.contract";
import { profileFactsOf } from "./friend-profile";
import { useVoiceSample } from "./use-voice-sample";

import "./friend-profile.css";

/** 사실 줄(나이 · 직업 · MBTI, ADR-0162 2026-11-19 추가) — 있는 조각만, 하나도 없으면 그리지 않습니다. */
export function FriendFactsLine({ character }: { readonly character: FriendProfile }): ReactNode {
  const copy = useUiCopy().messengerChat.suggested;
  const facts = profileFactsOf(character.profile, copy.profile, copy.language);
  if (facts === null) return null;
  return (
    <text
      className="friend-profile-facts"
      data-testid={ids.facts}
      flatten={false}
      accessibility-element={true}
    >
      {facts}
    </text>
  );
}

type VoiceButtonProps = {
  readonly name: string;
  readonly url: string;
  readonly onPlayed?: () => void;
};

// 견본 단추 하나 — 듣기 / 멈춤 / 이어 듣기. 저절로 틀지 않고, 못 읽으면 조용한 한 줄을 덧붙입니다(다시 누르면 한 번 더).
// 움직임이 없어 줄인 움직임(ADR-0016) 분기가 필요 없습니다.
function VoiceSampleButton({ name, url, onPlayed }: VoiceButtonProps): ReactNode {
  const copy = useUiCopy().messengerChat.suggested.profile.voice;
  const sample = useVoiceSample(url, onPlayed);
  const playing = sample.state === "playing";
  const label =
    sample.state === "playing"
      ? copy.pause
      : sample.state === "paused"
        ? copy.resume
        : sample.state === "loading"
          ? copy.loading
          : copy.hear;
  return (
    <view className="friend-profile-voice">
      <view
        data-testid={ids.voice}
        data-playback={sample.state}
        flatten={false}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        accessibility-label={playing ? copy.pause : copy.label(name)}
        bindtap={sample.toggle}
      >
        <Button
          label={label}
          variant="outline"
          size="m"
          icon={playing ? pause : play}
          iconPosition="leading"
          loading={sample.state === "loading"}
        />
      </view>
      {sample.state === "error" ? (
        <text
          className="friend-profile-voice-note"
          data-testid={ids.voiceNote}
          flatten={false}
          accessibility-element={true}
        >
          {copy.unavailable}
        </text>
      ) : null}
    </view>
  );
}

/** 시트 본문 아래쪽 — 목소리 견본(주소가 있을 때만) · AI 표시(방 고지와 같은 말, ADR-0125). */
export function FriendProfileExtras({
  character,
  voiceUrl,
  onVoicePlayed,
}: {
  readonly character: FriendProfile;
  readonly voiceUrl: string | null;
  readonly onVoicePlayed?: () => void;
}): ReactNode {
  const chat = useUiCopy().messengerChat;
  return (
    <view className="friend-profile-extras">
      {voiceUrl === null ? null : (
        <VoiceSampleButton
          name={character.name}
          url={voiceUrl}
          {...(onVoicePlayed === undefined ? {} : { onPlayed: onVoicePlayed })}
        />
      )}
      <text
        className="friend-profile-ai"
        data-testid={ids.ai}
        flatten={false}
        accessibility-element={true}
      >
        {chat.safety.notice.aiDisclosure(character.name)}
      </text>
    </view>
  );
}
