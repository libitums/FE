// 가드레일 리비전: 판정이 어느 지시문으로 나왔는지 가리키는 8자리 표시를 소유합니다. 배포 시각으로 전후를 짐작하지 않고
// 지시문 글 자체로 판정을 나누려고 둡니다(ADR-0203 개정 ⟨리비전⟩). `chat-send`와 `companion-eval`이 같은 계산을 써야
// 운영 판정과 재현 결과를 같은 값으로 견줄 수 있어 한 파일에 둡니다.

import type { AgeBand, RomanceLine } from "./chat-send.contract.ts";
import { hardLimitVariants } from "./companion-prompt.ts";
import { commonRequests } from "./companion-prompt-requests.ts";
import { moderationInstruction } from "./companion-safety.ts";

const layers = ["input", "output_sync"] as const;
const ageBands: readonly AgeBand[] = ["adult", "minor", "unknown"];
const lines: readonly RomanceLine[] = ["none", "hug", "kiss", "close", "open"];

/**
 * 리비전이 읽는 글: 검사 지시문 전부(단계 2 × 연령대 3 × 선 5)와 답 프롬프트에서 인물과 상관없이 같은 줄(수위선 셋 · 자주 오는 요청).
 * 순서가 값의 일부입니다 — 차례를 바꾸면 글이 같아도 리비전이 바뀝니다.
 */
export function guardrailTexts(): string[] {
  const instructions = layers.flatMap((layer) =>
    ageBands.flatMap((ageBand) => lines.map((line) => moderationInstruction(layer, ageBand, line))),
  );
  return [...instructions, ...hardLimitVariants(), commonRequests];
}

/** 글 목록의 리비전 — 이어 붙인 글의 SHA-256 앞 8자리(16진수 소문자). DB의 `moderation_events.rev` 검사와 같은 꼴입니다. */
export async function guardrailRevOf(texts: readonly string[]): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(texts.join("\n\n")),
  );
  return [...new Uint8Array(digest).slice(0, 4)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

let current: Promise<string> | undefined;

/** 지금 실린 지시문의 리비전. 지시문은 코드에 박혀 있어 실행 중에 바뀌지 않으므로 인스턴스마다 처음 한 번만 계산합니다. */
export const guardrailRev = (): Promise<string> => (current ??= guardrailRevOf(guardrailTexts()));
