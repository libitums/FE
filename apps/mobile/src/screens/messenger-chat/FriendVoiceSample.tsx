import type { ReactNode } from "@lynx-js/react";

import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import { useVoiceSample } from "./use-voice-sample";
import { voiceButtonKind } from "./voice-sample";

type FriendVoiceSampleProps = {
  readonly name: string;
  readonly url: string;
  readonly onPlayed?: (() => void) | undefined;
};

/**
 * 프로필 시트의 목소리 견본 단추 하나(ADR-0164 앱 추가 2026-11-20) — Hear voice ↔ Pause/Resume, 못 읽으면 아래 조용한 한 줄.
 * 시트 본문(스크롤) 첫 줄에 서서 주 단추 줄(고정)을 밀지 않습니다. 판정은 `voice-sample.ts`.
 */
export function FriendVoiceSample({ name, url, onPlayed }: FriendVoiceSampleProps): ReactNode {
  const copy = useUiCopy().messengerChat.suggested.profile.voice;
  const sample = useVoiceSample(url, onPlayed);
  const kind = voiceButtonKind(sample.state);
  return (
    <view className="suggested-sheet-voice">
      <view
        data-testid={ids.sheetVoice}
        data-playback={sample.state}
        flatten={false}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        accessibility-label={kind === "hear" ? copy.label(name) : copy[kind]}
        bindtap={sample.toggle}
      >
        <view accessibility-elements-hidden={true}>
          <Button
            label={copy[kind]}
            variant="outline"
            size="s"
            width="hug"
            loading={sample.state === "loading"}
            icon={kind === "pause" ? pause : play}
            iconPosition="leading"
          />
        </view>
      </view>
      {sample.state === "error" ? (
        <text
          className="suggested-sheet-voice-note"
          data-testid={ids.sheetVoiceNote}
          flatten={false}
          accessibility-element={true}
        >
          {copy.unavailable}
        </text>
      ) : null}
    </view>
  );
}
