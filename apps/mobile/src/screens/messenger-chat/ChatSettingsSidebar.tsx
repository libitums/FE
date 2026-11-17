import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import cross from "@libitums/icons/lynx/cross";
import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";
import { Overlay } from "@libitums/ui-lynx/overlay";
import { SettingsCell } from "@libitums/ui-lynx/settings-cell";

import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import type {
  ChatBirthYear,
  ChatFeedbackMode,
  ChatMemoryList,
  ChatThread,
} from "./chat-source.contract";
import { chatAlbumTestIds } from "./chat-album.contract";
import { chatSettingsTestIds } from "./chat-settings.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { NavRow } from "./NavRow";

import "./chat-overlays.css";

export type ChatSettingsSidebarProps = {
  readonly thread: ChatThread;
  readonly learnerName: string;
  readonly coinBalance: number;
  readonly onGetCoins: () => void;
  readonly onStoryPoint: () => void;
  /** 생년 줄의 값입니다(ADR-0125) — 연도 또는 「Not set」. */
  readonly birthYear: ChatBirthYear;
  readonly onBirthYear: () => void;
  /** 이 인물 기억의 개수 · 상한 · 가득 참(ADR-0126). */
  readonly memories: ChatMemoryList;
  readonly onMemories: () => void;
  readonly feedbackMode: ChatFeedbackMode;
  readonly onFeedbackMode: () => void;
  /** 이 인물 앨범(ADR-0150 M1). */
  readonly onAlbum: () => void;
  /** My profile — 설정 탭의 User profile로(ADR-0156). */
  readonly onMyProfile: () => void;
  /** 추천 답변 칩을 보일지(계정 설정 `replyIdeas`, ADR-0156) · 바꾸면 바뀐 값. */
  readonly replyIdeas: boolean;
  readonly onReplyIdeas: (on: boolean) => void;
  /** 대화 비우기 확인을 엽니다(ADR-0156). */
  readonly onClear: () => void;
  readonly onClose: () => void;
};

// 채팅 설정 사이드바(O4)입니다. 줄 순서가 고정입니다: ①엽전 ②내 프로필 ③이야기 시점 ④앨범(ADR-0150) ⑤생년 ⑥기억
// ⑦교정 방식 ⑧추천 답변 ⑨대화 비우기. 상대 프로필 줄은 프로필 화면이 생길 때까지 숨깁니다(ADR-0156 — 그리지 않음).
// 오른쪽에서 밀려 들어오며, 움직임 줄이기면 미는 움직임 클래스를 달지 않아 즉시 서습니다.
export function ChatSettingsSidebar({
  thread,
  learnerName,
  coinBalance,
  onGetCoins,
  onStoryPoint,
  birthYear,
  onBirthYear,
  memories,
  onMemories,
  feedbackMode,
  onFeedbackMode,
  onAlbum,
  onMyProfile,
  replyIdeas,
  onReplyIdeas,
  onClear,
  onClose,
}: ChatSettingsSidebarProps): ReactNode {
  const copy = useUiCopy().messengerChat.sidebar;
  const storyCopy = useUiCopy().messengerChat.storyPoint;
  const slide = useMotion() !== "reduced";
  // 사이드바는 셸 밖(`position: fixed`)이라 셸의 안전 영역 여백을 받지 못합니다 — 스스로 읽습니다.
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const { counterpart, settings } = thread;
  const current = thread.storyPoints.find((point) => point.id === settings.storyPointId);
  const storyValue =
    current === undefined
      ? undefined
      : storyCopy.episodeTitle(current.episodeNumber, current.title);

  const handleClose = () => {
    "background only";
    onClose();
  };
  const settingsCopy = useUiCopy().messengerChat.chatSettings;
  const albumCopy = useUiCopy().messengerChat.album;
  const feedbackCopy = settingsCopy.feedback;
  const memoryTitle = settingsCopy.memories.sidebar(counterpart.name);
  const memoryValue = settingsCopy.memories.sidebarSummary(
    memories.count,
    memories.cap,
    memories.full,
  );
  const feedbackValue = feedbackCopy.modes[feedbackMode].title;
  const yearCopy = useUiCopy().messengerChat.safety.birthYear;
  const yearValue = birthYear.kind === "set" ? String(birthYear.year) : yearCopy.notSet;
  const handleGetCoins = () => {
    "background only";
    onGetCoins();
  };
  const handleClear = () => {
    "background only";
    onClear();
  };

  return (
    <view className="chat-sidebar" data-testid={ids.sidebar} event-through={false}>
      <Overlay scope="screen" surface="sheet" dismiss="tap" binddismiss={onClose} />
      <view
        className={`chat-sidebar-panel${slide ? " chat-sidebar-panel-slide" : ""}`}
        accessibility-role-description="dialog"
      >
        <view style={{ height: `${insets.top}px`, flexShrink: 0 }} />
        <view className="chat-sidebar-head">
          <text className="chat-sidebar-title" accessibility-traits="header">
            {copy.title}
          </text>
          <view
            className="chat-sidebar-close"
            data-testid={ids.sidebarClose}
            accessibility-element={true}
            accessibility-label={copy.close}
            accessibility-traits="button"
            accessibility-enable-tap={true}
            bindtap={handleClose}
          >
            <svg
              className="chat-sidebar-close-icon"
              content={cross}
              current-color={color.fg.neutral}
            />
          </view>
        </view>
        <scroll-view
          className="chat-sidebar-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="chat-sidebar-content">
            <view className="chat-sidebar-coins" data-testid={ids.sidebarCoins} data-order="1">
              <view className="chat-sidebar-coins-text">
                <text className="chat-sidebar-coins-label">{copy.myCoins}</text>
                <text className="chat-sidebar-coins-count">{coinBalance}</text>
              </view>
              {/* 접근성 요소는 이 감싸개 하나입니다(`id`로 초점을 돌려받습니다 — a11y C1). 탭은 안쪽 단추에서 올라와 여기서
                  처리하고, 안쪽 단추는 모양만 맡아 낭독에서 숨습니다. */}
              <view
                id={ids.sidebarGetCoins}
                data-testid={ids.sidebarGetCoins}
                flatten={false}
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-label={copy.getCoins}
                accessibility-enable-tap={true}
                bindtap={handleGetCoins}
              >
                <view accessibility-elements-hidden={true}>
                  <Button label={copy.getCoins} variant="brand" size="s" />
                </view>
              </view>
            </view>
            <view className="chat-sidebar-row" data-testid={ids.sidebarMyProfile} data-order="2">
              <SettingsCell
                trailing="navigation"
                title={copy.myProfile}
                description={copy.calledBy(counterpart.name, learnerName)}
                avatar={{ name: learnerName }}
                onNavigate={onMyProfile}
              />
            </view>
            <NavRow
              className="chat-sidebar-row"
              testId={ids.sidebarStoryPoint}
              order={3}
              title={copy.storyPoint}
              value={storyValue}
              onTap={onStoryPoint}
            />
            <NavRow
              className="chat-sidebar-row"
              testId={chatAlbumTestIds.sidebarRow}
              order={4}
              title={albumCopy.sidebarRow}
              value={albumCopy.sidebarDescription}
              onTap={onAlbum}
            />
            <NavRow
              className="chat-sidebar-row"
              testId={ids.sidebarBirthYear}
              order={5}
              title={yearCopy.sidebar}
              value={yearValue}
              onTap={onBirthYear}
            />
            <NavRow
              className="chat-sidebar-row"
              testId={chatSettingsTestIds.sidebarMemories}
              order={6}
              title={memoryTitle}
              value={memoryValue}
              onTap={onMemories}
            />
            <NavRow
              className="chat-sidebar-row"
              testId={chatSettingsTestIds.sidebarFeedback}
              order={7}
              title={feedbackCopy.sidebar}
              value={feedbackValue}
              onTap={onFeedbackMode}
            />
            <view className="chat-sidebar-row" data-testid={ids.sidebarReplyIdeas} data-order="8">
              <SettingsCell
                trailing="toggle"
                title={settingsCopy.replyIdeas}
                description={settingsCopy.replyIdeasBody}
                checked={replyIdeas}
                onChange={onReplyIdeas}
              />
            </view>
          </view>
        </scroll-view>
        <view className="chat-sidebar-delete">
          <view
            id={ids.sidebarClear}
            className="chat-sidebar-delete-button"
            data-testid={ids.sidebarClear}
            data-order="9"
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={copy.clearChat}
            accessibility-enable-tap={true}
            bindtap={handleClear}
          >
            <text className="chat-sidebar-delete-label" accessibility-elements-hidden={true}>
              {copy.clearChat}
            </text>
          </view>
        </view>
        <view style={{ height: `${insets.bottom}px`, flexShrink: 0 }} />
      </view>
    </view>
  );
}
