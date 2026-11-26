import { describe, expect, test } from "vitest";

import {
  missionSttFixtures,
  missionTtsFixture,
  missionTtsRequestFixtures,
  missionVoiceErrorFixtures,
} from "./fixtures";
import { missionDefinitionSchema, missionHintResponseSchema } from "./mission";
import { missionDefinitionFixture, missionHintFixture } from "./fixtures-mission";
import {
  MISSION_STT_MAX_BYTES,
  MISSION_STT_MAX_SECONDS,
  MISSION_STT_SAMPLE_RATE,
  MISSION_VOICE_ERRORS,
  missionSttFailure,
  missionSttResponseSchema,
  missionTtsRequestSchema,
  missionTtsResponseSchema,
  missionVoiceErrorBodySchema,
} from "./mission-voice";

const conversation = "6c2d8f3b-5d2e-4a8f-8b62-3e4f5a6b7c81";

describe("mission-stt · mission-tts 계약", () => {
  test("MV1. fixture가 응답 · 요청 · 오류 스키마를 지나고 오류 상태가 표와 같다", () => {
    for (const fixture of Object.values(missionSttFixtures))
      expect(missionSttResponseSchema.parse(fixture)).toEqual(fixture);
    for (const fixture of Object.values(missionTtsRequestFixtures))
      expect(missionTtsRequestSchema.parse(fixture)).toEqual(fixture);
    expect(missionTtsResponseSchema.parse(missionTtsFixture)).toEqual(missionTtsFixture);
    for (const fixture of Object.values(missionVoiceErrorFixtures)) {
      expect(missionVoiceErrorBodySchema.parse(fixture.body)).toEqual(fixture.body);
      expect(fixture.status).toBe(MISSION_VOICE_ERRORS[fixture.body.error as "speech_busy"].status);
    }
  });

  test("MV2. 합성 요청은 메시지 id · 힌트 번호만 받는다 — 임의의 글(text)은 계약에 없다", () => {
    expect(
      missionTtsRequestSchema.safeParse({
        contract_version: 1,
        conversation_id: conversation,
        kind: "text",
        text: "아무 글이나 읽어 줘",
      }).success,
    ).toBe(false);
    expect(
      missionTtsRequestSchema.safeParse({
        contract_version: 1,
        conversation_id: conversation,
        kind: "hint",
        hint_no: 0,
      }).success,
    ).toBe(false);
    expect(
      missionTtsRequestSchema.safeParse({
        contract_version: 1,
        conversation_id: conversation,
        kind: "message",
        message_id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  test("MV3. 받아 적기 실패 → 앱 화면의 세 갈래(empty · busy · server)", () => {
    expect(missionSttFailure("speech_empty")).toBe("empty");
    expect(missionSttFailure("speech_busy")).toBe("busy");
    expect(missionSttFailure("voice_limit")).toBe("busy");
    expect(missionSttFailure("speech_unavailable")).toBe("server");
    expect(missionSttFailure("mission_closed")).toBe("server");
  });

  test("MV4. 30초 16kHz mono 16-bit WAV는 크기 상한 안이다", () => {
    expect(44 + MISSION_STT_SAMPLE_RATE * 2 * MISSION_STT_MAX_SECONDS).toBeLessThan(
      MISSION_STT_MAX_BYTES,
    );
  });

  test("MV5. 미션 정의의 counterpart.voice(선택) · 힌트 응답의 hintNo(선택)", () => {
    const withVoice = {
      ...missionDefinitionFixture,
      counterpart: { ...missionDefinitionFixture.counterpart, voice: "rCm09Tf1yMYbOyCRLDyB" },
    };
    expect(missionDefinitionSchema.safeParse(withVoice).success).toBe(true);
    expect(
      missionDefinitionSchema.safeParse({
        ...withVoice,
        counterpart: { ...withVoice.counterpart, voice: "../etc" },
      }).success,
    ).toBe(false);
    expect(missionHintResponseSchema.parse({ ...missionHintFixture, hintNo: 1 })).toMatchObject({
      hintNo: 1,
    });
    expect(missionHintResponseSchema.safeParse(missionHintFixture).success).toBe(true);
  });
});
