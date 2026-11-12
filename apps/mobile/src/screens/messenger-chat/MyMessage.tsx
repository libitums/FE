import type { ReactNode } from "@lynx-js/react";

import internet from "@libitums/icons/lynx/internet";
import pencil from "@libitums/icons/lynx/pencil";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { correctionSegmentsOf } from "./correction-segments";
import {
  myMessageTestIds as ids,
  type FixToolButtonProps,
  type MeaningToolButtonProps,
  type MyMessageBubbleProps,
  type MyMessageMeaningLinesProps,
  type MyMessageRowProps,
  type MyMessageSkeletonProps,
  type MyMessageStackProps,
  type MyMessageToolsProps,
  type MyMotion,
} from "./my-message.contract";
import { CorrectionCard } from "./CorrectionCard";
import { myBubbleLabelOf } from "./my-message-state";

import "./my-message.css";

// 내 말풍선 부품(compound)입니다(messenger-chat-1-5 spec §6.1). 보이는 32 → 터치 40 × 44(위아래 6 · 좌우 4)이고,
// 좌우는 사이 간격 8의 절반이라 이웃 단추와 겹치지 않습니다. 화면 지역 상수라 토큰이 없습니다.
// 도구 단추의 탭은 catchtap입니다 — 로그의 탭(열린 키보드 접기)까지 올라가 키보드가 함께 접히지 않게 막습니다(접근성 M7).
const SLOP_ICON = { top: "6px", bottom: "6px", left: "4px", right: "4px" } as const;

const stillClass = (motion: MyMotion): string =>
  motion === "reduced" ? " messenger-chat-skeleton-still" : "";

function Stack({ children }: MyMessageStackProps): ReactNode {
  return (
    <view className="my-message-stack" data-testid={ids.stack}>
      {children}
    </view>
  );
}

function Bubble({ ko, label, view, children }: MyMessageBubbleProps): ReactNode {
  return (
    <view
      className="my-message-bubble"
      data-testid={ids.bubble}
      data-view={view}
      accessibility-element={true}
      accessibility-label={label}
    >
      <text className="my-message-ko">{ko}</text>
      {children}
    </view>
  );
}

function MeaningLines({ meaning }: MyMessageMeaningLinesProps): ReactNode {
  return (
    <view className="my-message-meaning" data-testid={ids.meaning}>
      <view className="my-message-divider" accessibility-elements-hidden={true} />
      <text className="my-message-roman" data-testid={ids.meaningRoman}>
        {meaning.romanization}
      </text>
      <text className="my-message-meaning-text" data-testid={ids.meaningText}>
        {meaning.meaning}
      </text>
    </view>
  );
}

// 뜻 스켈레톤은 말풍선 접근성 요소 안에 있어 따로 닿지 않습니다 — 낭독에서 숨기고 말풍선 라벨이 불러오는 중이라고 전합니다(접근성 M6).
function MeaningSkeleton({ motion }: MyMessageSkeletonProps): ReactNode {
  return (
    <view
      className={`my-message-skeleton${stillClass(motion)}`}
      data-testid={ids.meaningSkeleton}
      data-motion={motion}
      accessibility-elements-hidden={true}
    >
      <view className="my-message-divider" accessibility-elements-hidden={true} />
      <view className="my-message-skeleton-slot-s">
        <view className="my-message-bar my-message-bar-roman" />
      </view>
      <view className="my-message-skeleton-slot-m">
        <view className="my-message-bar my-message-bar-meaning" />
      </view>
      <view className="my-message-shimmer" />
    </view>
  );
}

function FixCardSkeleton({ motion }: MyMessageSkeletonProps): ReactNode {
  const copy = useUiCopy().messengerChat.myMessage;
  return (
    <view
      className={`my-message-fix-card${stillClass(motion)}`}
      data-testid={ids.fixSkeleton}
      data-motion={motion}
      accessibility-element={true}
      accessibility-label={copy.loadingFix}
    >
      <text className="my-message-better">{copy.better}</text>
      <view className="my-message-card-slot-m">
        <view className="my-message-card-bar my-message-card-bar-1" />
      </view>
      <view className="my-message-card-slot-s">
        <view className="my-message-card-bar my-message-card-bar-2" />
      </view>
      <view className="my-message-card-slot-s">
        <view className="my-message-card-bar my-message-card-bar-3" />
      </view>
      <view className="my-message-shimmer my-message-shimmer-card" />
    </view>
  );
}

function Tools({ children }: MyMessageToolsProps): ReactNode {
  return (
    <view className="my-message-tools" data-testid={ids.tools}>
      {children}
    </view>
  );
}

function MeaningToolButton({ state, onTap }: MeaningToolButtonProps): ReactNode {
  const copy = useUiCopy().messengerChat.myMessage;
  return (
    <view
      className={`my-message-tool${state === "on" ? " my-message-tool-meaning-on" : ""}`}
      data-testid={ids.toolMeaning}
      data-state={state}
      hit-slop={SLOP_ICON}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={copy.meaningButton}
      accessibility-value={state === "on" ? copy.expanded : copy.collapsed}
      catchtap={() => {
        "background only";
        onTap();
      }}
    >
      <svg
        className="my-message-icon"
        content={internet}
        current-color={state === "on" ? color.white : color.fg["neutral-muted"]}
      />
    </view>
  );
}

function FixToolButton({ state, dot, onTap }: FixToolButtonProps): ReactNode {
  const copy = useUiCopy().messengerChat.myMessage;
  return (
    <view
      className={`my-message-tool${state === "on" ? " my-message-tool-fix-on" : ""}`}
      data-testid={ids.toolFix}
      data-state={state}
      data-dot={dot}
      hit-slop={SLOP_ICON}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={dot === "shown" ? copy.fixButtonNew : copy.fixButton}
      accessibility-value={state === "on" ? copy.expanded : copy.collapsed}
      catchtap={() => {
        "background only";
        onTap();
      }}
    >
      <svg
        className="my-message-icon"
        content={pencil}
        current-color={state === "on" ? color.white : color.fg["neutral-muted"]}
      />
      {dot === "shown" ? (
        <view className="my-message-dot" accessibility-elements-hidden={true} />
      ) : null}
    </view>
  );
}

export const MyMessage = {
  Stack,
  Bubble,
  MeaningLines,
  MeaningSkeleton,
  FixCardSkeleton,
  Tools,
  MeaningToolButton,
  FixToolButton,
} as const;

/** `view.kind`별로 부품을 조립합니다. 순서는 말풍선 → 카드 → 아이콘 줄입니다. */
export function MyMessageRow({
  ko,
  speaker,
  view,
  tools,
  motion,
  onToggle,
  onResend,
}: MyMessageRowProps): ReactNode {
  const copy = useUiCopy().messengerChat.myMessage;
  const label = myBubbleLabelOf(speaker, ko, view, copy.loadingMeaning);
  const toolRow = (
    <Tools>
      <MeaningToolButton state={tools.meaning} onTap={() => onToggle("meaning")} />
      {tools.fix.kind === "shown" ? (
        <FixToolButton state={tools.fix.state} dot={tools.fix.dot} onTap={() => onToggle("fix")} />
      ) : null}
    </Tools>
  );
  switch (view.kind) {
    case "closed":
      return (
        <Stack>
          <Bubble ko={ko} label={label} view={view.kind} />
          {toolRow}
        </Stack>
      );
    case "meaning-loading":
      return (
        <Stack>
          <Bubble ko={ko} label={label} view={view.kind}>
            <MeaningSkeleton motion={motion} />
          </Bubble>
          {toolRow}
        </Stack>
      );
    case "meaning":
      return (
        <Stack>
          <Bubble ko={ko} label={label} view={view.kind}>
            <MeaningLines meaning={view.meaning} />
          </Bubble>
          {toolRow}
        </Stack>
      );
    case "fix-loading":
      return (
        <Stack>
          <Bubble ko={ko} label={label} view={view.kind} />
          <FixCardSkeleton motion={motion} />
          {toolRow}
        </Stack>
      );
    case "fix":
      return (
        <Stack>
          <Bubble ko={ko} label={label} view={view.kind} />
          <CorrectionCard correction={view.correction} onResend={onResend} />
          {toolRow}
        </Stack>
      );
    default: {
      const unreachable: never = view;
      return unreachable;
    }
  }
}
