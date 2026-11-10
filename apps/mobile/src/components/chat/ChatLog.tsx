import { useEffect, useRef, useState } from "@lynx-js/react";
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

type ScrollDetail = { readonly detail: { readonly deltaY: number } };

// 스크롤이 멈춘 자리가 끝 근처인지 읽어 `onResult`로 알립니다(백그라운드). 못 읽으면 조용히 둡니다.
function readNearEnd(id: string, onResult: (near: boolean) => void): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${id}`)
      .invoke({
        method: "getScrollInfo",
        params: {},
        success: (info: { scrollY: number; scrollRange: number }) => {
          onResult(info.scrollRange - info.scrollY <= NEAR_END_PX);
        },
      })
      .exec();
  } catch {
    // 테스트 환경 · 요소 없음.
  }
}

// 대화 로그입니다 — 끝을 보고 있을 때만 말풍선이 늘 때(내용 높이) · followKey가 바뀔 때 끝으로 내립니다. 학습자가 위로 올려 읽는
// 중이면 입력 · 답장 · 사진 도착이 끌어내리지 않습니다(리뷰 #4). 위로 올림은 scroll의 deltaY < 0으로, 끝 근처 복귀는
// scrolltolower(lower-threshold)와 scrollend 때 읽은 위치로 알아 둡니다(iOS 바운스백의 음수 deltaY는 scrollend 읽기가 바로잡습니다).
export function ChatLog({ testId, followKey, onTap, children }: ChatLogProps): ReactNode {
  const [id] = useState(nextLogId);
  const nearEnd = useRef(true);
  // 움직임 줄이기에서는 부드러운 스크롤이 아니라 점프로 끝에 닿습니다(design 9절 · 접근성 M6).
  const smooth = !resolveReducedMotion(undefined, useMotion());

  const followEnd = () => {
    "background only";
    if (nearEnd.current) scrollToEnd(id, smooth);
  };

  useEffect(() => {
    if (followKey === undefined) return;
    const handle = setTimeout(() => {
      if (nearEnd.current) scrollToEnd(id, smooth);
    }, 16);
    return () => clearTimeout(handle);
  }, [followKey, id, smooth]);

  return (
    <scroll-view
      id={id}
      className="chat-log"
      data-testid={testId}
      scroll-orientation="vertical"
      scroll-bar-enable={false}
      lower-threshold={NEAR_END_PX}
      bindcontentsizechanged={followEnd}
      bindscroll={(event: ScrollDetail) => {
        "background only";
        if (event.detail.deltaY < 0) nearEnd.current = false;
      }}
      bindscrolltolower={() => {
        "background only";
        nearEnd.current = true;
      }}
      bindscrollend={() => {
        "background only";
        readNearEnd(id, (near) => {
          nearEnd.current = near;
        });
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
