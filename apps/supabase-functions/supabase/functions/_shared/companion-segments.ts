// 메인 LLM의 글자 흐름을 말풍선 조각(speech · action · narration)으로 나눕니다.
//
// 모델은 조각마다 한 줄을 쓰고 줄 앞에 태그를 붙입니다 — `@speech 안녕하세요!` · `@action 칠판을 끈다` · `@narration …`.
// 태그가 없는 줄은 speech입니다(모델이 형식을 놓쳐도 답이 사라지지 않게). 빈 줄은 버립니다.
// 글자는 받는 대로 내보냅니다 — 줄의 앞 몇 글자로 태그 여부만 가리면 나머지는 기다리지 않습니다.
// `@state {…}` 줄은 말풍선이 아니라 서버에 주는 신호(친밀도 증감 · 화제)라 내보내지 않고 `state()`로 모읍니다.

import type { Segment, TurnState } from "./chat-send.contract.ts";
import type { SegmentKind } from "./companion-contract/index.ts";

export type SegmentDelta = {
  readonly segment: number;
  readonly kind: SegmentKind;
  readonly text: string;
};

type LineKind = SegmentKind | "state";

const tags: readonly { tag: string; kind: LineKind }[] = [
  { tag: "@speech", kind: "speech" },
  { tag: "@action", kind: "action" },
  { tag: "@narration", kind: "narration" },
  { tag: "@state", kind: "state" },
];
const longestTag = Math.max(...tags.map((entry) => entry.tag.length)) + 1;

export type SegmentSplitter = {
  push(chunk: string): SegmentDelta[];
  end(): SegmentDelta[];
  /** `@state` 줄을 읽은 결과. 없거나 깨졌으면 null. `end()` 뒤에 부릅니다. */
  state(): TurnState | null;
};

/** `learned`: 후보 id(`e1` …) 또는 옛 모양의 true. null · false · 빈 글은 쓰지 않음. */
function learnedFrom(learned: unknown, how: unknown): Pick<TurnState, "learned" | "learnedHow"> {
  const value =
    learned === true ? true : typeof learned === "string" && /^e\d{1,2}$/.test(learned.trim()) ? learned.trim() : null;
  if (value === null) return {};
  return { learned: value, ...(how === "say" || how === "ask" ? { learnedHow: how } : {}) };
}

export function parseTurnState(text: string): TurnState | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    const delta = Number(raw["intimacy_delta"] ?? 0);
    return {
      intimacyDelta: Number.isFinite(delta) ? Math.round(delta) : 0,
      topic:
        typeof raw["topic"] === "string" && raw["topic"] !== "" ? raw["topic"].slice(0, 60) : null,
      userWantsSwitch: raw["user_wants_switch"] === true,
      ...learnedFrom(raw["learned"], raw["learned_how"]),
      ...(raw["heavy"] === true ? { heavy: true as const } : {}),
    };
  } catch {
    return null;
  }
}

export function createSegmentSplitter(): SegmentSplitter {
  let segment = -1;
  // 줄 머리: 아직 태그인지 모르는 글자들. null이면 줄의 몸통을 쓰는 중입니다.
  let head: string | null = "";
  let kind: LineKind = "speech";
  let lineStarted = false;
  let stateText = "";

  const body = (text: string, out: SegmentDelta[]) => {
    if (text === "") return;
    if (kind === "state") {
      stateText += text;
      return;
    }
    if (!lineStarted) {
      // 줄 첫 글자의 앞 공백은 버립니다.
      text = text.replace(/^\s+/, "");
      if (text === "") return;
      lineStarted = true;
      segment += 1;
    }
    out.push({ segment, kind, text });
  };

  const resolveHead = (out: SegmentDelta[], final: boolean) => {
    if (head === null) return;
    const trimmed = head.replace(/^\s+/, "");
    const match = tags.find(
      (entry) => trimmed.startsWith(entry.tag) && (trimmed.length > entry.tag.length || final),
    );
    if (match !== undefined) {
      const rest = trimmed.slice(match.tag.length);
      // `@speechless`처럼 태그 뒤에 글자가 바로 붙으면 태그가 아닙니다.
      if (rest === "" || /^[\s:]/.test(rest)) {
        kind = match.kind;
        head = null;
        body(rest.replace(/^[\s:]+/, ""), out);
        return;
      }
    }
    const couldBeTag = tags.some(
      (entry) => entry.tag.startsWith(trimmed) || trimmed.startsWith(entry.tag),
    );
    if (!final && couldBeTag && trimmed.length < longestTag) return;
    kind = "speech";
    const text = head;
    head = null;
    body(text, out);
  };

  const newLine = () => {
    head = "";
    lineStarted = false;
    kind = "speech";
  };

  return {
    push(chunk) {
      const out: SegmentDelta[] = [];
      const lines = chunk.split("\n");
      lines.forEach((part, index) => {
        if (index > 0) {
          resolveHead(out, true);
          newLine();
        }
        if (head === null) body(part, out);
        else {
          head += part;
          resolveHead(out, false);
        }
      });
      return out;
    },
    end() {
      const out: SegmentDelta[] = [];
      resolveHead(out, true);
      return out;
    },
    state() {
      return stateText.trim() === "" ? null : parseTurnState(stateText.trim());
    },
  };
}

/** 조각 흐름 전체를 조각 배열로 모읍니다(저장 · 동기 검사용). */
export function collectSegments(deltas: readonly SegmentDelta[]): Segment[] {
  const segments: Segment[] = [];
  for (const delta of deltas) {
    const last = segments[delta.segment];
    if (last === undefined) segments[delta.segment] = { kind: delta.kind, text: delta.text };
    else segments[delta.segment] = { kind: last.kind, text: last.text + delta.text };
  }
  return segments
    .map((entry) => ({ kind: entry.kind, text: entry.text.trimEnd() }))
    .filter((entry) => entry.text !== "");
}

/** 지난 캐릭터 답을 프롬프트에 다시 넣을 때 모델이 쓰는 형식으로 되돌립니다. */
export function segmentsToTagged(segments: readonly Segment[]): string {
  return segments.map((entry) => `@${entry.kind} ${entry.text}`).join("\n");
}

export function segmentsToPlain(segments: readonly Segment[]): string {
  return segments.map((entry) => entry.text).join("\n");
}
