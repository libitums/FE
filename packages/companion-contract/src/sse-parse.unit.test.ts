import { describe, expect, test } from "vitest";

import { createSseParser, decodeTurnEvent, formatSseEvent, parseSse } from "./sse-parse";

describe("SSE 파서", () => {
  // SP1 — 이벤트 경계가 조각 중간에 와도 같은 이벤트가 나옵니다. 앱은 네트워크 조각 크기를 고를 수 없습니다.
  test("SP1. 글자를 한 자씩 넣어도 한 번에 넣은 것과 같은 이벤트가 나온다", () => {
    const text =
      'event: delta\nid: 3\ndata: {"a":1}\n\n: ping\n\nevent: done\r\nid: 4\r\ndata: {}\r\n\r\n';
    const parser = createSseParser();
    const byChar = [...text].flatMap((char) => parser.push(char)).concat(parser.end());
    expect(byChar).toEqual(parseSse(text));
    expect(byChar).toEqual([
      { event: "delta", id: "3", data: '{"a":1}' },
      { event: "done", id: "4", data: "{}" },
    ]);
  });

  test("SP2. 주석 줄만 있는 블록은 이벤트가 아니고, data 여러 줄은 줄바꿈으로 잇는다", () => {
    expect(parseSse(": ping\n\n")).toEqual([]);
    expect(parseSse("data: a\ndata: b\n\n")).toEqual([
      { event: "message", id: null, data: "a\nb" },
    ]);
  });

  // SP3 — 서버가 마지막 빈 줄 없이 연결을 닫아도 마지막 이벤트를 잃지 않습니다.
  test("SP3. end()가 빈 줄 없이 끝난 마지막 이벤트를 돌려준다", () => {
    const parser = createSseParser();
    expect(parser.push("event: done\nid: 0\ndata: {}")).toEqual([]);
    expect(parser.end()).toEqual([{ event: "done", id: "0", data: "{}" }]);
  });
});

describe("이벤트 검사", () => {
  const delta = {
    event: "delta",
    id: 1,
    data: { segment: 0, kind: "speech", text: "안녕" },
  } as const;

  test("SD1. formatSseEvent로 쓴 글자를 다시 읽으면 같은 이벤트다", () => {
    const [raw] = parseSse(formatSseEvent(delta));
    expect(raw && decodeTurnEvent(raw)).toEqual({ ok: true, event: delta });
  });

  test("SD2. 깨진 JSON · 모르는 이벤트 · 숫자가 아닌 id는 거부한다", () => {
    expect(decodeTurnEvent({ event: "delta", id: "1", data: "{" })).toMatchObject({
      reason: "invalid-json",
    });
    expect(decodeTurnEvent({ event: "mystery", id: "1", data: "{}" })).toMatchObject({
      reason: "invalid-event",
    });
    expect(
      decodeTurnEvent({ event: "delta", id: "x", data: JSON.stringify(delta.data) }),
    ).toMatchObject({
      reason: "invalid-event",
    });
  });

  // SD3 — 친밀도 수치가 계약에 새어 들어오면 화면이 그것을 그릴 수 있게 됩니다. 모르는 키는 버려집니다.
  test("SD3. state에 친밀도 키를 실어도 결과에서 빠진다", () => {
    const decoded = decodeTurnEvent({
      event: "state",
      id: "2",
      data: JSON.stringify({ speechLevel: "casual", speechLevelChanged: true, intimacy: 42 }),
    });
    expect(decoded).toEqual({
      ok: true,
      event: { event: "state", id: 2, data: { speechLevel: "casual", speechLevelChanged: true } },
    });
  });
});
