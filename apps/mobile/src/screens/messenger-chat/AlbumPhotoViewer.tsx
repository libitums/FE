import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import cross from "@libitums/icons/lynx/cross";
import { Button } from "@libitums/ui-lynx/button";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { chatAlbumTestIds as ids, type ChatAlbumTile } from "./chat-album.contract";
import { remakePrice } from "./chat-album-rules";
import { SLOP_SMALL } from "./hit-slop";

import "./chat-album.css";

export type AlbumPhotoViewerProps = {
  readonly tile: ChatAlbumTile;
  readonly name: string;
  readonly dayLabel: string;
  readonly onClose: () => void;
  /** 다시 그리기(앞 그림이 있으니 25). 지난 대화 · 다시 그리는 중이면 단추가 없습니다. */
  readonly onRedraw: () => void;
};

// 사진 보기입니다(ADR-0150 M6 · M7) — 그림 · AI 표시 · 그때의 말 · 판 고르기 · Redraw(여기에서만). 시스템 뒤로는 화면이 닫습니다.
export function AlbumPhotoViewer({
  tile,
  name,
  dayLabel,
  onClose,
  onRedraw,
}: AlbumPhotoViewerProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.album;
  const { versions } = tile;
  const [index, setIndex] = useState(versions.length - 1);
  const shown = versions[index] ?? tile.item;
  const canRedraw = !tile.item.fromPastChat && !tile.remaking;
  const box =
    shown.aspect === "1:1" ? "chat-album-viewer-image-1x1" : "chat-album-viewer-image-3x2";
  return (
    <view
      className="chat-album-viewer"
      data-statusbar={lightStatusBarIcons}
      data-testid={ids.viewer}
      accessibility-role-description="dialog"
    >
      <view className="chat-album-viewer-head">
        <text className="chat-album-viewer-title" accessibility-traits="header">
          {copy.viewerTitle(name, dayLabel)}
        </text>
        <view
          className="chat-album-viewer-close"
          data-testid={ids.viewerClose}
          accessibility-element={true}
          accessibility-label={copy.close}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          bindtap={() => {
            "background only";
            onClose();
          }}
        >
          <svg
            className="chat-album-viewer-close-icon"
            content={cross}
            current-color={color.white}
          />
        </view>
      </view>
      <view className="chat-album-viewer-stage">
        {shown.url === null ? null : (
          <image
            className={box}
            src={shown.url}
            mode="aspectFit"
            accessibility-element={true}
            accessibility-label={copy.photoLabel(name, shown.line.ko)}
          />
        )}
      </view>
      <view className="chat-album-viewer-foot">
        {versions.length > 1 ? (
          <view className="chat-album-versions">
            {versions.map((version, at) => {
              const on = at === index;
              const label = copy.version(at + 1, versions.length);
              return (
                <view
                  key={version.id}
                  className={`chat-album-version${on ? " chat-album-version-on" : ""}`}
                  data-testid={ids.viewerVersion(at + 1)}
                  data-selected={on ? "true" : "false"}
                  hit-slop={SLOP_SMALL}
                  accessibility-element={true}
                  accessibility-traits="button"
                  accessibility-label={on ? chat.toggle.selected(label) : label}
                  accessibility-enable-tap={true}
                  bindtap={() => {
                    "background only";
                    setIndex(at);
                  }}
                >
                  <text className="chat-album-version-label" accessibility-elements-hidden={true}>
                    {at + 1}
                  </text>
                </view>
              );
            })}
          </view>
        ) : null}
        <text className="chat-album-viewer-ai">
          {shown.fromPastChat ? `${chat.media.aiLabel} · ${copy.pastChat}` : chat.media.aiLabel}
        </text>
        {shown.line.ko === "" ? null : (
          <text className="chat-album-viewer-ko">{shown.line.ko}</text>
        )}
        {shown.line.en === "" ? null : (
          <text className="chat-album-viewer-en">{shown.line.en}</text>
        )}
        {canRedraw ? (
          <view data-testid={ids.redraw}>
            <Button
              label={copy.redraw(remakePrice("photo", true))}
              variant="brand"
              size="xl"
              width="fill"
              bindtap={onRedraw}
            />
          </view>
        ) : null}
      </view>
    </view>
  );
}
