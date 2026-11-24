import type { ReactNode } from "@lynx-js/react";

import type { KeyboardDockEdges } from "../../lib/keyboard-dock";
import type { ChatThread } from "./chat-source.contract";
import { KeyboardGuideLayer } from "./KeyboardGuideLayer";
import { MessengerRoomGuide } from "./MessengerGuide";
import type { RoomGuide } from "./use-room-guide";

// 방 화면이 세우는 안내 두 자리입니다. 코치마크(전구 · 예시 단계)는 머리 · 로그 영역 안에, 키보드 단계(ADR-0190)는 방 화면 전체에 겹칩니다.

type Props = { readonly guide: RoomGuide; readonly thread: ChatThread };

/** 머리 · 로그 영역의 코치마크 — 키보드 단계는 여기서 그리지 않습니다. */
export function RoomCoach({ guide, thread }: Props): ReactNode {
  if (guide.step === null || guide.step === "keyboard" || thread.server === null) return null;
  return (
    <MessengerRoomGuide
      steps={guide.steps}
      index={guide.index}
      name={thread.counterpart.name}
      avatarUrl={thread.counterpart.avatarUrl}
      onNext={guide.next}
      sampleOnly={guide.sampleOnly}
    />
  );
}

/** 키보드 단계 겹침 — 키보드 자리가 열린 뒤에 섭니다(토글 줄은 자리가 열려야 섭니다). */
export function RoomKeyboardGuide({
  guide,
  thread,
  edges,
  slotHeight,
  slotOpen,
}: Props & {
  readonly edges: KeyboardDockEdges;
  readonly slotHeight: number;
  readonly slotOpen: boolean;
}): ReactNode {
  if (guide.step !== "keyboard" || !slotOpen || thread.server === null) return null;
  return (
    <KeyboardGuideLayer
      steps={guide.steps}
      index={guide.index}
      stage={guide.keyboardStage}
      name={thread.counterpart.name}
      avatarUrl={thread.counterpart.avatarUrl}
      sampleOnly={guide.sampleOnly}
      slotHeight={slotHeight}
      edges={edges}
      onNext={guide.next}
      onSelect={guide.selectKeyboard}
    />
  );
}
