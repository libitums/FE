import type { ReactNode } from "@lynx-js/react";

import { Overlay } from "@libitums/ui-lynx/overlay";

import { keyboardDockBodyStyle, type KeyboardDockEdges } from "../../lib/keyboard-dock";
import { useUiCopy } from "../../lib/ui-copy";
import type { ComposerKeyboard } from "./keyboard-plan";
import { KeyboardToggleRow } from "./KeyboardToggleRow";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { keyboardOfStage, type GuideStep, type KeyboardGuideStage } from "./messenger-guide";
import { GuideBubble, GuideButton } from "./MessengerGuide";

import "./messenger-guide.css";

export type KeyboardGuideLayerProps = {
  readonly steps: readonly GuideStep[];
  readonly index: number;
  readonly stage: KeyboardGuideStage;
  readonly name: string;
  readonly avatarUrl: string | null;
  /** 안내를 이미 본 사람에게 이 단계만 뜬 것 — 단계 수 대신 「New」. */
  readonly sampleOnly: boolean;
  /** 키보드 자리 높이(독의 `KeyboardSlot`과 같은 값) — 토글 줄이 이만큼 위에 섭니다. */
  readonly slotHeight: number;
  readonly edges: KeyboardDockEdges;
  readonly onNext: () => void;
  readonly onSelect: (mode: ComposerKeyboard) => void;
};

// 방 안내의 키보드 두 갈래 단계(ADR-0190, 시안 「채팅 두 언어 안내」 1). 방 화면 전체에 겹치는 세 칸입니다 — 위(머리 · 로그 · 기능 줄 ·
// 입력 줄을 덮는 막 + 말풍선) · 가운데(토글 줄 — 같은 `KeyboardToggleRow`를 막 없이 다시 그려 밝게, 눌러도 바뀜) · 아래(키보드 자리와
// 같은 높이). 원본 토글 줄의 위치를 재지 않습니다 — 아래 칸이 자리 높이를, 가운데 칸이 같은 부품의 같은 높이를 가져 원본과 겹칩니다
// (ADR-0139 D2의 복사본 줄과 같은 방식). 키보드 높이가 바뀌면 자리 높이를 따라 말풍선 · 토글이 함께 움직입니다.
// 휴대폰 키보드 화면에서 아래 칸은 막이 없습니다 — 시스템 키보드는 앱이 덮을 수 없어 막은 키보드 위에서 끝납니다.
export function KeyboardGuideLayer({
  steps,
  index,
  stage,
  name,
  avatarUrl,
  sampleOnly,
  slotHeight,
  edges,
  onNext,
  onSelect,
}: KeyboardGuideLayerProps): ReactNode {
  const copy = useUiCopy().messengerChat.guide;
  const mode = keyboardOfStage(stage);
  const lines = copy.keyboard[stage];
  const last = stage === "hangul" && index >= steps.length - 1;
  const sides = keyboardDockBodyStyle(edges, "keyboard");
  const tail = (
    <view
      className="messenger-guide-tail messenger-guide-tail-down"
      data-testid={ids.guideTail}
      data-target={mode}
    />
  );
  // 뒤로가기는 `useGuideKeyboard`가 삼킵니다 — 방의 「열린 키보드 접기」보다 위에 서야 해서 방 훅 뒤에 등록합니다.
  return (
    <view
      className="messenger-guide-keyboard"
      data-testid={ids.guideCoach}
      data-step="keyboard"
      data-stage={stage}
      flatten={false}
      accessibility-exclusive-focus={true}
      catchtap={() => {
        "background only";
        onNext();
      }}
    >
      <view className="messenger-guide-keyboard-top">
        <Overlay scope="area" />
        <view className="messenger-guide-room-body" style={sides}>
          <GuideBubble
            avatarUrl={avatarUrl}
            title={name}
            body={lines.title}
            detail={lines.body}
            step={sampleOnly ? copy.newTag : copy.stepOf(index + 1, steps.length)}
          >
            <GuideButton
              label={last ? copy.done : copy.next}
              testId={ids.guideCoachNext}
              primary={true}
              onTap={onNext}
            />
          </GuideBubble>
          {/* 꼬리는 토글의 두 칸(Hangul keys · Phone keyboard)과 같은 두 몫 가운데 가리키는 칸 쪽에 섭니다. */}
          <view className="messenger-guide-keyboard-tails">
            <view className="messenger-guide-keyboard-half">
              {mode === "learning" ? tail : null}
            </view>
            <view className="messenger-guide-keyboard-half">{mode === "phone" ? tail : null}</view>
          </view>
        </view>
      </view>
      {/* 토글을 누른 탭이 겹침의 「다음」으로 번지지 않게 여기서 멈춥니다. */}
      <view
        style={sides}
        catchtap={() => {
          "background only";
        }}
      >
        <KeyboardToggleRow mode={mode} onSelect={onSelect} />
      </view>
      <view
        className="messenger-guide-keyboard-slot"
        data-testid={ids.guideKeyboardSlot}
        data-height={String(slotHeight)}
        data-dim={stage === "hangul" ? "true" : "false"}
        style={{ height: `${slotHeight}px` }}
      >
        {stage === "hangul" ? <Overlay scope="area" /> : null}
      </view>
    </view>
  );
}
