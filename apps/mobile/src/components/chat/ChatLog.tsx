import { useCallback, useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import type { ChatLogProps } from "./chat.contract";

import "./chat.css";

let logSequence = 0;

function nextLogId(): string {
  logSequence += 1;
  return `chat-log-${logSequence}`;
}

// 다음 프레임에 대화 끝으로 내립니다(백그라운드). 못 옮기면 조용히 둡니다.
function scrollToEnd(id: string, smooth: boolean): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${id}`)
      .invoke({ method: "scrollTo", params: { offset: 1_000_000, smooth } })
      .exec();
  } catch {
    // 테스트 환경 · 요소 없음 — 끝 맞춤은 부가 동작입니다.
  }
}

/** 끝에서 이만큼(px) 안이면 「끝을 보고 있다」고 봅니다. */
export const NEAR_END_PX = 48;

type ScrollDetail = {
  readonly detail: {
    readonly deltaY?: number;
    readonly scrollTop?: number;
    readonly scrollHeight?: number;
  };
};
type LayoutDetail = { readonly detail: { readonly height?: number } };

// 대화 로그입니다 — 끝을 보고 있을 때만 말풍선이 늘 때(내용 높이) · followKey가 바뀔 때 끝으로 내립니다. 학습자가 위로 올려 읽는
// 중이면 입력 · 답장 · 사진 도착이 끌어내리지 않습니다(리뷰 #4). 내가 보낸 말(jumpKey가 바뀜)은 읽던 자리와 상관없이 늘 끝으로
// 내리고 다시 따라갑니다.
// 끝 근처인지는 **절대 위치**로 압니다 — 끝까지 남은 거리 = scrollHeight − scrollTop − 뷰포트 높이(layoutchange). getScrollInfo의
// scrollRange는 기기에서 내용 전체 높이로 보여 「끝에서 멀다」로 굳어 따라가지 않았습니다(기기 F2). 값이 없을 때만 deltaY < 0(위로
// 올림) · scrolltolower(끝 근처 복귀)로 알아 둡니다. 우리가 시작한 스크롤이 진행되는 동안의 중간 위치는 「멀다」로 읽지 않습니다.
export function ChatLog({ testId, followKey, jumpKey, onTap, children }: ChatLogProps): ReactNode {
  const [id] = useState(nextLogId);
  const nearEnd = useRef(true);
  const viewportHeight = useRef<number | null>(null);
  const following = useRef(false);
  // 움직임 줄이기에서는 부드러운 스크롤이 아니라 점프로 끝에 닿습니다(design 9절 · 접근성 M6).
  const smooth = !resolveReducedMotion(undefined, useMotion());

  const goEnd = useCallback(() => {
    "background only";
    nearEnd.current = true;
    following.current = true;
    scrollToEnd(id, smooth);
  }, [id, smooth]);

  // 위치로 끝 근처인지 정합니다. 뷰포트 · 위치 값이 없으면 null(모름).
  const nearEndAt = (detail: ScrollDetail["detail"]): boolean | null => {
    "background only";
    const viewport = viewportHeight.current;
    if (viewport === null) return null;
    if (typeof detail.scrollTop !== "number" || typeof detail.scrollHeight !== "number") {
      return null;
    }
    return detail.scrollHeight - detail.scrollTop - viewport <= NEAR_END_PX;
  };

  const followEnd = () => {
    "background only";
    if (nearEnd.current) goEnd();
  };

  useEffect(() => {
    if (followKey === undefined) return;
    const handle = setTimeout(() => {
      if (nearEnd.current) goEnd();
    }, 16);
    return () => clearTimeout(handle);
  }, [followKey, goEnd]);

  useEffect(() => {
    if (jumpKey === undefined) return;
    nearEnd.current = true;
    const handle = setTimeout(goEnd, 16);
    return () => clearTimeout(handle);
  }, [jumpKey, goEnd]);

  return (
    <scroll-view
      id={id}
      className="chat-log"
      data-testid={testId}
      scroll-orientation="vertical"
      scroll-bar-enable={false}
      lower-threshold={NEAR_END_PX}
      bindcontentsizechanged={followEnd}
      bindlayoutchange={(event: LayoutDetail) => {
        "background only";
        if (typeof event.detail.height === "number") viewportHeight.current = event.detail.height;
      }}
      bindscroll={(event: ScrollDetail) => {
        "background only";
        const deltaY = event.detail.deltaY ?? 0;
        const near = nearEndAt(event.detail);
        if (near === null) {
          if (deltaY < 0) {
            nearEnd.current = false;
            following.current = false;
          }
          return;
        }
        // 우리가 내리는 중에 내려가는 방향이면 중간 위치입니다 — 끝에서 멀어도 「떠났다」로 읽지 않습니다.
        if (following.current && !near && deltaY >= 0) return;
        if (near || deltaY < 0) following.current = false;
        nearEnd.current = near;
      }}
      bindscrolltolower={() => {
        "background only";
        nearEnd.current = true;
      }}
      bindscrollend={(event: ScrollDetail) => {
        "background only";
        following.current = false;
        const near = nearEndAt(event.detail);
        if (near !== null) nearEnd.current = near;
      }}
      bindtap={
        onTap === undefined
          ? undefined
          : () => {
              "background only";
              onTap();
            }
      }
    >
      <view className="chat-log-inner">{children}</view>
    </scroll-view>
  );
}
