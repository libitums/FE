import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import volume from "@libitums/icons/lynx/volume";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import { useUiCopy } from "../../lib/ui-copy";
import { chatAlbumTestIds as ids, type ChatAlbumTile } from "./chat-album.contract";

import "./messenger-chat.css";
import "./chat-album.css";

export type AlbumTileProps = {
  readonly tile: ChatAlbumTile;
  readonly name: string;
  readonly onOpen: () => void;
};

// 앨범 격자 한 칸입니다(ADR-0150 M2 · M3). 사진은 그림, 음성은 아이콘 · 그때의 말. 아래쪽 띠는 다시 그리는 중 > 지난 대화 > 판 수
// 하나만. 다시 그리는 칸은 방 스켈레톤의 반짝임을 씁니다(움직임 줄이기면 멈춤). 낭독은 「이름의 사진, 말」 한 문장 + 띠.
export function AlbumTile({ tile, name, onOpen }: AlbumTileProps): ReactNode {
  const copy = useUiCopy().messengerChat.album;
  const still = resolveReducedMotion(undefined, useMotion());
  const { item, versions, remaking } = tile;
  const photo = item.kind === "photo";
  const badge = remaking
    ? photo
      ? copy.drawing
      : copy.recording
    : item.fromPastChat
      ? copy.pastChat
      : versions.length > 1
        ? copy.versions(versions.length)
        : null;
  const label = photo ? copy.photoLabel(name, item.line.ko) : copy.voiceLabel(name, item.line.ko);
  return (
    <view
      className={`chat-album-tile${photo ? "" : " chat-album-tile-voice"}${still ? " messenger-chat-skeleton-still" : ""}`}
      data-testid={ids.tile(item.id)}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={badge === null ? label : `${label}, ${badge}`}
      accessibility-enable-tap={true}
      bindtap={() => {
        "background only";
        onOpen();
      }}
    >
      {photo ? (
        item.url === null ? null : (
          <image className="chat-album-tile-image" src={item.url} mode="aspectFill" />
        )
      ) : (
        <>
          <svg
            className="chat-album-tile-voice-icon"
            content={volume}
            current-color={color.fg.brand}
          />
          <text className="chat-album-tile-line" text-maxline="3">
            {item.line.ko}
          </text>
        </>
      )}
      {remaking ? <view className="messenger-chat-shimmer" /> : null}
      {badge === null ? null : (
        <view className="chat-album-badge" accessibility-elements-hidden={true}>
          <text className="chat-album-badge-label">{badge}</text>
        </view>
      )}
    </view>
  );
}
