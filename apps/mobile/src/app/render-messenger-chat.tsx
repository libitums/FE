// 메신저 탭의 두 화면을 결선 값으로 그립니다(messenger-chat-ui spec §7.1). 한국어 자판 탐지는 고정값(모름)이고,
// 휴대폰 키보드 높이는 입력 칸이 잰 값을 기기에 남깁니다(`deviceKeyboardHeightStore`).

import { keyboardDockEdgesOf } from "../lib/keyboard-dock";
import { uiCopyFor } from "../lib/ui-copy";
import { deviceKeyboardHeightStore } from "../screens/messenger-chat/chat-local-stores";
import { unknownKoreanKeyboardProbe } from "../screens/messenger-chat/keyboard-ports";
import { ChatEventsContext } from "../screens/messenger-chat/chat-events";
import { ChatAlbumScreen } from "../screens/messenger-chat/ChatAlbumScreen";
import { ChatMemoriesScreen } from "../screens/messenger-chat/ChatMemoriesScreen";
import { ChatSettingsScreen } from "../screens/messenger-chat/ChatSettingsScreen";
import { MessengerChatScreen } from "../screens/messenger-chat/MessengerChatScreen";
import { MessengerListScreen } from "../screens/messenger-chat/MessengerListScreen";
import type { MessengerListNotice } from "../screens/messenger-chat/messenger-list-notice";
import {
  messengerAccessOf,
  type MessengerAccess,
} from "../screens/messenger-chat/messenger-access";
import type { ScreenWiring } from "./screen-wiring";
import { guestSuggestedFriendsPort, suggestedFriendsPort } from "./suggested-friends-wiring";
import { friendStoriesPort, myStoriesPortFrom } from "./friend-stories-wiring";
import { MyStoriesScreen } from "../screens/messenger-chat/MyStoriesScreen";
import { StoryImageContext } from "../screens/messenger-chat/story-image-context";
import { ChatStoryHost } from "../screens/messenger-chat/ChatStoryHost";
import { ChatPushAskContext } from "../screens/messenger-chat/ChatPushAsk";
import { chatPushAskPort } from "./chat-push-ask-wiring";

// 알림 권한 카드 포트(ADR-0197) — 회원 방에만 내립니다. 상태가 없어 하나를 함께 씁니다.
const pushAskPort = chatPushAskPort();

/** 메신저 탭 접근(ADR-0128) — 계정 상태로만 정합니다(2026-11-17부터 시험 계정 표시는 보지 않습니다). */
export function messengerAccessFor(wiring: ScreenWiring): MessengerAccess {
  return messengerAccessOf(wiring.accountState);
}

/** 가입 직후 이름을 아직 모르면(빈 문자열 포함) 학습 메신저와 같이 「나」 문구를 씁니다 — 말풍선 화자는 비면 안 됩니다. */
function learnerNameOf(wiring: ScreenWiring): string {
  const name = wiring.learnerFill.name?.trim() ?? "";
  return name === "" ? uiCopyFor(wiring.entryLanguage).common.me : name;
}

function storiesArgs(wiring: ScreenWiring) {
  return {
    imageUrlOf: wiring.episodeContent.imageUrlOf,
    catalog: () => wiring.episodeContent.catalog,
    romanization: () => wiring.more.romanization === "shown",
    // 보기 답장의 앱 관문(ADR-0178 D5 개정) — 대화방 입력 줄과 같은 체험 · 등급.
    replyPlan: { trial: wiring.messengerChat.trial, tier: wiring.messengerChat.tier },
  };
}

/** 이번 실행에 읽은 내 스토리 서버가 켜져 있었는가(ADR-0194) — 설정의 「My stories」 줄. */
export function myStoriesKnownOn(wiring: ScreenWiring): boolean {
  return myStoriesPortFrom(storiesArgs(wiring))?.knownEnabled?.() === true;
}

export function renderMessengerList(wiring: ScreenWiring, notice: MessengerListNotice | null) {
  const chat = wiring.messengerChat;
  const access = messengerAccessFor(wiring);
  // 프로필 시트 목소리 견본(ADR-0198) — 아바타와 같은 해석기 · 로마자 스위치.
  const view = {
    contentUrlOf: wiring.episodeContent.imageUrlOf,
    romanization: () => wiring.more.romanization === "shown",
  };
  return (
    <ChatEventsContext.Provider value={{ sink: chat.eventSink, roomId: null }}>
      <MessengerListScreen
        source={chat.source}
        wallet={chat.wallet}
        onOpenRoom={chat.onOpenChatRoom}
        onGoToJourney={chat.onGoToJourney}
        onLayerChange={wiring.onScreenLayerChange}
        notice={notice}
        onNoticeShown={chat.onListNoticeShown}
        access={access}
        onSignIn={wiring.onSignIn}
        // 비회원 미리보기(ADR-0166)는 앱 인물 표만 — 서버 RPC 0.
        friends={
          access === "preview" ? guestSuggestedFriendsPort(view) : suggestedFriendsPort(view)
        }
        // 친구 스토리(ADR-0178) — 회원 메신저만. 손님 · 접근 불가는 서버 RPC 0(목록 화면이 한 번 더 거릅니다).
        stories={access === "open" ? friendStoriesPort(storiesArgs(wiring)) : undefined}
      />
    </ChatEventsContext.Provider>
  );
}

export function renderMessengerChat(roomId: string, wiring: ScreenWiring) {
  const chat = wiring.messengerChat;
  const access = messengerAccessFor(wiring);
  return (
    <ChatEventsContext.Provider value={{ sink: chat.eventSink, roomId }}>
      <StoryImageContext.Provider value={wiring.episodeContent.imageUrlOf}>
        <ChatPushAskContext.Provider value={access === "open" ? pushAskPort : null}>
          {/* 스토리 인용 판(ADR-0178 D5 개정 ⟨판⟩) — 회원 방만 목록을 받고 판을 누를 수 있습니다. 방마다 새로(key). */}
          <ChatStoryHost
            key={`${roomId}:${access}`}
            port={access === "open" ? friendStoriesPort(storiesArgs(wiring)) : undefined}
            source={chat.source}
            wallet={chat.wallet}
            roomId={roomId}
            onOpenRoom={chat.onOpenChatRoomFromNewFriend}
          >
            {/* 방마다 새로 섭니다 — 같은 자리에서 다른 방으로 바뀌어도 앞 방의 말풍선 도구 · 입력 · 턴 상태가 남지 않습니다. 비회원이
          로그인하고 같은 방으로 돌아오면(ADR-0166) 접근이 바뀌어 회원 출처로 새로 섭니다. */}
            <MessengerChatScreen
              key={`${roomId}:${access}`}
              onSignInRequired={access === "preview" ? wiring.onSignIn : null}
              roomId={roomId}
              source={chat.source}
              keyboardProbe={unknownKoreanKeyboardProbe}
              keyboardHeightStore={deviceKeyboardHeightStore}
              edges={keyboardDockEdgesOf(wiring.safeAreaInsets)}
              learnerName={learnerNameOf(wiring)}
              wallet={chat.wallet}
              trial={chat.trial}
              tier={chat.tier}
              planOffer={wiring.plans?.messengerOffer}
              onExit={chat.onExitChatRoom}
              onOpenMemories={chat.onOpenMemories}
              onOpenAlbum={chat.onOpenAlbum}
              onOpenMyProfile={chat.onOpenMyProfile}
              chatWords={
                access === "open" && wiring.ranking.signedIn
                  ? {
                      load: () => wiring.ranking.client.load("chat-words"),
                      onOpen: () => wiring.ranking.openRanking("chat-words"),
                      eventSink: wiring.ranking.eventSink,
                    }
                  : null
              }
            />
          </ChatStoryHost>
        </ChatPushAskContext.Provider>
      </StoryImageContext.Provider>
    </ChatEventsContext.Provider>
  );
}

export function renderChatSettings(wiring: ScreenWiring) {
  const chat = wiring.messengerChat;
  return (
    <ChatSettingsScreen
      source={chat.source}
      onOpenSharedMemories={() => chat.onOpenMemories(null, null)}
      onBack={chat.onExitChatSettingsStack}
    />
  );
}

/** 설정 › My stories(ADR-0194) — 반응에 답하면 메신저 탭으로 옮겨 그 방을 엽니다. */
export function renderMyStories(wiring: ScreenWiring) {
  const chat = wiring.messengerChat;
  const port = myStoriesPortFrom(storiesArgs(wiring));
  if (port === undefined) return renderChatSettings(wiring);
  return (
    <ChatEventsContext.Provider value={{ sink: chat.eventSink, roomId: null }}>
      <MyStoriesScreen
        port={port}
        source={chat.source}
        onBack={chat.onExitChatSettingsStack}
        onOpenRoom={chat.onOpenChatRoomFromNewFriend}
      />
    </ChatEventsContext.Provider>
  );
}

export function renderChatMemories(
  characterId: string | null,
  characterName: string | null,
  wiring: ScreenWiring,
) {
  const chat = wiring.messengerChat;
  return (
    <ChatMemoriesScreen
      source={chat.source}
      scope={characterId === null ? { kind: "shared" } : { kind: "character", characterId }}
      name={characterId === null ? null : characterName}
      onBack={chat.onExitChatSettingsStack}
    />
  );
}

/** 인물 앨범(ADR-0150) — 방 사이드바에서 쌓이고 뒤로 방으로 돌아갑니다. */
export function renderChatAlbum(roomId: string, characterName: string, wiring: ScreenWiring) {
  const chat = wiring.messengerChat;
  return (
    <ChatEventsContext.Provider value={{ sink: chat.eventSink, roomId }}>
      <ChatAlbumScreen
        source={chat.source}
        roomId={roomId}
        name={characterName}
        wallet={chat.wallet}
        now={chat.now}
        onBack={chat.onExitChatSettingsStack}
      />
    </ChatEventsContext.Provider>
  );
}
