// `companion-eval`의 고정 평가 세트(ADR-0164) — 추천 친구 넷의 페르소나 유지와 로맨스 수위 경계. 실제 LLM을 부르지 않는 데이터다:
// ops-dashboard가 `GET ?docs=1`의 `evalSets`로 받아 세트마다 `POST`(케이스 ≤ 20)로 돌리고, 검사 세트는 `expect`와 견준다.
// 답장 세트의 기대(무엇을 지켜야 하나)는 채점자에게만 주는 `spoilerNote`에 적는다 — 답장 프롬프트에는 들어가지 않는다.

import type { EvalSet } from "./companion-eval-set-shape.ts";
import { friendReplySetsA } from "./companion-eval-sets-friends-a.ts";
import { friendReplySetsB } from "./companion-eval-sets-friends-b.ts";
import { friendReplySetsC } from "./companion-eval-sets-friends-c.ts";
import { storyReactionSets } from "./companion-eval-sets-reactions.ts";
import { misfireSets } from "./companion-eval-sets-misfires.ts";
import { commonRequestSets } from "./companion-eval-sets-requests.ts";
import { tierBoundarySets } from "./companion-eval-sets-tier.ts";

export type { EvalSet, EvalVerdict } from "./companion-eval-set-shape.ts";

export const companionEvalSets: readonly EvalSet[] = [
  ...friendReplySetsA,
  ...friendReplySetsB,
  ...friendReplySetsC,
  ...tierBoundarySets,
  ...commonRequestSets,
  ...misfireSets,
  ...storyReactionSets,
];
