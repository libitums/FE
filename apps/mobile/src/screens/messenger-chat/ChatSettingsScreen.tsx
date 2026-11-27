import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { SettingsCell } from "@libitums/ui-lynx/settings-cell";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { BirthYearSheet } from "./BirthYearSheet";
import {
  chatAlbumTestIds as albumIds,
  DEFAULT_SNAPSHOT_SELF,
  type ChatSnapshotSelf,
} from "./chat-album.contract";
import type { ChatSource } from "./chat-source.contract";
import { chatSettingsTestIds as ids } from "./chat-settings.contract";
import { NavRow } from "./NavRow";
import { ProactiveSheet } from "./ProactiveSheet";
import { SnapshotSelfSheet } from "./SnapshotSelfSheet";
import { birthYearOptions } from "./safety-rules";
import { useChatSnapshot } from "./use-chat-source";

import "./chat-settings.css";

export type ChatSettingsScreenProps = {
  readonly source: ChatSource;
  readonly onBack: () => void;
};

type Sheet =
  | { readonly kind: "none" }
  | { readonly kind: "proactive" }
  | { readonly kind: "snapshot-self"; readonly selected: ChatSnapshotSelf }
  | { readonly kind: "birth-year"; readonly selected: number | null };

// 설정 탭 > Chats 화면입니다(ADR-0126). 추천 답변 · 먼저 보내는 메시지 · 생년 · 사진 속 내 모습(ADR-0150) — 모두 계정 하나의
// 값입니다. 공유 기억 줄은 없습니다 — 기억은 캐릭터마다이고, 각 방의 ☰에서 봅니다(ADR-0210 D6).
export function ChatSettingsScreen({ source, onBack }: ChatSettingsScreenProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.chatSettings;
  const { preferences, birthYear } = useChatSnapshot(source);
  const [sheet, setSheet] = useState<Sheet>({ kind: "none" });
  const close = () => setSheet({ kind: "none" });
  useScreenBack(() => {
    "background only";
    if (sheet.kind !== "none") close();
    else onBack();
  });

  const proactiveValue =
    preferences.proactive === "off"
      ? copy.proactiveSheet.prefs.off
      : `${copy.proactiveSheet.prefs[preferences.proactive]} · ${
          preferences.proactiveHour === null
            ? copy.proactiveSheet.anyTime
            : copy.proactiveSheet.hour(preferences.proactiveHour)
        }`;
  // 고른 적 없으면 서버 기본값(Woman)을 보입니다 — 저장은 시트에서 Save할 때만(ADR-0150 M4).
  const snapshotSelf = preferences.snapshotSelf ?? DEFAULT_SNAPSHOT_SELF;
  const yearValue =
    birthYear.kind === "set" ? String(birthYear.year) : chat.safety.birthYear.notSet;

  return (
    <view className="chat-settings-screen" data-testid={ids.screen}>
      <view
        className="chat-settings-body"
        flatten={false}
        accessibility-elements-hidden={sheet.kind === "none" ? undefined : true}
      >
        <ChatHeader
          title={copy.title}
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
        <scroll-view
          className="chat-settings-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="chat-settings-content">
            <text
              className="chat-settings-section"
              flatten={false}
              accessibility-element={true}
              accessibility-heading={true}
            >
              {copy.sectionWhile}
            </text>
            <view className="chat-settings-card" data-testid={ids.replyIdeas}>
              <SettingsCell
                trailing="toggle"
                title={copy.replyIdeas}
                description={copy.replyIdeasBody}
                checked={preferences.replyIdeas}
                onChange={(on: boolean) => source.setPreferences({ replyIdeas: on })}
              />
            </view>
            <text
              className="chat-settings-section"
              flatten={false}
              accessibility-element={true}
              accessibility-heading={true}
            >
              {copy.sectionProactive}
            </text>
            <view className="chat-settings-card">
              <NavRow
                testId={ids.proactive}
                title={copy.proactive}
                value={proactiveValue}
                onTap={() => setSheet({ kind: "proactive" })}
              />
            </view>
            <text
              className="chat-settings-section"
              flatten={false}
              accessibility-element={true}
              accessibility-heading={true}
            >
              {copy.sectionAbout}
            </text>
            <view className="chat-settings-card">
              <NavRow
                testId={ids.birthYear}
                title={chat.safety.birthYear.sidebar}
                value={yearValue}
                onTap={() =>
                  setSheet({
                    kind: "birth-year",
                    selected: birthYear.kind === "set" ? birthYear.year : null,
                  })
                }
              />
              <NavRow
                testId={albumIds.selfRow}
                title={chat.album.selfRow}
                value={chat.album.selfOptions[snapshotSelf].title}
                onTap={() => setSheet({ kind: "snapshot-self", selected: snapshotSelf })}
              />
            </view>
            <text className="chat-settings-footnote" flatten={false} accessibility-element={true}>
              {copy.footnote}
            </text>
          </view>
        </scroll-view>
      </view>
      {sheet.kind === "proactive" ? (
        <ProactiveSheet
          pref={preferences.proactive}
          hour={preferences.proactiveHour}
          onSave={(pref, hour) => {
            source.setPreferences({ proactive: pref, proactiveHour: hour });
            close();
          }}
          onClose={close}
        />
      ) : null}
      {sheet.kind === "snapshot-self" ? (
        <SnapshotSelfSheet
          selected={sheet.selected}
          onSelect={(self) => setSheet({ kind: "snapshot-self", selected: self })}
          onSave={() => {
            source.setPreferences({ snapshotSelf: sheet.selected });
            close();
          }}
          onClose={close}
        />
      ) : null}
      {sheet.kind === "birth-year" ? (
        <BirthYearSheet
          years={birthYearOptions(Date.now())}
          selected={sheet.selected}
          dismissible={true}
          onSelect={(year) => setSheet({ kind: "birth-year", selected: year })}
          onContinue={() => {
            if (sheet.selected !== null) source.setBirthYear(sheet.selected);
            close();
          }}
          onSkip={() => {
            source.setBirthYear(null);
            close();
          }}
          onClose={close}
        />
      ) : null}
    </view>
  );
}
