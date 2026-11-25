import { useGlobalProps, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { shouldDismissBottomSheetDrag } from "@libitums/ui-lynx/bottom-sheet";
import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";
import { Overlay } from "@libitums/ui-lynx/overlay";

import { ChatTextBubble } from "../../components/chat/ChatMessageRow";
import { coinIcon } from "../../components/coin-icon";
import { screenHeightFrom } from "../../lib/learning-density";
import { safeAreaInsetsFrom, sheetBottomInsetFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { sheetMaxHeightOf } from "./scroll-budget";
import type { SuggestedFriendsCopy, SuggestedFriendSheetProps } from "./suggested-friends.contract";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import { localizedLine, offerBadgeOf } from "./suggested-friends";
import type { EarlyAccessOffer } from "./friend-catalog.contract";
import { sheetLineOf } from "./profile-voice-sample";
import { ProfileVoiceButton } from "./ProfileVoiceButton";
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

// 단추 · 배지 · 둘째 줄을 한 이름으로 읽습니다 — 값의 단위(엽전)와 남은 기간이 그림에만 있지 않게.
function earlyLabel(offer: EarlyAccessOffer, now: number, copy: SuggestedFriendsCopy): string {
  const badge = offerBadgeOf(offer, now);
  return copy.earlyButtonLabel(offer.price, badge.kind === "limited" ? null : badge);
}

function limitedText(offer: EarlyAccessOffer, now: number, copy: SuggestedFriendsCopy): string {
  const badge = offerBadgeOf(offer, now);
  return badge.kind === "limited" ? copy.limited : copy.limitedUntil(badge.days, badge.hours);
}

/**
 * 추천 친구 프로필 시트(R2 · R4 · R6, ADR-0162). 추가 가능이면 소개 · 태그 · 첫 말 · Start chatting, 잠김이면 만날 회차 · 안내 줄과
 * (먼저 만나기 제안이 있을 때만) Chat now. 막 탭 · Not now · 끌어내림 · 시스템 뒤로가기는 모두 `onClose`입니다.
 */
export function SuggestedFriendSheet({
  model,
  now,
  voiceSampleUrl = null,
  romanization = "hidden",
  onStart,
  onEarly,
  onClose,
}: SuggestedFriendSheetProps): ReactNode {
  const ui = useUiCopy();
  const copy = ui.messengerChat.suggested;
  const { character, offer } = model;
  const locked = model.status === "locked";
  // 첫 말 칸 — 견본 대본이 있으면 대본(로마자는 스위치), 없으면 첫 말(ADR-0198 D2). 잠기면 없음.
  const line = locked
    ? null
    : sheetLineOf(character, copy.language, romanization, ui.readAloud.pronunciation);
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
  useLayerBack(onClose);

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
            {!locked && (character.voiceSamplePath ?? null) !== null ? (
              <ProfileVoiceButton
                key={character.id}
                characterId={character.id}
                name={character.name}
                url={voiceSampleUrl}
              />
            ) : null}
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
            {line === null ? null : (
              <view className="suggested-sheet-opening" data-testid={ids.sheetOpening}>
                <ChatTextBubble
                  direction="incoming"
                  speaker={character.name}
                  message={line.ko}
                  translation={"translation" in line.lines ? line.lines.translation : null}
                  {...("annotation" in line.lines ? { annotation: line.lines.annotation } : {})}
                />
              </view>
            )}
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
          {!locked ? (
            <view data-testid={ids.sheetStart}>
              <Button
                label={copy.startChatting}
                variant="brand"
                size="xl"
                width="fill"
                bindtap={onStart}
              />
            </view>
          ) : offer === null ? null : (
            <view
              className="suggested-sheet-early"
              data-testid={ids.sheetEarly}
              flatten={false}
              accessibility-element={true}
              accessibility-traits="button"
              accessibility-enable-tap={true}
              accessibility-label={earlyLabel(offer, now, copy)}
              bindtap={onEarly}
            >
              <Button
                label={copy.chatNow(offer.price)}
                variant="brand"
                size="xl"
                width="fill"
                icon={coinIcon}
                iconPosition="leading"
              />
              <text className="suggested-sheet-early-note">
                {copy.launchSpecial(character.name)}
              </text>
              <view
                className="suggested-sheet-limited"
                data-testid={ids.sheetLimited}
                accessibility-elements-hidden={true}
              >
                <text className="suggested-tag-text">{limitedText(offer, now, copy)}</text>
              </view>
            </view>
          )}
          <view data-testid={ids.sheetLater}>
            <Button label={copy.notNow} variant="text" size="l" width="fill" bindtap={onClose} />
          </view>
        </view>
      </view>
    </view>
  );
}
