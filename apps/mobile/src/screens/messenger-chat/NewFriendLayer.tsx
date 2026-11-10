import { useEffect, useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";

import { announce } from "../../lib/accessibility";
import { createKeyHaptic } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { restoreAccessibilityFocus } from "./chat-input-focus";
import { defaultTimers } from "./chat-fixture-room";
import { newFriendReducer, newFriendTimelineOf } from "./new-friend";
import type { NewFriendEvent, NewFriendPhase } from "./new-friend";
import { newFriendTestIds as ids } from "./new-friend.contract";
import type { NewFriendLayerProps } from "./new-friend.contract";
import { NewFriendSheet } from "./NewFriendSheet";

import "./new-friend.css";

/** 시트가 서거나 닫힌 뒤 한 프레임(16 ms)이 지나야 숨김이 풀려 초점을 받을 수 있습니다. */
const NEXT_FRAME_MS = 16;

/**
 * 결과 화면 위 층입니다. 마운트 `appearAfterMs` 뒤 입력 중 시트가 서고, `typingMs` 뒤 첫 메시지가 도착합니다(진동 한 번 · 낭독).
 * 시트가 보이는 동안 아래 결과 화면은 낭독에서 숨고, 시스템 뒤로가기 · 막 · Later · 끌어내림은 시트만 닫습니다.
 * 타이머는 주입 값을 매 단계 새로 읽습니다(첫 렌더의 값을 붙들지 않습니다).
 */
export function NewFriendLayer({
  model,
  onReply,
  timers,
  resultFocusId,
  children,
}: NewFriendLayerProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  const motion = useMotion();
  const timeline = newFriendTimelineOf(motion === "reduced" ? "reduced" : "standard");
  const [phase, send] = useReducer(
    (current: NewFriendPhase, event: NewFriendEvent) => newFriendReducer(current, event),
    "waiting" as NewFriendPhase,
  );

  const latest = useRef({ timers, timeline, copy, model, resultFocusId });
  // 타이머 · 효과가 렌더가 끝난 뒤 최신 값을 읽도록 ref에 둡니다(효과 의존성에 넣으면 값이 바뀔 때마다 타이머가 다시 걸립니다).
  // oxlint-disable-next-line react/immutability
  latest.current = { timers, timeline, copy, model, resultFocusId };

  // 단계마다 다음 사건을 거는 타이머 하나입니다. 단계가 바뀌거나 언마운트되면 걸린 것을 풉니다.
  useEffect(() => {
    if (phase !== "waiting" && phase !== "typing") return undefined;
    const clock = latest.current.timers ?? defaultTimers;
    const wait =
      phase === "waiting"
        ? latest.current.timeline.appearAfterMs
        : latest.current.timeline.typingMs;
    const handle = clock.setTimeout(() => {
      send(phase === "waiting" ? "appear" : "typed");
    }, wait);
    return () => {
      clock.clearTimeout(handle);
    };
  }, [phase]);

  // 입력 중이 서면 다음 프레임에 시트 머리로 접근성 초점을 보낸 뒤 낭독합니다(초점 → 낭독 순서 — 초점 이동이 낭독을 끊지 않게).
  // 첫 메시지가 서면 진동 한 번 + 낭독입니다(효과음 없음). 단계가 바뀔 때만 한 번이라 최신 값은 ref로 읽습니다.
  useEffect(() => {
    const { copy: words, model: friend } = latest.current;
    if (phase === "typing") {
      const clock = latest.current.timers ?? defaultTimers;
      const handle = clock.setTimeout(() => {
        restoreAccessibilityFocus(ids.title);
        announce(words.list.typing(friend.name));
      }, NEXT_FRAME_MS);
      return () => {
        clock.clearTimeout(handle);
      };
    }
    if (phase === "message") {
      createKeyHaptic()();
      announce(
        friend.opening.en === ""
          ? `${friend.name}: ${friend.opening.ko}`
          : `${friend.name}: ${friend.opening.ko}, ${friend.opening.en}`,
      );
    }
    return undefined;
  }, [phase]);

  // 닫히면(Later · 막 · 끌어내림 · 뒤로) 다음 프레임에 결과 화면 요소로 초점을 돌립니다 — 숨었던 요소에 있던 초점을 플랫폼에 맡기지 않습니다.
  const wasVisible = useRef(false);
  useEffect(() => {
    const visibleNow = phase === "typing" || phase === "message";
    const closedNow = wasVisible.current && phase === "closed";
    wasVisible.current = visibleNow;
    const target = latest.current.resultFocusId;
    if (!closedNow || target === undefined) return undefined;
    const clock = latest.current.timers ?? defaultTimers;
    const handle = clock.setTimeout(() => restoreAccessibilityFocus(target), NEXT_FRAME_MS);
    return () => {
      clock.clearTimeout(handle);
    };
  }, [phase]);

  const visible = phase === "typing" || phase === "message";
  const handleLater = (): void => {
    "background only";
    send("dismiss");
  };
  useLayerBack(visible ? handleLater : null);

  return (
    <view className="new-friend-layer">
      <view
        className="new-friend-result"
        accessibility-elements-hidden={visible ? true : undefined}
      >
        {children}
      </view>
      {visible ? (
        <NewFriendSheet
          model={model}
          phase={phase}
          timeline={timeline}
          onReply={onReply}
          onLater={handleLater}
        />
      ) : null}
    </view>
  );
}
