import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { AlbumPhotoViewer } from "./AlbumPhotoViewer";
import { AlbumTile } from "./AlbumTile";
import { AlbumVoiceSheet } from "./AlbumVoiceSheet";
import {
  chatAlbumTestIds as ids,
  type ChatAlbumTab,
  type ChatAlbumTile,
} from "./chat-album.contract";
import { albumDayOf, albumSections, remakePrice } from "./chat-album-rules";
import type { ChatMediaNotice } from "./chat-media.contract";
import type { ChatSource } from "./chat-source.contract";
import type { CoinWallet } from "./coin-wallet";
import { CoinShopLayer } from "./CoinShopLayer";
import { RemakeDialog } from "./RemakeDialog";
import { useChatAlbum } from "./use-chat-album";
import { useCoinBalance } from "./use-coin-balance";

import "./chat-settings.css";
import "./chat-album.css";

export type ChatAlbumScreenProps = {
  readonly source: ChatSource;
  readonly roomId: string;
  readonly name: string;
  readonly wallet: CoinWallet;
  readonly now?: () => number;
  /** 기기 시간대(UTC 기준 +분) — 날짜 묶음. 없으면 기기 값. */
  readonly offsetMinutes?: number;
  readonly onBack: () => void;
};

type Layer =
  | { readonly kind: "none" }
  | { readonly kind: "view"; readonly tile: ChatAlbumTile }
  | { readonly kind: "confirm"; readonly tile: ChatAlbumTile }
  | { readonly kind: "shop" };

const TABS: readonly ChatAlbumTab[] = ["all", "photos", "voice"];

// 인물 앨범 화면입니다(ADR-0150 M1 ~ M3 · M6). 대화와 따로 사는 사진 · 음성 — 탭 · 날짜 묶음 · 칸, 사진 보기 · 음성 시트 · 다시 만들기 확인.
// 가짜 방은 앱 지갑에서 값을 빼고, 서버 방은 서버가 예약 · 확정합니다(잔액만 봄). 시스템 뒤로는 겹침부터 닫습니다.
export function ChatAlbumScreen({
  source,
  roomId,
  name,
  wallet,
  now = Date.now,
  offsetMinutes = -new Date().getTimezoneOffset(),
  onBack,
}: ChatAlbumScreenProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.album;
  const album = useChatAlbum(source, roomId);
  const balance = useCoinBalance(wallet);
  const [tab, setTab] = useState<ChatAlbumTab>("all");
  const [layer, setLayer] = useState<Layer>({ kind: "none" });
  const [refused, setRefused] = useState<{ notice: ChatMediaNotice; photo: boolean } | null>(null);
  const close = () => setLayer({ kind: "none" });
  useScreenBack(() => {
    "background only";
    if (layer.kind !== "none") close();
    else onBack();
  });

  const sections =
    album.state.status === "ready"
      ? albumSections(album.state.items, tab, now(), offsetMinutes, album.remaking)
      : [];
  const dayLabel = (at: number) => copy.day(albumDayOf(at, now(), offsetMinutes));

  const confirm = (tile: ChatAlbumTile) => {
    "background only";
    const { item } = tile;
    const price = remakePrice(item.kind, true);
    // 가짜 방은 앱 지갑에서 냅니다(서버 방은 서버 지갑 — 잔액만 앞에서 봅니다).
    if (source.thread(roomId)?.server === null && wallet.spend(price, item.kind).kind === "short")
      return setLayer({ kind: "shop" });
    close();
    setRefused(null);
    void album.remake(item).then((result) => {
      if (result.kind === "refused")
        setRefused({ notice: result.notice, photo: item.kind === "photo" });
      else if (result.kind === "failed")
        setRefused({ notice: "request-failed", photo: item.kind === "photo" });
    });
  };

  return (
    <view className="chat-settings-screen" data-testid={ids.screen}>
      <view
        className="chat-settings-body"
        flatten={false}
        accessibility-elements-hidden={layer.kind === "none" ? undefined : true}
      >
        <ChatHeader
          title={copy.title(name)}
          insetTop={0}
          testIds={{ root: `${ids.screen}-header`, title: `${ids.screen}-title` }}
          start={
            <ChatHeaderSide testId={ids.back}>
              <RoundButton
                accessibilityLabel={copy.back}
                icon={arrowLeft03}
                variant="neutral"
                size="l"
                bindtap={onBack}
              />
            </ChatHeaderSide>
          }
          end={<ChatHeaderSide />}
        />
        <view className="chat-album-tabs">
          {TABS.map((id) => {
            const on = id === tab;
            return (
              <view
                key={id}
                className={`chat-album-tab${on ? " chat-album-tab-on" : ""}`}
                data-testid={ids.tab(id)}
                data-selected={on ? "true" : "false"}
                flatten={false}
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-label={on ? chat.toggle.selected(copy.tabs[id]) : copy.tabs[id]}
                accessibility-enable-tap={true}
                bindtap={() => {
                  "background only";
                  setTab(id);
                }}
              >
                <text className="chat-album-tab-label" accessibility-elements-hidden={true}>
                  {copy.tabs[id]}
                </text>
              </view>
            );
          })}
        </view>
        <scroll-view
          className="chat-settings-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="chat-settings-content">
            {refused === null ? null : (
              <text
                className="chat-album-refused"
                data-testid={ids.refused}
                flatten={false}
                accessibility-element={true}
              >
                {copy.refused(refused.notice, refused.photo ? "photo" : "voice", name)}
              </text>
            )}
            {album.state.status === "failed" ? (
              <view className="chat-settings-row" data-testid={ids.failed}>
                <text className="chat-album-empty" flatten={false} accessibility-element={true}>
                  {copy.loadFailed}
                </text>
                <view className="chat-album-action" data-testid={ids.retry}>
                  <Button label={copy.tryAgain} variant="outline" size="m" bindtap={album.retry} />
                </view>
              </view>
            ) : null}
            {album.state.status === "ready" && sections.length === 0 ? (
              <text
                className="chat-album-empty"
                data-testid={ids.empty}
                flatten={false}
                accessibility-element={true}
              >
                {copy.empty(name)}
              </text>
            ) : null}
            {sections.map((section) => (
              <view key={`${section.tiles[0]?.item.id ?? ""}`} className="chat-settings-row">
                <text
                  className="chat-album-day"
                  flatten={false}
                  accessibility-element={true}
                  accessibility-heading={true}
                >
                  {copy.day(section.day)}
                </text>
                <view className="chat-album-grid">
                  {section.tiles.map((tile) => (
                    <AlbumTile
                      key={tile.item.id}
                      tile={tile}
                      name={name}
                      onOpen={() => setLayer({ kind: "view", tile })}
                    />
                  ))}
                </view>
              </view>
            ))}
            {album.state.status === "ready" && album.state.hasMore ? (
              <view className="chat-album-action" data-testid={ids.more}>
                <Button label={copy.more} variant="outline" size="m" bindtap={album.more} />
              </view>
            ) : null}
            {album.state.status === "ready" ? (
              <text className="chat-album-note" flatten={false} accessibility-element={true}>
                {copy.keepNote}
              </text>
            ) : null}
          </view>
        </scroll-view>
      </view>
      {layer.kind === "view" && layer.tile.item.kind === "photo" ? (
        <AlbumPhotoViewer
          tile={layer.tile}
          name={name}
          dayLabel={dayLabel(layer.tile.item.createdAt)}
          onClose={close}
          onRedraw={() => setLayer({ kind: "confirm", tile: layer.tile })}
        />
      ) : null}
      {layer.kind === "view" && layer.tile.item.kind === "voice" ? (
        <AlbumVoiceSheet
          tile={layer.tile}
          name={name}
          onClose={close}
          onRecordAgain={() => setLayer({ kind: "confirm", tile: layer.tile })}
        />
      ) : null}
      {layer.kind === "confirm" ? (
        <RemakeDialog
          media={layer.tile.item.kind}
          name={name}
          price={remakePrice(layer.tile.item.kind, true)}
          balance={balance}
          onConfirm={() => confirm(layer.tile)}
          onGetCoins={() => setLayer({ kind: "shop" })}
          onCancel={close}
        />
      ) : null}
      {layer.kind === "shop" ? (
        <CoinShopLayer coinBalance={balance} onClose={close} ownsBack={false} />
      ) : null}
    </view>
  );
}
