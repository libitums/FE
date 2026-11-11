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
import type { ChatBirthYear, ChatThread } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

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
  readonly onAutoIdeas: (on: boolean) => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
};

// 탭이 아무 동작도 하지 않는 줄(상대 프로필 · 내 프로필)의 눌림 처리입니다 — 1단계에는 프로필 화면이 없습니다.
const noop = (): void => undefined;

// 채팅 설정 사이드바(O4)입니다. 줄 순서가 고정입니다: ①엽전 ②상대 프로필 ③내 프로필 ④이야기 시점 ⑤따로 띄운 자동 보기
// 토글 상자 ⑥대화 지우기. 오른쪽에서 밀려 들어오며, 움직임 줄이기면 미는 움직임 클래스를 달지 않아 즉시 서습니다.
export function ChatSettingsSidebar({
  thread,
  learnerName,
  coinBalance,
  onGetCoins,
  onStoryPoint,
  birthYear,
  onBirthYear,
  onAutoIdeas,
  onDelete,
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
  const handleStoryPoint = () => {
    "background only";
    onStoryPoint();
  };
  const handleBirthYear = () => {
    "background only";
    onBirthYear();
  };
  const yearCopy = useUiCopy().messengerChat.safety.birthYear;
  const yearValue = birthYear.kind === "set" ? String(birthYear.year) : yearCopy.notSet;
  const handleGetCoins = () => {
    "background only";
    onGetCoins();
  };
  const handleDelete = () => {
    "background only";
    onDelete();
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
            <view className="chat-sidebar-row" data-testid={ids.sidebarProfile} data-order="2">
              <SettingsCell
                trailing="navigation"
                title={counterpart.name}
                description={copy.viewProfile}
                avatar={{
                  name: counterpart.name,
                  ...(counterpart.avatarUrl === null ? {} : { imageSource: counterpart.avatarUrl }),
                }}
                onNavigate={noop}
              />
            </view>
            <view className="chat-sidebar-row" data-testid={ids.sidebarMyProfile} data-order="3">
              <SettingsCell
                trailing="navigation"
                title={copy.myProfile}
                description={copy.calledBy(counterpart.name, learnerName)}
                avatar={{ name: learnerName }}
                onNavigate={noop}
              />
            </view>
            <view
              className="chat-sidebar-row"
              id={ids.sidebarStoryPoint}
              data-testid={ids.sidebarStoryPoint}
              data-order="4"
              accessibility-element={true}
              accessibility-traits="button"
              accessibility-label={
                storyValue === undefined ? copy.storyPoint : `${copy.storyPoint}, ${storyValue}`
              }
              accessibility-enable-tap={true}
              bindtap={handleStoryPoint}
            >
              <view accessibility-elements-hidden={true}>
                <SettingsCell
                  trailing="navigation"
                  title={copy.storyPoint}
                  description={storyValue}
                  onNavigate={noop}
                />
              </view>
            </view>
            <view
              className="chat-sidebar-row"
              id={ids.sidebarBirthYear}
              data-testid={ids.sidebarBirthYear}
              flatten={false}
              data-order="5"
              accessibility-element={true}
              accessibility-traits="button"
              accessibility-label={`${yearCopy.sidebar}, ${yearValue}`}
              accessibility-enable-tap={true}
              bindtap={handleBirthYear}
            >
              <view accessibility-elements-hidden={true}>
                <SettingsCell
                  trailing="navigation"
                  title={yearCopy.sidebar}
                  description={yearValue}
                  onNavigate={noop}
                />
              </view>
            </view>
            <view
              className="chat-sidebar-toggle-box"
              data-testid={ids.sidebarAutoIdeas}
              data-order="6"
            >
              <SettingsCell
                trailing="toggle"
                title={copy.autoIdeas}
                description={copy.autoIdeasDescription}
                checked={settings.autoIdeas}
                onChange={onAutoIdeas}
              />
            </view>
          </view>
        </scroll-view>
        <view className="chat-sidebar-delete">
          <view
            id={ids.sidebarDelete}
            className="chat-sidebar-delete-button"
            data-testid={ids.sidebarDelete}
            data-order="7"
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={copy.deleteChat}
            accessibility-enable-tap={true}
            bindtap={handleDelete}
          >
            <text className="chat-sidebar-delete-label" accessibility-elements-hidden={true}>
              {copy.deleteChat}
            </text>
          </view>
        </view>
        <view style={{ height: `${insets.bottom}px`, flexShrink: 0 }} />
      </view>
    </view>
  );
}
