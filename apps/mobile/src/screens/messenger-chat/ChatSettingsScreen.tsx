import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { SettingsCell } from "@libitums/ui-lynx/settings-cell";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { BirthYearSheet } from "./BirthYearSheet";
import type { ChatMemoryScope, ChatSource } from "./chat-source.contract";
import { chatSettingsTestIds as ids } from "./chat-settings.contract";
import { ProactiveSheet } from "./ProactiveSheet";
import { birthYearOptions } from "./safety-rules";
import { useChatMemories, useChatSnapshot } from "./use-chat-source";

import "./chat-settings.css";

export type ChatSettingsScreenProps = {
  readonly source: ChatSource;
  readonly onOpenSharedMemories: () => void;
  readonly onBack: () => void;
};

type Sheet =
  | { readonly kind: "none" }
  | { readonly kind: "proactive" }
  | { readonly kind: "birth-year"; readonly selected: number | null };

const SHARED: ChatMemoryScope = { kind: "shared" };

type NavRowProps = {
  readonly testId: string;
  readonly title: string;
  readonly value: string;
  readonly onTap: () => void;
};

// 누르면 시트 · 화면이 열리는 줄입니다. 낭독은 「제목, 값」 하나이고 Android 접근성 트리에 남깁니다(ADR-0125).
function NavRow({ testId, title, value, onTap }: NavRowProps): ReactNode {
  return (
    <view
      className="chat-settings-row"
      id={testId}
      data-testid={testId}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={`${title}, ${value}`}
      accessibility-enable-tap={true}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      <view accessibility-elements-hidden={true}>
        <SettingsCell
          trailing="navigation"
          title={title}
          description={value}
          onNavigate={() => {}}
        />
      </view>
    </view>
  );
}

// 설정 탭 > Chats 화면입니다(ADR-0126). 추천 답변 · 먼저 보내는 메시지 · 공유 기억 · 생년 — 모두 계정 하나의 값입니다.
export function ChatSettingsScreen({
  source,
  onOpenSharedMemories,
  onBack,
}: ChatSettingsScreenProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.chatSettings;
  const { preferences, birthYear } = useChatSnapshot(source);
  const shared = useChatMemories(source, SHARED);
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
                testId={ids.sharedMemories}
                title={copy.sharedMemories}
                value={copy.sharedMemoriesSummary(shared.count)}
                onTap={onOpenSharedMemories}
              />
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
