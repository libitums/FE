// `companion_proactive_context`의 반환 모양 — 선톡 핸들러(`companion-proactive-handler.ts`)가 읽는다.

import type { PersonaCard, Segment } from "./chat-send.contract.ts";
import type { ChoiceSet } from "./companion-suggest.contract.ts";

export type ProactiveContext = {
  persona: PersonaCard;
  speechLevel: "polite" | "casual" | "slang";
  summary: string | null;
  l1: string | null;
  ageBand: "adult" | "minor" | "unknown";
  romanceTier?: "open" | "standard"; // 적용 로맨스 수위(20261213). 옛 DB는 없다 — standard.
  hasConversation: boolean;
  /** 유저가 한 번이라도 말했는가(20261122). 첫 인사만 있는 대화에는 `force`여도 보내지 않는다. 옛 DB에는 없다. */
  hasUserMessage?: boolean;
  allowed: boolean;
  capReached: boolean;
  /** 빈도 판정(20261115 · 20261123): off · quiet_hours · hour · daily_cap · gap · spacing · unanswered_limit · backoff, 보내도 되면 null. */
  skipReason?: string | null;
  /** 선톡 맥락(20261123). 옛 DB에는 없다. */
  unanswered?: number;
  lastUserMessageAt?: string | null;
  localHour?: number | null;
  recentProactive?: string[];
  replySuggestions?: boolean;
  suggestionsEnabled?: boolean;
  suggestionDisplayMax?: number;
  recentChoiceSets?: ChoiceSet[];
  memories: string[];
  history: { role: "user" | "assistant"; text: string | null; segments: Segment[] }[];
} | null;
