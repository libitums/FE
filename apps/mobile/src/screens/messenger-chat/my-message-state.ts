// 내 말풍선 도구 상태 · 보이는 모양 · 아이콘 줄 · 낭독입니다(messenger-chat-1-5 spec §4.3). 순수.

import type { ChatCorrection, ChatMeaning, ChatMyNotes } from "./chat-source.contract";

export type BubbleTool = "meaning" | "fix";
/** 내 글 id → 열린 도구. 말풍선마다 독립. */
export type BubbleToolsState = Readonly<Record<string, BubbleTool>>;
export type MyBubbleView =
  | { readonly kind: "closed" }
  | { readonly kind: "meaning-loading" }
  | { readonly kind: "meaning"; readonly meaning: ChatMeaning }
  | { readonly kind: "fix-loading" }
  | { readonly kind: "fix"; readonly correction: ChatCorrection };
export type BubbleToolRow = {
  /** hidden = 서버 모드(ADR-0137) — 내 글 뜻(🌐)을 서버가 주지 않아 버튼을 두지 않습니다(사용자 결정 2026-11-12). */
  readonly meaning: "on" | "off" | "hidden";
  readonly fix:
    | { readonly kind: "hidden" }
    | {
        readonly kind: "shown";
        readonly state: "on" | "off";
        readonly dot: "shown" | "hidden";
      };
};
export type ToolRequest = "request-meaning" | "open-correction" | "none";
export type BubbleAnnouncement =
  | { readonly kind: "loading-meaning" }
  | { readonly kind: "loading-fix" }
  | { readonly kind: "meaning"; readonly meaning: ChatMeaning }
  | { readonly kind: "fix"; readonly correction: ChatCorrection };

export function toggleBubbleTool(
  state: BubbleToolsState,
  messageId: string,
  tool: BubbleTool,
): BubbleToolsState {
  if (state[messageId] === tool) {
    const { [messageId]: _closed, ...rest } = state;
    return rest;
  }
  return { ...state, [messageId]: tool };
}

export function myBubbleViewOf(open: BubbleTool | undefined, notes: ChatMyNotes): MyBubbleView {
  if (open === "meaning") {
    return notes.meaning.status === "ready"
      ? { kind: "meaning", meaning: notes.meaning.value }
      : { kind: "meaning-loading" };
  }
  if (open === "fix" && notes.correction.kind === "available") {
    const { detail } = notes.correction;
    return detail.status === "ready"
      ? { kind: "fix", correction: detail.value }
      : { kind: "fix-loading" };
  }
  return { kind: "closed" };
}

export function bubbleToolRowOf(
  open: BubbleTool | undefined,
  notes: ChatMyNotes,
  meaningTool: "shown" | "hidden" = "shown",
): BubbleToolRow {
  const { correction } = notes;
  return {
    meaning: meaningTool === "hidden" ? "hidden" : open === "meaning" ? "on" : "off",
    fix:
      correction.kind === "available"
        ? {
            kind: "shown",
            state: open === "fix" ? "on" : "off",
            dot: correction.seen ? "hidden" : "shown",
          }
        : { kind: "hidden" },
  };
}

export function toolRequestOf(tool: BubbleTool, notes: ChatMyNotes): ToolRequest {
  if (tool === "meaning") return notes.meaning.status === "idle" ? "request-meaning" : "none";
  const { correction } = notes;
  if (correction.kind !== "available") return "none";
  if (correction.detail.status === "idle") return "open-correction";
  return correction.detail.status === "ready" && !correction.seen ? "open-correction" : "none";
}

export function bubbleAnnouncementOf(
  previous: MyBubbleView,
  next: MyBubbleView,
): BubbleAnnouncement | null {
  if (previous.kind === next.kind) return null;
  switch (next.kind) {
    case "meaning-loading":
      return { kind: "loading-meaning" };
    case "fix-loading":
      return { kind: "loading-fix" };
    case "meaning":
      return { kind: "meaning", meaning: next.meaning };
    case "fix":
      return { kind: "fix", correction: next.correction };
    case "closed":
      return null;
  }
}

/**
 * 말풍선 접근성 라벨입니다. 뜻이 열리면 로마자 · 뜻이 이어 붙고, 뜻을 불러오는 중이면 `loadingMeaning`이 붙습니다 — 뜻 스켈레톤은
 * 말풍선 접근성 요소의 자식이라 따로 닿지 않으므로 불러오는 중이라는 사실을 말풍선이 전합니다(접근성 M6).
 */
export function myBubbleLabelOf(
  speaker: string,
  ko: string,
  view: MyBubbleView,
  loadingMeaning = "",
): string {
  const base = `${speaker}: ${ko}`;
  if (view.kind === "meaning")
    return `${base}, ${view.meaning.romanization}, ${view.meaning.meaning}`;
  if (view.kind === "meaning-loading" && loadingMeaning !== "") return `${base}, ${loadingMeaning}`;
  return base;
}
