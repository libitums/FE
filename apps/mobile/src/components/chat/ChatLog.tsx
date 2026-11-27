import { useCallback, useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import type { ChatLogPosition, ChatLogProps } from "./chat.contract";
import {
  ENTER_SETTLE_MS,
  farFromEnd,
  FOLLOW_STALE_MS,
  JUMP_RETRIES,
  JUMP_SETTLE_MS,
  NEAR_END_PX,
  REALIGN_RECHECK_MS,
  endDistance,
  realignOnShrink,
  smoothToEnd,
  type ScrollPosition,
} from "./chat-log-follow";
import { scrollLineIntoView, scrollToEnd } from "./chat-log-scroll";

import "./chat.css";

export { NEAR_END_PX } from "./chat-log-follow";

let logSequence = 0;

function nextLogId(): string {
  logSequence += 1;
  return `chat-log-${logSequence}`;
}

type ScrollDetail = { readonly detail: ScrollPosition & { readonly deltaY?: number } };
type LayoutDetail = { readonly detail: { readonly height?: number } };

// 대화 로그입니다 — 끝을 보고 있을 때만 말풍선이 늘 때(내용 높이) · 뷰포트가 줄 때(layoutchange) · followKey가 바뀔 때 끝으로
// 내립니다. 학습자가 위로 올려 읽는 중이면 입력 · 답장 · 사진 도착이 끌어내리지 않습니다(리뷰 #4). 내가 보낸 것(jumpKey가 바뀜)은
// 읽던 자리와 상관없이 늘 끝으로 내리고 다시 따라갑니다.
// 끝 근처인지는 **절대 위치**로 압니다 — 끝까지 남은 거리 = scrollHeight − scrollTop − 뷰포트 높이(layoutchange)(기기 F2). 값이
// 없을 때만 deltaY < 0(위로 올림) · scrolltolower(끝 근처 복귀)로 알아 둡니다. 우리가 시작한 부드러운 스크롤이 진행되는 동안의 중간
// 위치는 「멀다」로 읽지 않고, 그동안 온 끝 맞춤은 다시 시작하지 않고 묶어 두었다가 멈춘 뒤(scrollend) 한 번 더 맞춥니다(스트리밍).
// 방에 들어와 처음 맞출 때(기록 읽는 중 포함) · 남은 거리가 짧을 때 · 움직임 줄이기에서는 부드럽게 가지 않고 점프합니다.
export function ChatLog({
  testId,
  followKey,
  jumpKey,
  loading = false,
  holdKey,
  onPositionChange,
  onTap,
  reveal,
  children,
}: ChatLogProps): ReactNode {
  const [id] = useState(nextLogId);
  const nearEnd = useRef(true);
  const viewportHeight = useRef<number | null>(null);
  const position = useRef<ScrollPosition | null>(null);
  // 우리가 시작한 부드러운 스크롤이 진행 중인지 · 언제 시작했는지 · 그동안 끝 맞춤이 또 왔는지.
  const following = useRef(false);
  const followingSince = useRef(0);
  const queued = useRef(false);
  // 우리가 마지막으로 점프한 때 · 그 점프가 끝에 못 미쳐 다시 점프한 횟수 · 뷰포트가 준 뒤 한 번 더 맞출 타이머.
  const jumpedAt = useRef(Number.NEGATIVE_INFINITY);
  const retries = useRef(0);
  const recheck = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 첫 진입 — 기록을 읽는 동안과 그 뒤(방이 선 뒤) 잠시는 끝 맞춤이 점프입니다. 학습자가 스크롤하면 끝납니다.
  const userScrolled = useRef(false);
  const loadingNow = useRef(loading);
  const enterUntil = useRef<number | null>(null);
  useEffect(() => {
    loadingNow.current = loading;
    if (!loading) enterUntil.current = Date.now() + ENTER_SETTLE_MS;
  }, [loading]);
  const entering = (): boolean => {
    "background only";
    if (userScrolled.current) return false;
    if (loadingNow.current) return true;
    return enterUntil.current === null || Date.now() < enterUntil.current;
  };
  // 말풍선을 펼친 때(ms) — 그 직후의 내용 변화는 따라가지 않습니다. null = 펼침 없음.
  const heldAt = useRef<number | null>(null);
  // 움직임 줄이기에서는 부드러운 스크롤이 아니라 점프로 끝에 닿습니다(design 9절 · 접근성 M6).
  const motion = !resolveReducedMotion(undefined, useMotion());

  const remember = (detail: ScrollPosition) => {
    "background only";
    const last = position.current ?? {};
    position.current = {
      scrollTop: typeof detail.scrollTop === "number" ? detail.scrollTop : last.scrollTop,
      scrollHeight:
        typeof detail.scrollHeight === "number" ? detail.scrollHeight : last.scrollHeight,
    };
  };

  // 자리(끝 근처 · 한 화면 넘게 멂)가 바뀔 때만 알립니다(「새 메시지 ↓」 알약).
  const listener = useRef(onPositionChange);
  useEffect(() => {
    listener.current = onPositionChange;
  }, [onPositionChange]);
  const reported = useRef<ChatLogPosition>({ nearEnd: true, far: false });
  const report = useCallback(() => {
    "background only";
    const near = nearEnd.current;
    const viewport = viewportHeight.current;
    const far = !near && farFromEnd(endDistance(position.current, viewport), viewport);
    if (reported.current.nearEnd === near && reported.current.far === far) return;
    reported.current = { nearEnd: near, far };
    listener.current?.(reported.current);
  }, []);

  // 끝으로 내립니다. instant면 늘 점프(진행 중인 스크롤을 덮음), 아니면 진행 중인 부드러운 스크롤이 있으면 묶어 둡니다.
  const goEnd = useCallback(
    (instant = false, retry = false) => {
      "background only";
      nearEnd.current = true;
      report();
      const now = Date.now();
      if (!instant && following.current && now - followingSince.current < FOLLOW_STALE_MS) {
        queued.current = true;
        return;
      }
      const distance = endDistance(position.current, viewportHeight.current);
      const smooth = !instant && smoothToEnd({ motion, entering: entering(), distance });
      queued.current = false;
      following.current = smooth;
      followingSince.current = now;
      if (!smooth) jumpedAt.current = now;
      if (!retry) retries.current = 0;
      scrollToEnd(id, smooth);
    },
    [id, motion, report],
  );

  // 우리 점프가 아직 자리를 잡는 중인지 — 그동안의 먼 위치는 우리 점프의 것입니다.
  const settling = (): boolean => {
    "background only";
    return Date.now() - jumpedAt.current < JUMP_SETTLE_MS;
  };

  // 위치로 끝 근처인지 정합니다. 뷰포트 · 위치 값이 없으면 null(모름).
  const nearEndAt = (detail: ScrollPosition): boolean | null => {
    "background only";
    const distance = endDistance(detail, viewportHeight.current);
    return distance === null ? null : distance <= NEAR_END_PX;
  };

  const followEnd = (event: ScrollDetail) => {
    "background only";
    remember(event.detail);
    const held = heldAt.current;
    if (held !== null) {
      heldAt.current = null;
      if (Date.now() - held < FOLLOW_STALE_MS) {
        // 펼친 말풍선을 제자리에 둡니다 — 끝 근처인지만 위치로 다시 압니다.
        const near = nearEndAt(position.current ?? {});
        if (near !== null) nearEnd.current = near;
        report();
        return;
      }
    }
    if (nearEnd.current) goEnd();
  };

  // 보조 계기 — 키보드 칸이 바뀌면 끝 근처일 때 끝으로. 첫 계기는 뷰포트가 줄 때의 layoutchange입니다.
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
    const handle = setTimeout(() => goEnd(), 16);
    return () => clearTimeout(handle);
  }, [jumpKey, goEnd]);

  // 로그 가운데의 줄을 보입니다 — 끝 따라가기를 멈춰 그 줄이 도착 · 내용 변화로 밀려나지 않게(ADR-0146 개정 ⟨예시 대상⟩).
  const revealKey = reveal?.key;
  const revealLine = reveal?.lineId;
  useEffect(() => {
    if (revealKey === undefined || revealLine === undefined) return;
    nearEnd.current = following.current = queued.current = false;
    report();
    const handle = setTimeout(() => scrollLineIntoView(revealLine, motion), 16);
    return () => clearTimeout(handle);
  }, [revealKey, revealLine, motion, report]);

  useEffect(
    () => () => {
      if (recheck.current !== null) clearTimeout(recheck.current);
    },
    [],
  );

  const readScroll = (event: ScrollDetail): void => {
    "background only";
    remember(event.detail);
    const deltaY = event.detail.deltaY ?? 0;
    const near = nearEndAt(event.detail);
    if (deltaY < 0 && !settling()) userScrolled.current = true; // 학습자가 스크롤했다 — 첫 진입 점프는 끝
    if (near === null) {
      if (deltaY < 0) {
        nearEnd.current = false;
        following.current = false;
        queued.current = false;
      }
      return;
    }
    // 우리가 내리는 중 · 점프 직후에 내려가는 방향이면 중간 위치입니다 — 끝에서 멀어도 「떠났다」로 읽지 않습니다.
    if ((following.current || settling()) && !near && deltaY >= 0) return;
    if (near || deltaY < 0) following.current = false;
    if (deltaY < 0) queued.current = false;
    nearEnd.current = near;
  };

  const readScrollEnd = (event: ScrollDetail): void => {
    "background only";
    remember(event.detail);
    const ours = following.current || settling();
    following.current = false;
    const near = nearEndAt(event.detail);
    // 우리 스크롤이 끝에 못 미쳐 멈췄거나 그동안 끝 맞춤이 또 왔으면 한 번 더 — 이번엔 점프(횟수 상한, 되풀이 없음).
    if (ours && (queued.current || near === false) && retries.current < JUMP_RETRIES) {
      retries.current += 1;
      goEnd(true, true);
      return;
    }
    queued.current = false;
    if (near !== null) nearEnd.current = near;
  };

  const holdSeen = useRef(holdKey);
  useEffect(() => {
    if (holdSeen.current === holdKey) return;
    holdSeen.current = holdKey;
    heldAt.current = Date.now();
  }, [holdKey]);

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
        const height = event.detail.height;
        if (typeof height !== "number") return;
        const previous = viewportHeight.current;
        viewportHeight.current = height;
        // 띠 · 판 · 여러 줄 입력 · 키보드로 로그가 줄면 마지막 말이 잘리지 않게 바로 끝에 다시 맞춥니다.
        // 스크롤 범위가 늦게 바뀌면 첫 점프가 옛 끝에 막히므로 잠시 뒤 한 번 더 맞춥니다.
        if (!realignOnShrink(previous, height, nearEnd.current)) return;
        goEnd(true);
        if (recheck.current !== null) clearTimeout(recheck.current);
        recheck.current = setTimeout(() => {
          recheck.current = null;
          if (nearEnd.current) goEnd(true, true);
        }, REALIGN_RECHECK_MS);
      }}
      bindscroll={(event: ScrollDetail) => {
        "background only";
        readScroll(event);
        report();
      }}
      bindscrolltolower={() => {
        "background only";
        nearEnd.current = true;
        report();
      }}
      bindscrollend={(event: ScrollDetail) => {
        "background only";
        readScrollEnd(event);
        report();
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
