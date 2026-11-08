import { describe, expect, test } from "vitest";

import { preStreamErrorBodySchema } from "./chat-send";
import { PRE_STREAM_ERRORS } from "./error-codes";
import {
  errorFixtures,
  messagesPageFixture,
  turnFixtureEvents,
  turnFixtureText,
  type TurnFixtureName,
} from "./fixtures";
import { companionMessagesPageSchema } from "./rpc";
import { decodeTurnEvent, parseSse } from "./sse-parse";
import { checkTurnOrder } from "./turn-order";

const turnNames = Object.keys(turnFixtureEvents) as TurnFixtureName[];

describe("턴 스트림 fixture", () => {
  // FX1 — FE가 재생하는 글자가 계약 검사와 순서 규칙을 통과합니다. 통과하지 않는 fixture는 FE를 틀린 모양에 맞추게 합니다.
  test.each(turnNames)("FX1. %s는 파싱 · 계약 검사 · 순서 규칙을 통과한다", (name) => {
    const decoded = parseSse(turnFixtureText(name)).map(decodeTurnEvent);
    const events = decoded.map((result) => {
      if (!result.ok) throw new Error(`${name}: ${result.reason} ${result.raw.event}`);
      return result.event;
    });
    expect(events).toEqual(turnFixtureEvents[name]);
    expect(checkTurnOrder(events)).toEqual({ ok: true });
  });

  test("FX2. 요청받은 다섯 경우(정상 · 교정 · 크레딧 부족 · 차단 · 위기)가 모두 있다", () => {
    expect(turnNames).toEqual(
      expect.arrayContaining([
        "turn-normal",
        "turn-with-correction",
        "turn-guardrail-blocked",
        "turn-crisis",
      ]),
    );
    expect(Object.keys(errorFixtures)).toContain("error-insufficient-credits");
  });
});

describe("사전 오류 · 메시지 목록 fixture", () => {
  test.each(Object.entries(errorFixtures))(
    "FX3. %s는 본문 계약을 통과하고 상태가 표와 같다",
    (_name, fixture) => {
      expect(preStreamErrorBodySchema.parse(fixture.body)).toEqual(fixture.body);
      expect(fixture.status).toBe(PRE_STREAM_ERRORS[fixture.body.error].status);
    },
  );

  test("FX4. 메시지 목록은 창구 함수 반환 계약을 통과한다", () => {
    expect(companionMessagesPageSchema.parse(messagesPageFixture)).toEqual(messagesPageFixture);
  });
});
