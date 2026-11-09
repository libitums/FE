import { describe, expect, test } from "vitest";

import { numbered } from "./fixtures-streams";
import { turnFixtureEvents } from "./fixtures";
import type { TurnEvent } from "./sse-events";
import { checkTurnOrder } from "./turn-order";

const normal = turnFixtureEvents["turn-normal"];
const strip = (events: readonly TurnEvent[]) => events.map(({ id: _id, ...rest }) => rest);
const renumber = (events: readonly TurnEvent[]) => numbered(strip(events));
const violation = (events: readonly TurnEvent[]) => {
  const result = checkTurnOrder(events);
  return result.ok ? "ok" : result.violation;
};

describe("턴 순서 규칙", () => {
  test("TO1. 빈 목록 · start가 아닌 첫 이벤트 · 끝 이벤트 없음", () => {
    expect(violation([])).toBe("empty");
    expect(violation(renumber(normal.slice(1)))).toBe("start-not-first");
    expect(violation(renumber(normal.slice(0, -1)))).toBe("no-terminal");
    expect(violation(renumber(normal.slice(0, 3)))).toBe("no-terminal");
  });

  test("TO2. id는 0부터 하나씩 는다", () => {
    expect(
      violation(normal.map((event, index) => (index === 2 ? { ...event, id: 9 } : event))),
    ).toBe("id-not-sequential");
  });

  test("TO3. notice가 답변 조각 뒤에 오면 위반이다", () => {
    const [start, notice, first, ...rest] = strip(normal);
    expect(violation(numbered([start!, first!, notice!, ...rest]))).toBe("notice-after-content");
  });

  test("TO4. 조각 번호가 되돌아가거나 correction이 두 번이면 위반이다", () => {
    const events = strip(normal);
    const back = events.map((event) =>
      event.event === "delta" && event.data.segment === 2
        ? { ...event, data: { ...event.data, segment: 0 } }
        : event,
    );
    expect(violation(numbered(back))).toBe("segment-went-back");
    const correction = events.find((event) => event.event === "correction")!;
    expect(violation(numbered([...events.slice(0, 3), correction, ...events.slice(3)]))).toBe(
      "duplicate-correction",
    );
  });

  // TO5 — 위기 턴이 크레딧을 깎거나 연기(delta)를 섞으면 위기 프로토콜의 약속이 깨집니다.
  test("TO5. 위기 턴은 delta가 없고 차감이 0이다", () => {
    const crisis = strip(turnFixtureEvents["turn-crisis"]);
    const charged = crisis.map((event) =>
      event.event === "done" ? { ...event, data: { ...event.data, creditsSpent: 1 } } : event,
    );
    expect(violation(numbered(charged))).toBe("crisis-charged");
    const acted = [
      crisis[0]!,
      { event: "delta", data: { segment: 0, kind: "speech", text: "…" } },
      ...crisis.slice(1),
    ];
    expect(violation(numbered(acted as typeof crisis))).toBe("crisis-with-delta");
  });

  test("TO6. 정상 done 앞에는 state가 바로 붙는다 · 끝 뒤에는 아무것도 없다", () => {
    const events = strip(normal);
    expect(violation(numbered(events.filter((event) => event.event !== "state")))).toBe(
      "state-missing",
    );
    expect(violation(numbered([...events, events[2]!]))).toBe("event-after-terminal");
  });

  // TO7 — 칩은 답이 다 나간 뒤 한 번이고, 위기 · 거절 턴에는 없습니다(앱이 칩을 그 답 밑에 붙입니다).
  test("TO7. suggestions는 조각 · 번역 뒤 · state 앞에 한 번, 위기 · 거절 턴에는 없다", () => {
    const events = strip(turnFixtureEvents["turn-with-suggestions"]);
    const at = events.findIndex((event) => event.event === "suggestions");
    const chips = events[at]!;
    const without = events.filter((_, index) => index !== at);
    const stateAt = without.findIndex((event) => event.event === "state");
    const translationAt = without.findIndex((event) => event.event === "translation");
    expect(violation(numbered(events))).toBe("ok");
    expect(violation(numbered([...events.slice(0, at + 1), chips, ...events.slice(at + 1)]))).toBe(
      "duplicate-suggestions",
    );
    expect(
      violation(
        numbered([...without.slice(0, translationAt), chips, ...without.slice(translationAt)]),
      ),
    ).toBe("suggestions-not-after-reply");
    expect(violation(numbered([events[0]!, chips, ...without.slice(1)]))).toBe(
      "suggestions-not-after-reply",
    );
    expect(
      violation(numbered([...without.slice(0, stateAt + 1), chips, ...without.slice(stateAt + 1)])),
    ).toBe("state-not-before-done");

    const crisis = strip(turnFixtureEvents["turn-crisis"]);
    expect(violation(numbered([...crisis.slice(0, 2), chips, ...crisis.slice(2)]))).toBe(
      "crisis-with-suggestions",
    );
    const refusal = strip(turnFixtureEvents["turn-refusal"]);
    const refusalState = refusal.findIndex((event) => event.event === "state");
    expect(
      violation(
        numbered([...refusal.slice(0, refusalState), chips, ...refusal.slice(refusalState)]),
      ),
    ).toBe("refusal-with-suggestions");
  });
});
