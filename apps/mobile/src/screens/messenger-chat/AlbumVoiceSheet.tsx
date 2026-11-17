import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { playAudio, stopAudio } from "../../lib/audio";
import { SLOW_PLAYBACK_RATE } from "../../lib/listen-pace";
import { useUiCopy } from "../../lib/ui-copy";
import { chatAlbumTestIds as ids, type ChatAlbumTile } from "./chat-album.contract";
import { remakePrice } from "./chat-album-rules";

import "./chat-album.css";

export type AlbumVoiceSheetProps = {
  readonly tile: ChatAlbumTile;
  readonly name: string;
  readonly onClose: () => void;
  /** 다시 녹음(15). 지난 대화 · 다시 녹음 중이면 단추가 없습니다. */
  readonly onRecordAgain: () => void;
};

// 음성 재생 시트입니다(ADR-0150 M6). 서명 URL이 있으면 호스트 재생(0.85배, 방 음성과 같게), 없으면(가짜) 재생 표시만 바뀝니다.
// 시트가 닫히면 멈춥니다.
export function AlbumVoiceSheet({
  tile,
  name,
  onClose,
  onRecordAgain,
}: AlbumVoiceSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat.album;
  const { item } = tile;
  const [playing, setPlaying] = useState(false);
  const canRecord = !item.fromPastChat && !tile.remaking;
  useEffect(() => {
    if (!playing || item.url === null) return;
    return () => stopAudio();
  }, [playing, item.url]);
  const toggle = () => {
    "background only";
    if (playing) {
      if (item.url !== null) stopAudio();
      return setPlaying(false);
    }
    if (item.url === null) return setPlaying(true);
    setPlaying(playAudio(item.url, () => setPlaying(false), SLOW_PLAYBACK_RATE) === "started");
  };
  return (
    <view data-testid={ids.voiceSheet}>
      <AppBottomSheet
        title={copy.voiceLabel(name, "")}
        closeAccessibilityLabel={copy.close}
        actions={
          canRecord
            ? [
                {
                  id: "record-again",
                  label: copy.recordAgain(remakePrice("voice", true)),
                  bindtap: onRecordAgain,
                },
              ]
            : []
        }
        ondismiss={onClose}
      >
        <view className="chat-album-voice">
          <view
            className="chat-album-voice-play"
            data-testid={ids.voicePlay}
            data-playback={playing ? "playing" : "idle"}
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={playing ? copy.pause : copy.play}
            accessibility-enable-tap={true}
            bindtap={toggle}
          >
            <svg
              className="chat-album-voice-play-icon"
              content={playing ? pause : play}
              current-color={color.white}
            />
          </view>
          <text className="chat-album-voice-ko">{item.line.ko}</text>
          {item.line.en === "" ? null : <text className="chat-album-voice-en">{item.line.en}</text>}
          {item.fromPastChat ? <text className="chat-album-voice-en">{copy.pastChat}</text> : null}
        </view>
      </AppBottomSheet>
    </view>
  );
}
