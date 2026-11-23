import { useEffect, useGlobalProps, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { announce } from "../../lib/accessibility";
import { restoreAccessibilityFocus } from "./chat-input-focus";
import { spokenOf, storyAgeOf, viewerStep } from "./friend-stories";
import { friendStoriesTestIds as ids, type StoryViewerProps } from "./friend-stories.contract";
import { localizedLine } from "./suggested-friends";
import {
  IconButton,
  StoryMeet,
  StoryProgress,
  StoryReplyBar,
  useAdvanceTimer,
  WordPill,
} from "./StoryViewerParts";

import "./story-viewer.css";

export { STORY_SHOW_MS } from "./StoryViewerParts";

/** 숨김이 풀린 다음 프레임에 초점을 보냅니다(16 ms — 대화방 겹침과 같은 값). */
const NEXT_FRAME_MS = 16;

/**
 * 스토리 보기(ADR-0178 D4, 시안 2 · 4번) — 목록 위 전체 화면 층. 칸 이동은 `viewerStep`, 경과는 `storyAgeOf`가 정하고 여기서는 그리기 ·
 * 6초 넘김 · 멈춤만 합니다. 내 친구 스토리는 답장 칩 · 답장 칸, 안 만난 친구는 소개 카드 · 추가 단추입니다. 시스템 뒤로 = 닫기.
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
  onSaveWord,
  onMeet,
  onClose,
  onSkip,
  covered = false,
}: StoryViewerProps): ReactNode {
  const copy = useUiCopy().messengerChat.stories;
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const [index, setIndex] = useState(Math.min(Math.max(0, start), items.length - 1));
  const [paused, setPaused] = useState(false);
  useLayerBack(() => onClose("back"));
  const item = items[index];

  const step = (action: "next" | "prev" | "tick") => {
    const next = viewerStep({ index, count: items.length }, action);
    if (next === "close") return onClose("completed");
    // 끝내는 탭은 건너뜀이 아닙니다(다 본 것) — 다음 장으로 넘긴 탭만 셉니다.
    if (action === "next") onSkip?.();
    setIndex(next.index);
  };
  // 모션 줄이기면 저절로 넘어가지 않습니다(넘김은 탭으로). 위에 시트가 덮으면 멈춥니다. 멈춤 단추는 낭독 순서 둘째(닫기 다음)이고
  // 안 만난 친구에도 섭니다(WCAG 2.2.1, 접근성 C1). 스크린리더 실행 여부로 자동 넘김을 끄는 것은 호스트 값이 생기면 더합니다.
  const running = !paused && !covered && !reducedMotion && item !== undefined;
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
    const line = spokenOf(copy.listSeparator, [
      copy.viewer.label(current.name),
      copy.viewer.progress(index + 1, items.length),
    ]);
    if (opened.current) announce(line);
    opened.current = true;
    const handle = setTimeout(() => restoreAccessibilityFocus(ids.name), NEXT_FRAME_MS);
    return () => clearTimeout(handle);
  }, [index]);

  if (item === undefined) return null;
  const { story, unmet } = item;
  const tap = (action: "next" | "prev") => () => {
    "background only";
    step(action);
  };

  return (
    <view
      className="story-viewer"
      data-testid={ids.viewer}
      data-statusbar={lightStatusBarIcons}
      data-motion={reducedMotion ? "reduced" : "standard"}
      event-through={false}
      accessibility-elements-hidden={covered}
    >
      {item.imageUrl === null ? null : (
        <image
          className="story-viewer-image"
          data-testid={ids.image}
          src={item.imageUrl}
          mode="aspectFill"
          accessibility-elements-hidden={true}
        />
      )}
      {/* 흰 글 · 아이콘이 밝은 사진 위에서도 읽히게 머리 줄 아래까지 고른 그늘(접근성 C2) — 인셋이 들어가 높이는 인라인입니다. */}
      <view
        className="story-viewer-shade-top"
        style={{ height: `${insets.top + 150}px` }}
        accessibility-elements-hidden={true}
      />
      <view className="story-viewer-shade-bottom" accessibility-elements-hidden={true} />

      {/* 낭독 순서 = 문서 순서: 닫기 · 멈춤 → 이름 · 진행 → 사진 · 한 줄 · 단어 → 답장 → 이전/다음(접근성 M1). 그리기는 층(z-index)으로 탭 자리가 아래. */}
      <view
        className="story-viewer-top"
        style={{
          paddingTop: `${insets.top + 8}px`,
          paddingLeft: `${insets.left + 10}px`,
          paddingRight: `${insets.right + 10}px`,
        }}
      >
        <view className="story-viewer-head">
          <IconButton
            testId={ids.close}
            icon={cross}
            label={copy.viewer.close}
            onTap={() => onClose("closed")}
          />
          <IconButton
            testId={ids.pause}
            icon={paused ? play : pause}
            label={paused ? copy.viewer.play : copy.viewer.pause}
            onTap={() => setPaused((value) => !value)}
          />
          <view className="story-viewer-spacer" />
          {unmet === null ? (
            <text
              className="story-viewer-age"
              data-testid={ids.age}
              accessibility-elements-hidden={true}
            >
              {copy.age(storyAgeOf(story.postedAt, now))}
            </text>
          ) : (
            <view className="story-viewer-new" accessibility-elements-hidden={true}>
              <text className="story-viewer-new-text">{copy.viewer.newFriend}</text>
            </view>
          )}
          <text
            className="story-viewer-name"
            id={ids.name}
            data-testid={ids.name}
            accessibility-element={true}
            accessibility-label={spokenOf(copy.listSeparator, [
              copy.viewer.label(item.name),
              copy.viewer.progress(index + 1, items.length),
            ])}
          >
            {item.name}
          </text>
          <view className="story-viewer-avatar" accessibility-elements-hidden={true}>
            <Avatar
              imageSource={item.avatarUrl ?? undefined}
              name={item.name}
              size="sm"
              accessibility="hidden"
            />
          </view>
        </view>
        <StoryProgress
          items={items}
          index={index}
          still={reducedMotion}
          stopped={paused || covered}
          label={copy.viewer.progress(index + 1, items.length)}
        />
      </view>

      <view
        className="story-viewer-bottom"
        style={{
          paddingBottom: `${insets.bottom + 16}px`,
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
          <view className="story-card">
            <text className="story-card-ko" data-testid={ids.line}>
              {story.line.ko}
            </text>
            {romanization && story.line.roman !== "" ? (
              <text className="story-card-roman" data-testid={ids.roman}>
                {story.line.roman}
              </text>
            ) : null}
            <text className="story-card-meaning" data-testid={ids.meaning}>
              {localizedLine(story.line.meaning, copy.language)}
            </text>
          </view>
          {unmet === null ? (
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
        {unmet === null ? (
          <StoryReplyBar item={item} copy={copy} onReply={(text) => onReply(item, text)} />
        ) : (
          <StoryMeet item={item} friend={unmet} copy={copy} onMeet={() => onMeet(item)} />
        )}
      </view>

      <view className="story-viewer-taps">
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
    </view>
  );
}
