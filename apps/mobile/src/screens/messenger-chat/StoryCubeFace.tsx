// 스토리 보기의 큐브 면(ADR-0178 D4 개정 ⟨큐브⟩) — 면 껍데기(변환 · 그늘), 그림 층, 한 줄 카드, 옆 인물 면(미리보기).
// 옆 인물 면은 가로로 끄는 동안 · 인물 전환이 도는 동안에만 보입니다 — 그림 · 얼굴 · 이름 · 카드만 그리고 조작 · 낭독은 없습니다.

import type { ReactNode } from "@lynx-js/react";
import type { RefObject } from "@lynx-js/react";
import type { MainThread } from "@lynx-js/types";

import { Avatar } from "@libitums/ui-lynx/avatar";

import type { SafeAreaInsets } from "../../lib/safe-area";
import { viewerGroupOf } from "./friend-stories";
import {
  friendStoriesTestIds as ids,
  type FriendStoriesCopy,
  type StoryViewerItem,
} from "./friend-stories.contract";
import type { CubeFaceStyle } from "./story-cube";
import { localizedLine } from "./suggested-friends";

export type StoryFaceRole = "prev" | "current" | "next";

/** 큐브 면 하나 — 변환은 쉬는 자리(`style`)에서 시작하고 손가락 · 전환은 메인 스레드(`faceRef`)가 옮깁니다. 그늘은 맨 위, 손을 받지 않습니다. */
export function StoryFaceShell({
  role,
  style,
  faceRef,
  children,
}: {
  readonly role: StoryFaceRole;
  readonly style: CubeFaceStyle;
  readonly faceRef: RefObject<MainThread.Element>;
  readonly children: ReactNode;
}): ReactNode {
  const side = role !== "current";
  return (
    <view
      className="story-face"
      data-testid={ids.face(role)}
      data-face={role}
      main-thread:ref={faceRef}
      style={{
        transform: style.transform,
        transformOrigin: style.transformOrigin,
        opacity: style.opacity,
      }}
      accessibility-elements-hidden={side ? true : undefined}
      user-interaction-enabled={side ? false : undefined}
    >
      {children}
      <view
        className="story-face-shade"
        style={{ opacity: style.shade }}
        user-interaction-enabled={false}
        accessibility-elements-hidden={true}
      />
    </view>
  );
}

/** 그림 · 위아래 그늘 — 흰 글 · 아이콘이 밝은 사진 위에서도 읽히게(접근성 C2). 위 그늘 높이는 인셋을 더해 인라인. */
export function StoryFaceBackdrop({
  item,
  insetTop,
  marked,
}: {
  readonly item: StoryViewerItem;
  readonly insetTop: number;
  /** 지금 면만 test id를 답니다(옆 면과 겹치지 않게). */
  readonly marked: boolean;
}): ReactNode {
  return (
    <>
      <view className="story-viewer-content" accessibility-elements-hidden={true}>
        {item.imageUrl === null ? null : (
          <image
            className="story-viewer-image"
            data-testid={marked ? ids.image : undefined}
            src={item.imageUrl}
            mode="aspectFill"
            accessibility-elements-hidden={true}
          />
        )}
      </view>
      <view
        className="story-viewer-shade-top"
        style={{ height: `${insetTop + 150}px` }}
        accessibility-elements-hidden={true}
      />
      <view className="story-viewer-shade-bottom" accessibility-elements-hidden={true} />
    </>
  );
}

/** 흰 한 줄 카드 — 한국어 · 로마자(켜져 있으면) · 뜻. */
export function StoryLineCard({
  item,
  romanization,
  copy,
  marked,
}: {
  readonly item: StoryViewerItem;
  readonly romanization: boolean;
  readonly copy: FriendStoriesCopy;
  readonly marked: boolean;
}): ReactNode {
  const { line } = item.story;
  return (
    <view className="story-card">
      <text className="story-card-ko" data-testid={marked ? ids.line : undefined}>
        {line.ko}
      </text>
      {romanization && line.roman !== "" ? (
        <text className="story-card-roman" data-testid={marked ? ids.roman : undefined}>
          {line.roman}
        </text>
      ) : null}
      <text className="story-card-meaning" data-testid={marked ? ids.meaning : undefined}>
        {localizedLine(line.meaning, copy.language)}
      </text>
    </view>
  );
}

/**
 * 옆 인물 면의 속 — 그림 · 얼굴 · 이름 · 카드. 경과 · 진행 막대 · 답장 칸 모양은 번들 천장(ADR-0149) 때문에 그리지 않습니다 — 넘어가면 지금 면이 곧 그립니다.
 */
export function StoryFacePreview({
  item,
  insets,
  romanization,
  copy,
}: {
  readonly item: StoryViewerItem;
  readonly insets: SafeAreaInsets;
  readonly romanization: boolean;
  readonly copy: FriendStoriesCopy;
}): ReactNode {
  return (
    <>
      <StoryFaceBackdrop item={item} insetTop={insets.top} marked={false} />
      <view
        className="story-viewer-top"
        style={{
          paddingTop: `${insets.top + 8}px`,
          paddingLeft: `${insets.left + 10}px`,
          paddingRight: `${insets.right + 10}px`,
        }}
      >
        <view className="story-viewer-head story-face-head">
          <view className="story-viewer-avatar">
            <Avatar
              imageSource={item.avatarUrl ?? undefined}
              name={item.name}
              size="sm"
              accessibility="hidden"
            />
          </view>
          <text className="story-viewer-name">{item.name}</text>
        </view>
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
          <StoryLineCard item={item} romanization={romanization} copy={copy} marked={false} />
        </view>
      </view>
    </>
  );
}

/**
 * 옆 인물 면(셸 + 미리보기) — 인물마다 같은 key(`face-<묶음 시작>`)라 넘어가면 그 면이 그대로 지금 면이 되고, 메인 스레드가 옮긴 자리가 이어집니다.
 * 컴포넌트가 아니라 셸 요소를 돌려줍니다 — 지금 면과 같은 요소 종류여야 역할이 바뀌어도 새로 서지 않습니다.
 */
export function sideFace({
  role,
  at,
  items,
  style,
  faceRef,
  insets,
  romanization,
  copy,
}: {
  readonly role: "prev" | "next";
  readonly at: number | null;
  readonly items: readonly StoryViewerItem[];
  readonly style: CubeFaceStyle;
  readonly faceRef: RefObject<MainThread.Element>;
  readonly insets: SafeAreaInsets;
  readonly romanization: boolean;
  readonly copy: FriendStoriesCopy;
}): ReactNode {
  const shown = at === null ? undefined : items[at];
  if (at === null || shown === undefined) return null;
  const group = viewerGroupOf(items, at);
  return (
    <StoryFaceShell key={`face-${group.start}`} role={role} style={style} faceRef={faceRef}>
      <StoryFacePreview item={shown} insets={insets} romanization={romanization} copy={copy} />
    </StoryFaceShell>
  );
}
