// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// 한 턴 스트림의 이벤트 순서 규칙입니다(`docs/specs/ai-companion-api.md` §4.3). 서버 통합 테스트와 fixture 검사가
// 같은 판정을 써서, 규칙이 바뀌면 두 쪽이 함께 빨개지게 합니다.
import type { TurnEvent } from "./sse-events.ts";

export type TurnOrderViolation =
  | "empty"
  | "start-not-first"
  | "id-not-sequential"
  | "no-terminal"
  | "event-after-terminal"
  | "notice-after-content"
  | "segment-went-back"
  | "duplicate-correction"
  | "state-not-before-done"
  | "state-missing"
  | "crisis-with-delta"
  | "crisis-charged";

export type TurnOrderResult =
  | { ok: true }
  | { ok: false; violation: TurnOrderViolation; at: number };

const fail = (violation: TurnOrderViolation, at: number): TurnOrderResult => ({
  ok: false,
  violation,
  at,
});

/** 끝까지 받은 한 턴의 이벤트 목록이 순서 규칙을 지키는지 봅니다. 첫 위반 하나를 돌려줍니다. */
export function checkTurnOrder(events: readonly TurnEvent[]): TurnOrderResult {
  if (events.length === 0) return fail("empty", 0);
  if (events[0]?.event !== "start") return fail("start-not-first", 0);

  let lastSegment = -1;
  let sawContent = false;
  let sawDelta = false;
  let sawCrisis = false;
  let corrections = 0;
  let stateAt = -1;

  for (const [index, event] of events.entries()) {
    if (event.id !== index) return fail("id-not-sequential", index);
    const terminal = event.event === "done" || event.event === "error";
    if (terminal && index !== events.length - 1) return fail("event-after-terminal", index + 1);

    switch (event.event) {
      case "start":
        if (index !== 0) return fail("start-not-first", index);
        break;
      case "notice":
        if (sawContent) return fail("notice-after-content", index);
        break;
      case "delta":
        if (event.data.segment < lastSegment) return fail("segment-went-back", index);
        lastSegment = event.data.segment;
        sawContent = true;
        sawDelta = true;
        break;
      case "crisis":
        sawContent = true;
        sawCrisis = true;
        break;
      case "correction":
        corrections += 1;
        if (corrections > 1) return fail("duplicate-correction", index);
        break;
      case "state":
        stateAt = index;
        break;
      case "translation":
      case "error":
        break;
      case "done":
        if (sawCrisis) {
          if (sawDelta) return fail("crisis-with-delta", index);
          if (event.data.creditsSpent !== 0) return fail("crisis-charged", index);
        } else if (stateAt === -1) return fail("state-missing", index);
        break;
    }
    if (stateAt !== -1 && index > stateAt && event.event !== "done") {
      return fail("state-not-before-done", stateAt);
    }
  }

  const last = events[events.length - 1];
  if (last?.event !== "done" && last?.event !== "error") return fail("no-terminal", events.length);
  return { ok: true };
}
