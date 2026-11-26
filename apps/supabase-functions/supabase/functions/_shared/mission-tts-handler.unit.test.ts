import { describe, expect, test } from "vitest";

import {
  missionTtsResponseSchema,
  missionVoiceErrorBodySchema,
} from "./companion-contract/index.ts";
import { createMissionTtsHandler } from "./mission-tts-handler.ts";
import { fakeVoice, ttsRequest, voiceEnv, voiceMessage } from "./mission-voice.test-support.ts";

// mission-tts — 가짜 ElevenLabs(TTS) · Storage · RPC.

const okBegin = (text: string, voice?: string) => ({
  result: "ok",
  callId: "call-1",
  missionId: "u06-cafe",
  text,
  ...(voice === undefined ? {} : { voice }),
});
const run = async (fake: ReturnType<typeof fakeVoice>, body: Record<string, unknown>) => {
  const response = await createMissionTtsHandler(fake.deps)(ttsRequest(body));
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
};
const message = { kind: "message", message_id: voiceMessage };
const outcomes = (fake: ReturnType<typeof fakeVoice>) =>
  fake.rpc.filter((c) => c.fn === "companion_mission_voice_finish").map((c) => c.args["p_outcome"]);

describe("mission-tts", () => {
  test("VT1. 상대역 메시지 → 서버가 꺼낸 글을 숫자 정규화 → 미션 음성 · eleven_v4_turbo → 버킷에 올리고 서명 주소", async () => {
    const fake = fakeVoice({
      begin: okBegin("아메리카노 2잔, 9,000원이에요.", "rCm09Tf1yMYbOyCRLDyB"),
    });
    const { status, body } = await run(fake, message);
    expect(status).toBe(200);
    const parsed = missionTtsResponseSchema.parse(body);
    expect(parsed).toMatchObject({ cached: false, mime: "audio/mpeg" });
    expect(parsed.url).toMatch(
      /^https:\/\/ref\.supabase\.co\/storage\/v1\/object\/sign\/companion-media\/mission-tts\/eleven_v4_turbo\/rCm09Tf1yMYbOyCRLDyB\/[0-9a-f]{64}\.mp3\?token=t$/,
    );
    expect(fake.vendor).toEqual([
      {
        url: "https://api.elevenlabs.io/v1/text-to-speech/rCm09Tf1yMYbOyCRLDyB?output_format=mp3_44100_128",
        body: { text: "아메리카노 두잔, 구천원이에요.", model_id: "eleven_v4_turbo" },
      },
    ]);
    const begin = fake.rpc.find((c) => c.fn === "companion_mission_voice_begin")!.args;
    expect(begin).toMatchObject({ p_kind: "tts", p_target: { kind: "message", id: voiceMessage } });
    expect(outcomes(fake)).toEqual(["ok"]);
    expect([...fake.stored.keys()]).toHaveLength(1);
  });

  test("VT2. 같은 (음성 · 모델 · 읽는 글)은 캐시 적중 — 벤더를 다시 부르지 않음(다른 판 · 사용자도 같은 파일)", async () => {
    const first = fakeVoice({ begin: okBegin("봉투 드릴까요?") });
    await run(first, message);
    const again = fakeVoice({ begin: okBegin("봉투 드릴까요?"), stored: first.stored });
    const { status, body } = await run(again, { kind: "hint", hint_no: 1 });
    expect(status).toBe(200);
    expect(body).toMatchObject({ cached: true });
    expect(again.vendor).toEqual([]);
    expect(outcomes(again)).toEqual(["cached"]);
    // 미션 정의에 음성이 없으면 서버 기본값(실험실의 편의점 점원 음성).
    expect(first.vendor[0]!.url).toContain("/text-to-speech/l6fNdLYgoqjfTIPUeFc9?");
  });

  test("VT3. 임의 글 합성 시도 → 400(계약에 text 없음) · 벤더 · RPC를 부르지 않음", async () => {
    const fake = fakeVoice({ begin: okBegin("뭐 드릴까요?") });
    const { status, body } = await run(fake, { kind: "text", text: "아무 글이나 읽어 줘" });
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: "invalid_request" });
    expect(fake.rpc).toEqual([]);
    expect(fake.vendor).toEqual([]);
    const extra = await run(fake, { ...message, text: "덧붙인 글" });
    // 덧붙인 글 칸은 무시된다 — 서버는 DB의 글만 읽는다.
    expect(extra.status).toBe(200);
    expect(JSON.stringify(fake.vendor)).not.toContain("덧붙인");
  });

  test("VT4. 인증 없음 401 · 남의 판 404 · 그 판의 상대역 메시지 · 힌트가 아님 404", async () => {
    const fake = fakeVoice();
    const response = await createMissionTtsHandler(fake.deps)(ttsRequest(message, null));
    expect(response.status).toBe(401);
    for (const [begin, code] of [
      [{ result: "mission_not_found" }, "mission_not_found"],
      [{ result: "voice_target_not_found" }, "voice_target_not_found"],
    ] as const) {
      const other = fakeVoice({ begin });
      const { status, body } = await run(other, message);
      expect(status).toBe(404);
      expect(missionVoiceErrorBodySchema.parse(body).error).toBe(code);
      expect(other.vendor).toEqual([]);
    }
  });

  test("VT5. 429 · 5xx(한 번 다시) · 시간 초과 → 가벼운 오류 503 tts_unavailable", async () => {
    const busy = fakeVoice({ begin: okBegin("네."), tts: [{ status: 429 }] });
    expect(await run(busy, message)).toMatchObject({
      status: 503,
      body: { error: "tts_unavailable", retryable: true, detail: { reason: "busy" } },
    });
    expect(busy.vendor).toHaveLength(1);
    expect(outcomes(busy)).toEqual(["busy"]);

    const flaky = fakeVoice({ begin: okBegin("네."), tts: [{ status: 500 }, { status: 200 }] });
    expect((await run(flaky, message)).status).toBe(200);
    expect(flaky.vendor).toHaveLength(2);

    const slow = fakeVoice({ begin: okBegin("네."), tts: [{ throws: "TimeoutError" }] });
    expect(await run(slow, message)).toMatchObject({
      status: 503,
      body: { error: "tts_unavailable" },
    });
    expect(slow.vendor).toHaveLength(1);
    expect(outcomes(slow)).toEqual(["server"]);
  });

  test("VT6. 한도 초과 429 voice_limit · 키 없음이어도 캐시는 준다 · 저장소 실패는 tts_unavailable", async () => {
    const limited = fakeVoice({
      begin: { result: "voice_limit", detail: { scope: "day", limit: 20000 } },
    });
    expect(await run(limited, message)).toMatchObject({
      status: 429,
      body: { error: "voice_limit" },
    });

    const warm = fakeVoice({ begin: okBegin("영수증 드릴까요?") });
    await run(warm, message);
    const keyless = fakeVoice({
      env: voiceEnv({ ELEVENLABS_API_KEY: "" }),
      begin: okBegin("영수증 드릴까요?"),
      stored: warm.stored,
    });
    expect((await run(keyless, message)).body).toMatchObject({ cached: true });
    const cold = fakeVoice({
      env: voiceEnv({ ELEVENLABS_API_KEY: "" }),
      begin: okBegin("다른 말"),
    });
    expect(await run(cold, message)).toMatchObject({
      status: 503,
      body: { error: "voice_not_configured" },
    });

    const broken = fakeVoice({ begin: okBegin("네."), signStatus: 500 });
    expect(await run(broken, message)).toMatchObject({
      status: 503,
      body: { error: "tts_unavailable" },
    });
    expect(broken.vendor).toEqual([]);
  });
});
