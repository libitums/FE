import { useEffect, useGlobalProps, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { announce } from "../../lib/accessibility";
import { restoreAccessibilityFocus } from "./chat-input-focus";
import { spokenOf, viewerGroupOf } from "./friend-stories";
import { friendStoriesTestIds as ids, type StoryViewerProps } from "./friend-stories.contract";
import { sideFace, StoryFaceBackdrop, StoryFaceShell, StoryLineCard } from "./StoryCubeFace";
import {
  MyStoryFace,
  MyStoryMenu,
  MyStoryRepliesSheet,
  MyStoryViewerBottom,
} from "./MyStoryViewerBar";
import { StoryMeet, StoryProgress, useAdvanceTimer, WordPill } from "./StoryViewerParts";
import { StoryViewerHead } from "./StoryViewerHead";
import { StoryReplyArea, StoryViewerSent } from "./StoryReplyArea";
import { useViewerCube } from "./use-viewer-cube";
import { useStoryNavigation } from "./use-story-navigation";
import { useStoryViewerReply } from "./use-story-viewer-reply";
import { useStoryToastLink } from "./reply-toast-presence";

import "./story-viewer.css";

export { STORY_SHOW_MS } from "./StoryViewerParts";

/** 숨김이 풀린 다음 프레임에 초점을 보냅니다(16 ms — 대화방 겹침과 같은 값). */
const NEXT_FRAME_MS = 16;
/** 답장 묶음과 「Sent」 알림 층 사이 틈(면 안 아래 묶음의 gap과 같음, pt/dp). */
const REPLY_GAP = 12;

/**
 * 스토리 보기(ADR-0178 D4, 시안 2 · 4번) — 목록 위 전체 화면 층. 칸 이동은 `viewerStep`, 경과는 `storyAgeOf`가 정하고 여기서는 그리기 ·
 * 6초 넘김 · 멈춤만 합니다. 내 친구 스토리는 답장 칩 · 답장 칸, 안 만난 친구는 소개 카드 · 추가 단추(추가 가능만), 위 아바타는 프로필 시트입니다. 뒤로 = 닫기.
 * 이전(왼쪽 1/3) · 다음(나머지) 탭 자리는 화면 전체이고, 위 · 가운데 · 아래 조작은 문서 순서가 뒤라 그 위에 섭니다.
 */
export function StoryViewer({
  items,
  start,
  now,
  reducedMotion,
  romanization,
  words,
  onShown,
  onReply,
  onOpenChat,
  keyboardHeight,
  onKeyboardHeight,
  onSaveWord,
  onMeet,
  onProfile,
  onClose,
  onSkip,
  covered = false,
  mine,
}: StoryViewerProps): ReactNode {
  const copy = useUiCopy().messengerChat.stories;
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const nav = useStoryNavigation({ items, start, reducedMotion, onClose, onSkip });
  const { index, step } = nav;
  // 위 진행 막대 · 「Story i of n」은 지금 인물의 묶음만 셉니다(D4 개정).
  const group = viewerGroupOf(items, index);
  const groupLabel = copy.viewer.progress(group.at + 1, group.count);
  const [paused, setPaused] = useState(false);
  const [replyHeight, setReplyHeight] = useState(0);
  // 내 스토리 장(ADR-0194 개정 ⟨보기⟩) — 답 목록 시트 · ⋯ 메뉴가 열린 동안 멈춥니다.
  const [sheet, setSheet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reply = useStoryViewerReply({
    index,
    copy,
    covered,
    keyboardHeight,
    onReply,
    onKeyboardHeight,
  });
  // 인물 넘김 큐브(D4 개정 ⟨큐브⟩) — 옆 인물 면 · 쉬는 자리, 손가락은 메인 스레드가 따라갑니다. 답장을 쓰는 중엔 끌지 않습니다.
  const { cube, sides, rest } = useViewerCube(items, nav, reducedMotion, reply.typing);
  // 입력 중이면 뒤로 = 키보드 먼저 내림(D5 개정).
  useLayerBack(() => {
    if (!reply.dismissKeyboard()) onClose("back");
  });
  const item = items[index];

  // 모션 줄이기면 저절로 넘어가지 않습니다(넘김은 탭으로). 위에 시트가 덮으면 멈춥니다. 멈춤 단추는 낭독 순서 둘째(닫기 다음)이고
  // 안 만난 친구에도 섭니다(WCAG 2.2.1, 접근성 C1). 스크린리더 실행 여부로 자동 넘김을 끄는 것은 호스트 값이 생기면 더합니다.
  // 답장을 쓰는 중 · 보내는 중에도, 가로로 끄는 동안에도 멈춥니다(D5 · D4 개정). 보낸 뒤 「Sent」 알림 동안은 이어 갑니다(사용자 결정 2026-11-26).
  const held = useStoryToastLink(true); // 답장 도착 토스트가 머리 위에 떠 있는 동안 진행만 멈춤(ADR-0200)
  const stopped = paused || covered || held || reply.holding || nav.dragging || sheet || menuOpen;
  const running = !stopped && !reducedMotion && item !== undefined;
  useAdvanceTimer(index, running, () => step("tick"));

  // 장이 설 때마다 한 번(본 것 표시 · 이벤트) — 효과(배경 스레드)에서.
  const shownRef = useRef(onShown);
  shownRef.current = onShown;
  useEffect(() => {
    const current = items[index];
    if (current !== undefined) shownRef.current(current);
  }, [index]);
  // 열 때는 이름(「<이름>'s story, Story i of n」)으로 초점을 보내고, 장이 바뀌면 새 장을 알립니다(접근성 M3).
  const opened = useRef(false);
  useEffect(() => {
    const current = items[index];
    if (current === undefined) return undefined;
    const title = current.mine === undefined ? copy.viewer.label(current.name) : current.name;
    const line = spokenOf(copy.listSeparator, [title, groupLabel]);
    if (opened.current) announce(line);
    opened.current = true;
    const handle = setTimeout(() => restoreAccessibilityFocus(ids.name), NEXT_FRAME_MS);
    return () => clearTimeout(handle);
  }, [index]);

  if (item === undefined) return null;
  const { story, unmet } = item;
  const my = mine === undefined || item.mine === undefined ? null : { mine, story: item.mine };
  const full = my?.story.kind === "text" || my?.story.kind === "photo";
  const tap = (action: "next" | "prev") => () => {
    "background only";
    // 입력 중 밖을 누르면 키보드만 내립니다(넘기지 않음). 방금 가로로 넘긴 손가락의 탭도 넘기지 않습니다.
    if (nav.consumeSwipe() || reply.dismissKeyboard()) return;
    step(action);
  };

  const side = (role: "prev" | "next"): ReactNode =>
    sideFace({
      role,
      at: sides[role],
      items,
      style: rest[role],
      faceRef: role === "prev" ? cube.prevRef : cube.nextRef,
      insets,
      romanization,
      copy,
    });

  return (
    <view
      className="story-viewer"
      data-testid={ids.viewer}
      data-statusbar={lightStatusBarIcons}
      data-motion={reducedMotion ? "reduced" : "standard"}
      data-turn={nav.turn?.direction ?? "none"}
      event-through={false}
      accessibility-elements-hidden={covered || sheet}
    >
      {side("prev")}
      <StoryFaceShell
        key={`face-${group.start}`}
        role="current"
        style={rest.current}
        faceRef={cube.currentRef}
        cube={cube}
      >
        {full && my !== null ? (
          <MyStoryFace story={my.story} insetTop={insets.top} photoUrl={my.mine.photoUrl} />
        ) : (
          <StoryFaceBackdrop item={item} insetTop={insets.top} marked={true} />
        )}

        {/* 낭독 순서 = 문서 순서: 닫기 · 멈춤 → 이름 → 프로필(아바타) → 진행 → 사진 · 한 줄 · 단어 → 답장 → 이전/다음(접근성 M1). 그리기는 층(z-index)으로 탭 자리가 아래. */}
        <view
          className="story-viewer-top"
          style={{
            paddingTop: `${insets.top + 8}px`,
            paddingLeft: `${insets.left + 10}px`,
            paddingRight: `${insets.right + 10}px`,
          }}
        >
          <StoryViewerHead
            item={item}
            now={now}
            copy={copy}
            groupLabel={groupLabel}
            paused={paused}
            onPause={() => setPaused((value) => !value)}
            onClose={() => onClose("closed")}
            onProfile={() => onProfile(item)}
            {...(my === null ? {} : { menu: <MyStoryMenu onTap={() => setMenuOpen((o) => !o)} /> })}
          />
          <StoryProgress
            items={items.slice(group.start, group.start + group.count)}
            index={group.at}
            still={reducedMotion}
            stopped={stopped}
            label={groupLabel}
          />
          {my !== null && menuOpen ? (
            <MyStoryMenu
              story={my.story}
              onTap={() => {
                setMenuOpen(false);
                my.mine.onDelete(my.story);
              }}
            />
          ) : null}
        </view>

        <view
          className="story-viewer-bottom"
          data-testid={ids.replyBottom}
          style={{
            paddingBottom: `${reply.bottomPadding(insets.bottom)}px`,
            paddingLeft: `${insets.left + 16}px`,
            paddingRight: `${insets.right + 16}px`,
          }}
        >
          <view className="story-viewer-middle">
            {item.imageUrl === null ? null : (
              <view
                className="story-viewer-photo-label"
                accessibility-element={true}
                accessibility-label={copy.viewer.photoLabel(item.name)}
              />
            )}
            {full ? null : (
              <StoryLineCard item={item} romanization={romanization} copy={copy} marked={true} />
            )}
            {unmet === null && my === null ? (
              // 장마다 새로 — 저장 표시(`saved`)가 다음 장으로 넘어가지 않게.
              <WordPill
                key={item.story.id}
                item={item}
                words={words}
                copy={copy}
                onSaved={() => onSaveWord(item)}
              />
            ) : null}
          </view>
          {/* 높이를 재어 보기 단위 「Sent」 알림을 이 묶음 바로 위에 둡니다. */}
          <view
            className="story-viewer-reply-group"
            bindlayoutchange={(event: { detail?: { height?: unknown } }) => {
              "background only";
              const height = event.detail?.height;
              if (typeof height === "number") setReplyHeight(height);
            }}
          >
            {my !== null ? (
              <MyStoryViewerBottom {...my} now={now} onReplies={() => setSheet(true)} />
            ) : unmet === null ? (
              <StoryReplyArea item={item} copy={copy} reply={reply} />
            ) : (
              <StoryMeet item={item} friend={unmet} copy={copy} onMeet={() => onMeet(item)} />
            )}
          </view>
        </view>

        <view className="story-viewer-taps" data-testid={ids.taps}>
          {(["prev", "next"] as const).map((action) => (
            <view
              key={action}
              className={`story-viewer-tap-${action}`}
              data-testid={action === "prev" ? ids.previous : ids.next}
              accessibility-element={true}
              accessibility-label={action === "prev" ? copy.viewer.previous : copy.viewer.next}
              accessibility-traits="button"
              accessibility-enable-tap={true}
              flatten={false}
              bindtap={tap(action)}
            />
          ))}
        </view>
      </StoryFaceShell>
      {side("next")}
      {sheet && my !== null ? (
        <MyStoryRepliesSheet {...my} now={now} onClose={() => setSheet(false)} />
      ) : null}
      {/* 보낸 뒤 알림은 인물마다 새로 서는 면 밖, 보기 단위 층 — 장 · 인물 · 큐브 넘김에도 다시 그려지지 않습니다(사용자 결정 2026-11-26). */}
      <StoryViewerSent
        copy={copy}
        reply={reply}
        bottom={reply.bottomPadding(insets.bottom) + replyHeight + REPLY_GAP}
        sides={{ left: insets.left + 16, right: insets.right + 16 }}
        onOpenChat={onOpenChat}
      />
    </view>
  );
}
