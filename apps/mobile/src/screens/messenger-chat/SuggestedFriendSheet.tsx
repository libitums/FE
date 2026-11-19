import { useGlobalProps, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { shouldDismissBottomSheetDrag } from "@libitums/ui-lynx/bottom-sheet";
import { useMotion } from "@libitums/ui-lynx/motion";
import { Overlay } from "@libitums/ui-lynx/overlay";

import { ChatTextBubble } from "../../components/chat/ChatMessageRow";
import { screenHeightFrom } from "../../lib/learning-density";
import { safeAreaInsetsFrom, sheetBottomInsetFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { sheetMaxHeightOf } from "./scroll-budget";
import type { SuggestedFriendSheetProps } from "./suggested-friends.contract";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import { localizedLine } from "./suggested-friends";
import { FriendFactsLine, FriendProfileExtras } from "./FriendProfileParts";
import { SuggestedSheetActions } from "./SuggestedSheetActions";
import { useScrollBudget } from "./use-scroll-budget";

import "../../components/chat/chat.css";
import "./messenger-list.css";
import "./suggested-friends.css";
import "./suggested-sheet.css";

const FIXED_KEYS = ["top", "actions"] as const;
/** 단추 줄의 기본 아래 여백(CSS `--libitum-spacing-16`)입니다. */
const ACTIONS_BOTTOM_PADDING = 16;

type PanelTouchEvent = { readonly detail: { readonly y: number } };

// 스크롤 중인 본문 위에서 시작한 터치가 판 끌어내림으로 번지지 않게 막습니다(새 친구 시트와 같음).
function holdTouch(): void {
  "background only";
}

/**
 * 추천 친구 프로필 시트(R2 · R4 · R6, ADR-0162). 추가 가능이면 소개 · 태그 · 첫 말 · Start chatting, 잠김이면 만날 회차 · 안내 줄과
 * (먼저 만나기 제안이 있을 때만) Chat now. 막 탭 · Not now · 끌어내림 · 시스템 뒤로가기는 모두 `onClose`입니다.
 * ⟨2026-11-19⟩ 추가 가능 · 읽기 전용이면 사실 줄(나이 · 직업 · MBTI) · 목소리 견본 · AI 표시. 읽기 전용(`mode: profile`, 방 머리)은
 * 첫 말 · 추가 단추 없이 닫기만 둡니다.
 */
export function SuggestedFriendSheet({
  model,
  now,
  onStart,
  onEarly,
  onClose,
  onVoicePlayed,
  ownBack = true,
}: SuggestedFriendSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat.suggested;
  const { character, offer } = model;
  const mode = model.mode ?? "suggest";
  const locked = model.status === "locked";
  const still = useMotion() === "reduced";
  const dragStartY = useRef<number | null>(null);
  const globalProps = useGlobalProps();
  // 큰 글자에서 판이 화면 밖으로 넘치지 않게 px 상한을 걸고 본문만 스크롤합니다(새 친구 시트 접근성 C1과 같음).
  const maxHeight = sheetMaxHeightOf({
    screenHeight: screenHeightFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo),
    insetTop: safeAreaInsetsFrom(globalProps).top,
  });
  const budget = useScrollBudget(maxHeight, FIXED_KEYS);
  // 아래 시스템 바 · 홈 인디케이터 몫(ADR-0044 D3 개정) — CSS `env()`는 Lynx에서 0입니다.
  const bottomInset = sheetBottomInsetFrom(globalProps, ACTIONS_BOTTOM_PADDING);
  useLayerBack(ownBack ? onClose : null);

  const handleDragStart = (event: PanelTouchEvent): void => {
    "background only";
    // oxlint-disable-next-line react/immutability
    dragStartY.current = event.detail.y;
  };
  const handleDragEnd = (event: PanelTouchEvent): void => {
    "background only";
    const startY = dragStartY.current;
    // oxlint-disable-next-line react/immutability
    dragStartY.current = null;
    if (startY !== null && shouldDismissBottomSheetDrag(startY, event.detail.y)) onClose();
  };

  const sub =
    locked && character.unlockEpisode !== null
      ? copy.meetIn(character.unlockEpisode)
      : character.intro === null
        ? null
        : localizedLine(character.intro, copy.language);

  return (
    <view className="suggested-sheet" data-testid={ids.sheet} event-through={false}>
      <Overlay scope="screen" surface="sheet" dismiss="tap" binddismiss={onClose} />
      <view
        className={
          still ? "suggested-sheet-panel suggested-sheet-panel-still" : "suggested-sheet-panel"
        }
        style={maxHeight === null ? undefined : { maxHeight: `${maxHeight}px` }}
        bindtouchstart={handleDragStart}
        bindtouchend={handleDragEnd}
      >
        <view className="suggested-sheet-top" bindlayoutchange={budget.onFixedLayout("top")}>
          <view className="suggested-sheet-handle" accessibility-elements-hidden={true} />
          <view className="suggested-sheet-face" accessibility-elements-hidden={true}>
            <Avatar
              imageSource={model.avatarUrl ?? undefined}
              name={character.name}
              size="xl"
              accessibility="hidden"
            />
            {locked ? (
              <view className="suggested-sheet-lock">
                <svg
                  className="suggested-sheet-lock-icon"
                  content={lock}
                  current-color={color.white}
                />
              </view>
            ) : null}
          </view>
          <view
            className="suggested-sheet-title"
            flatten={false}
            accessibility-element={true}
            accessibility-traits="header"
            accessibility-role-description="dialog"
            accessibility-label={copy.sheetLabel(character.name)}
          >
            <text className="suggested-sheet-name" data-testid={ids.sheetName}>
              {character.name}
            </text>
            {character.kind === "general" ? (
              <view className="messenger-list-new">
                <text className="messenger-list-new-text">{copy.newBadge}</text>
              </view>
            ) : null}
          </view>
          {locked ? null : <FriendFactsLine character={character} />}
          {sub === null ? null : (
            <text
              className="suggested-sheet-sub"
              data-testid={ids.sheetIntro}
              flatten={false}
              accessibility-element={true}
            >
              {sub}
            </text>
          )}
        </view>

        <scroll-view
          className="suggested-sheet-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
          style={budget.height === null ? undefined : { height: `${budget.height}px` }}
          catchtouchstart={budget.scrollable ? holdTouch : undefined}
          catchtouchend={budget.scrollable ? holdTouch : undefined}
        >
          <view className="suggested-sheet-body" bindlayoutchange={budget.onContentLayout}>
            {!locked && character.tags.length > 0 ? (
              <view
                className="suggested-sheet-tags"
                data-testid={ids.sheetTags}
                flatten={false}
                accessibility-element={true}
                accessibility-label={character.tags
                  .map((tag) => localizedLine(tag, copy.language))
                  .join(", ")}
              >
                {character.tags.map((tag) => (
                  <view key={tag.en} className="suggested-sheet-tag">
                    <text className="suggested-sheet-tag-text">
                      {localizedLine(tag, copy.language)}
                    </text>
                  </view>
                ))}
              </view>
            ) : null}
            {!locked && mode === "suggest" && character.sheetOpening !== null ? (
              <view className="suggested-sheet-opening" data-testid={ids.sheetOpening}>
                <ChatTextBubble
                  direction="incoming"
                  speaker={character.name}
                  message={character.sheetOpening.ko}
                  translation={character.sheetOpening.en}
                />
              </view>
            ) : null}
            {locked ? (
              <view className="suggested-sheet-info" data-testid={ids.sheetInfo}>
                <text
                  className="suggested-sheet-info-text"
                  flatten={false}
                  accessibility-element={true}
                >
                  {copy.lockedInfo(character.name)}
                </text>
              </view>
            ) : null}
            <FriendProfileExtras
              character={character}
              voiceUrl={locked ? null : (model.voiceUrl ?? null)}
              {...(onVoicePlayed === undefined ? {} : { onVoicePlayed })}
            />
          </view>
        </scroll-view>

        <view
          className="suggested-sheet-actions"
          style={
            bottomInset > 0
              ? { paddingBottom: `${ACTIONS_BOTTOM_PADDING + bottomInset}px` }
              : undefined
          }
          bindlayoutchange={budget.onFixedLayout("actions")}
        >
          <SuggestedSheetActions
            name={character.name}
            mode={mode}
            locked={locked}
            offer={offer}
            now={now}
            onStart={onStart}
            onEarly={onEarly}
            onClose={onClose}
          />
        </view>
      </view>
    </view>
  );
}
