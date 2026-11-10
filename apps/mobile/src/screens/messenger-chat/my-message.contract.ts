// 내 말풍선 부품 계약입니다(messenger-chat-1-5 spec §6.1 · §10). 불리언 prop 없이 compound로 조립합니다.

import type { ReactNode } from "@lynx-js/react";

import type { ChatCorrection, ChatMeaning } from "./chat-source.contract";
import type { BubbleTool, BubbleToolRow, MyBubbleView } from "./my-message-state";

export type MyMotion = "standard" | "reduced";

export type MyMessageRowProps = {
  readonly messageId: string;
  readonly ko: string;
  readonly speaker: string;
  readonly view: MyBubbleView;
  readonly tools: BubbleToolRow;
  readonly motion: MyMotion;
  readonly onToggle: (tool: BubbleTool) => void;
};
export type MyMessageStackProps = { readonly children: ReactNode };
export type MyMessageBubbleProps = {
  readonly ko: string;
  readonly label: string;
  /** `data-view`에 실리는 보기 종류입니다(보기가 바뀌어도 말풍선 요소는 하나). */
  readonly view: MyBubbleView["kind"];
  readonly children?: ReactNode;
};
export type MyMessageMeaningLinesProps = { readonly meaning: ChatMeaning };
export type MyMessageSkeletonProps = { readonly motion: MyMotion };
export type MyMessageFixCardProps = { readonly correction: ChatCorrection };
export type MyMessageToolsProps = { readonly children: ReactNode };
export type MeaningToolButtonProps = {
  readonly state: "on" | "off";
  readonly onTap: () => void;
};
export type FixToolButtonProps = {
  readonly state: "on" | "off";
  readonly dot: "shown" | "hidden";
  readonly onTap: () => void;
};

const my = (suffix: string): string => `messenger-chat-${suffix}`;

export const myMessageTestIds = {
  stack: my("my"),
  bubble: my("my-bubble"),
  meaning: my("my-meaning"),
  meaningRoman: my("my-meaning-roman"),
  meaningText: my("my-meaning-text"),
  meaningSkeleton: my("my-meaning-skeleton"),
  fixCard: my("fix-card"),
  fixSegment: (index: number): string => my(`fix-card-seg-${index}`),
  fixExplanation: my("fix-card-explanation"),
  fixSkeleton: my("fix-card-skeleton"),
  tools: my("my-tools"),
  toolMeaning: my("tool-meaning"),
  toolFix: my("tool-fix"),
} as const;
