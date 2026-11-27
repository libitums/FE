// 가드레일 리비전(ops-dashboard `docs/admin-contract.md` §G-A) — 판정이 어떤 지시문으로 났는지 가르는 8자리. 검사 지시문 전부(단계 × 연령대 ×
// 로맨스 선)와 답 프롬프트 앞부분(인물 종류별 대표 셋)을 이어 붙인 글의 해시다. 같은 지시문이면 같은 값이라 배포 시각을 짐작하지 않고
// 전후를 나눈다. RPC 요청 헤더 `x-guardrail-rev`로 싣고(`companion-rpc.ts`), DB의 `moderation_events.rev` 기본값이 그 헤더를 읽는다
// (20270118). 이 파일을 쓰는 함수가 처음 RPC를 부를 때 한 번 계산한다.

import type { AgeBand, PersonaCard } from "./chat-send.contract.ts";
import { companionSystemPrompt } from "./companion-prompt.ts";
import { moderationInstruction, type RomanceLine } from "./companion-safety.ts";

const layers = ["input", "output_sync"] as const;
const ages: readonly AgeBand[] = ["adult", "minor", "unknown"];
const lines: readonly RomanceLine[] = ["none", "hug", "kiss", "close", "open"];
// 답 프롬프트 앞부분은 인물 종류(스토리 인물 · 추천 친구 · open)마다 고정 줄이 다르다 — 종류마다 하나씩.
const personas: readonly PersonaCard[] = [
  { name: "rev-story" },
  { name: "rev-friend", kind: "friend", maxSpeechLevel: "slang" },
  { name: "rev-open", kind: "friend", romanceTier: "open", maxSpeechLevel: "slang" },
];

/** FNV-1a 32비트 — 동기 · 의존 없음. 암호 용도가 아니라 같은 글을 가르는 표시라 충분하다. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function guardrailSource(): string {
  const parts: string[] = [];
  for (const layer of layers)
    for (const age of ages)
      for (const line of lines) parts.push(moderationInstruction(layer, age, line));
  for (const persona of personas)
    parts.push(
      companionSystemPrompt({
        persona,
        speechLevel: "polite",
        ageBand: "adult",
        l1: null,
        expressions: [],
        summary: null,
        feedbackMode: "separate",
        memories: [],
        directive: null,
      }).stable,
    );
  return parts.join("\n\u0000\n");
}

let cached: string | null = null;

/** 지금 코드의 가드레일 리비전(8자리 16진수). */
export function guardrailRev(): string {
  cached ??= fnv1a(guardrailSource());
  return cached;
}
