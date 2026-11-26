import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import { Button } from "@libitums/ui-lynx/button";

import { pauseAudio, playAudio, resumeAudio, stopAudio } from "../../lib/audio";
import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import {
  initialVoiceSample,
  voiceSampleFinished,
  voiceSampleNeedsStop,
  voiceSampleStarted,
  voiceSampleTap,
} from "./profile-voice-sample";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";

export type ProfileVoiceButtonProps = {
  readonly characterId: string;
  readonly name: string;
  /** 재생 주소 — 못 얻었으면 null(누르면 못 읽음 줄). */
  readonly url: string | null;
};

/**
 * 프로필 시트 목소리 견본 단추(ADR-0198 D2) — Hear voice ↔ Pause · Resume. 저절로 틀지 않고, 시트가 닫히면(언마운트) 멈춥니다. 재생은
 * 대화방 음성과 같은 호스트 오디오 모듈(ADR-0017)이고 1.0배입니다. 못 틀면 단추 아래 조용한 한 줄. 이벤트는 이 시트에서 처음 틀 때 한 번.
 */
export function ProfileVoiceButton({ characterId, name, url }: ProfileVoiceButtonProps): ReactNode {
  const copy = useUiCopy().messengerChat.suggested.voice;
  const { emit } = useChatEvents();
  const [state, setState] = useState(initialVoiceSample);
  // 누름 · 끝 · 닫힘은 마지막 상태로 판정합니다 — 효과의 정리와 늦게 오는 끝 신호는 처음 렌더의 값을 쥡니다.
  const latest = useRef(initialVoiceSample);
  const reported = useRef(false);
  const commit = (next: typeof initialVoiceSample): void => {
    "background only";
    // oxlint-disable-next-line react/immutability
    latest.current = next;
    setState(next);
  };

  useEffect(
    () => () => {
      if (voiceSampleNeedsStop(latest.current)) stopAudio();
    },
    [],
  );

  const handleTap = () => {
    "background only";
    const { next, action } = voiceSampleTap(latest.current, Date.now());
    if (action === "ignore") return;
    if (action === "pause") pauseAudio();
    if (action === "resume") resumeAudio();
    if (action !== "play") return commit(next);
    const outcome =
      url === null
        ? "unavailable"
        : playAudio(url, () => commit(voiceSampleFinished(latest.current)));
    commit(voiceSampleStarted(next, outcome));
    if (outcome === "started" && !reported.current) {
      // oxlint-disable-next-line react/immutability
      reported.current = true;
      emit({ name: "friend_voice_sample_played", surface: "chat", characterId });
    }
  };

  const text =
    state.phase === "idle" ? copy.hear : state.phase === "playing" ? copy.pause : copy.resume;
  return (
    <view className="suggested-sheet-voice">
      <view
        data-testid={ids.sheetVoice}
        flatten={false}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        accessibility-label={copy.label(name, state.phase)}
        bindtap={handleTap}
      >
        <Button
          label={text}
          variant="outline"
          size="m"
          icon={state.phase === "playing" ? pause : play}
          iconPosition="leading"
        />
      </view>
      {state.unavailable ? (
        <text className="suggested-sheet-voice-note" data-testid={ids.sheetVoiceUnavailable}>
          {copy.unavailable}
        </text>
      ) : null}
    </view>
  );
}
