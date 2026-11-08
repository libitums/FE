// `text/event-stream` 글자를 이벤트로 바꿉니다. 앱의 스트림 수신과 fixture 재생이 같은 파서를 씁니다.
// 조각(chunk)이 이벤트 중간에서 끊겨 와도 되도록 남은 글자를 다음 `push`까지 들고 있습니다.
import { turnEventSchema, type TurnEvent } from "./sse-events";

/** 파싱만 한 이벤트입니다. `data`는 아직 JSON 문자열이고 계약 검사 전입니다. */
export type RawSseEvent = { event: string; id: string | null; data: string };

export type SseParser = {
  /** 받은 글자를 넣고, 그 안에서 끝난 이벤트들을 돌려줍니다. */
  push(chunk: string): RawSseEvent[];
  /** 스트림이 끝났을 때 부릅니다. 빈 줄 없이 끝난 마지막 이벤트가 있으면 돌려줍니다. */
  end(): RawSseEvent[];
};

export function createSseParser(): SseParser {
  let buffer = "";
  let event = "";
  let id: string | null = null;
  let data: string[] = [];
  let hasField = false;

  const flush = (out: RawSseEvent[]) => {
    // 주석 줄(`: ping`)만 있던 블록은 이벤트가 아닙니다.
    if (hasField) out.push({ event: event === "" ? "message" : event, id, data: data.join("\n") });
    event = "";
    id = null;
    data = [];
    hasField = false;
  };

  const takeLine = (line: string, out: RawSseEvent[]) => {
    if (line === "") return flush(out);
    if (line.startsWith(":")) return;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    hasField = true;
    if (field === "event") event = value;
    else if (field === "id") id = value;
    else if (field === "data") data.push(value);
  };

  return {
    push(chunk) {
      buffer += chunk;
      const out: RawSseEvent[] = [];
      for (;;) {
        const match = /\r\n|\r|\n/.exec(buffer);
        // 끝이 `\r` 하나면 다음 조각의 `\n`과 한 줄 끝일 수 있어 기다립니다.
        if (match === null || (match[0] === "\r" && match.index === buffer.length - 1)) break;
        takeLine(buffer.slice(0, match.index), out);
        buffer = buffer.slice(match.index + match[0].length);
      }
      return out;
    },
    end() {
      const out: RawSseEvent[] = [];
      if (buffer !== "") takeLine(buffer.replace(/\r$/, ""), out);
      buffer = "";
      flush(out);
      return out;
    },
  };
}

/** 스트림 전체 글자를 한 번에 파싱합니다(fixture · 테스트용). */
export function parseSse(text: string): RawSseEvent[] {
  const parser = createSseParser();
  return [...parser.push(text), ...parser.end()];
}

export type DecodedTurnEvent =
  | { ok: true; event: TurnEvent }
  | { ok: false; raw: RawSseEvent; reason: "invalid-json" | "invalid-event" };

/** 날 이벤트를 계약으로 검사합니다. 모르는 이벤트 이름도 `invalid-event`입니다 — 받는 쪽이 버릴지 정합니다. */
export function decodeTurnEvent(raw: RawSseEvent): DecodedTurnEvent {
  let data: unknown;
  try {
    data = JSON.parse(raw.data);
  } catch {
    return { ok: false, raw, reason: "invalid-json" };
  }
  const id = raw.id === null || !/^\d+$/.test(raw.id) ? Number.NaN : Number(raw.id);
  const parsed = turnEventSchema.safeParse({ event: raw.event, id, data });
  return parsed.success
    ? { ok: true, event: parsed.data }
    : { ok: false, raw, reason: "invalid-event" };
}

/** 이벤트 하나를 SSE 글자로 씁니다. 서버의 직렬화와 fixture 작성이 같은 모양을 쓰게 합니다. */
export function formatSseEvent(event: TurnEvent): string {
  return `event: ${event.event}\nid: ${event.id}\ndata: ${JSON.stringify(event.data)}\n\n`;
}
