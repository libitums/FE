import { describe, expect, test } from "vitest";

import {
  missionSttResponseSchema,
  missionVoiceErrorBodySchema,
} from "./companion-contract/index.ts";
import { createMissionSttHandler } from "./mission-stt-handler.ts";
import {
  fakeVoice,
  scribeOk,
  sttRequest,
  voiceConversation,
  voiceEnv,
  voiceUser,
} from "./mission-voice.test-support.ts";
import { silentWav } from "./mission-voice-wav.ts";

// mission-stt — 가짜 ElevenLabs(Scribe) · 가짜 RPC. 실제 SQL에 무는 상한 · 소유는 `mission-voice.integration.test.ts`.

const run = async (fake: ReturnType<typeof fakeVoice>, request = sttRequest()) => {
  const response = await createMissionSttHandler(fake.deps)(request);
  return { response, body: (await response.json()) as Record<string, unknown> };
};
const errorOf = async (fake: ReturnType<typeof fakeVoice>, request = sttRequest()) => {
  const { response, body } = await run(fake, request);
  return { status: response.status, error: missionVoiceErrorBodySchema.parse(body).error, body };
};
const finishes = (fake: ReturnType<typeof fakeVoice>) =>
  fake.rpc.filter((call) => call.fn === "companion_mission_voice_finish").map((call) => call.args);

describe("mission-stt", () => {
  test("VS1. 정상 — 판 확인 · Scribe(kor · 태그 끔 · 낱말 시각) · 바로 보내기 판단 · 기록", async () => {
    const fake = fakeVoice({ scribe: [scribeOk("카드로 할게요", [-0.01, -0.03])] });
    const { response, body } = await run(fake);
    expect(response.status).toBe(200);
    const parsed = missionSttResponseSchema.parse(body);
    expect(parsed).toMatchObject({ text: "카드로 할게요", autoSend: true, reason: "ok" });
    expect(parsed.words.map((word) => word.text)).toEqual(["카드로", "할게요"]);
    expect(parsed.features.seconds).toBe(1.6);
    const begin = fake.rpc.find((call) => call.fn === "companion_mission_voice_begin")!.args;
    expect(begin).toMatchObject({
      p_user_id: voiceUser,
      p_conversation_id: voiceConversation,
      p_kind: "stt",
      p_seconds: 1.6,
      p_target: null,
    });
    const sent = fake.vendor[0]!;
    expect(sent.url).toBe("https://api.elevenlabs.io/v1/speech-to-text?enable_logging=false");
    const form = sent.body as FormData;
    expect(
      Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")),
    ).toEqual({
      model_id: "scribe_v3",
      language_code: "kor",
      tag_audio_events: "false",
      timestamps_granularity: "word",
    });
    expect(form.has("diarize")).toBe(false);
    expect(finishes(fake)).toEqual([
      expect.objectContaining({ p_call_id: "call-1", p_outcome: "ok" }),
    ]);
    // 기록 · 로그에 글 · 소리를 싣지 않는다.
    expect(JSON.stringify(fake.rpc) + JSON.stringify(fake.logs)).not.toContain("카드로");
  });

  test("VS2. 확신도가 낮으면 입력 칸에서 확인(low_confidence) · 무보존 끄기(env off)는 쿼리를 싣지 않음", async () => {
    const fake = fakeVoice({
      env: voiceEnv({ COMPANION_MISSION_STT_ZERO_RETENTION: "off" }),
      scribe: [scribeOk("아이스 라떼 주세요", [-0.02, -0.5, -0.01])],
    });
    const { body } = await run(fake);
    expect(body).toMatchObject({ autoSend: false, reason: "low_confidence" });
    expect(fake.vendor[0]!.url).toBe("https://api.elevenlabs.io/v1/speech-to-text");
  });

  test("VS3. 인증 없음 → 401, 벤더 · RPC를 부르지 않음", async () => {
    const fake = fakeVoice();
    expect((await errorOf(fake, sttRequest({ token: null }))).status).toBe(401);
    expect((await errorOf(fake, sttRequest({ token: "someone-else" }))).status).toBe(401);
    expect(fake.vendor).toEqual([]);
    expect(fake.rpc).toEqual([]);
  });

  test("VS4. 남의 판 · 닫힌 판 · 끝난 판 → SQL 거절 그대로(404 · 409), 벤더를 부르지 않음", async () => {
    for (const [begin, status, code] of [
      [{ result: "mission_not_found" }, 404, "mission_not_found"],
      [{ result: "mission_closed", detail: { status: "finished" } }, 409, "mission_closed"],
      [{ result: "mission_ended", detail: { endReason: "goals" } }, 409, "mission_ended"],
    ] as const) {
      const fake = fakeVoice({ begin });
      expect(await errorOf(fake)).toMatchObject({ status, error: code });
      expect(fake.vendor).toEqual([]);
    }
  });

  test("VS5. 너무 긴 녹음(31초) · WAV 아님 · 16kHz 아님 → 413 · 400, RPC도 부르지 않음", async () => {
    const fake = fakeVoice();
    expect(await errorOf(fake, sttRequest({ seconds: 31 }))).toMatchObject({
      status: 413,
      error: "audio_too_long",
    });
    expect(
      await errorOf(fake, sttRequest({ audio: new TextEncoder().encode("not a wav file at all") })),
    ).toMatchObject({ status: 400, error: "invalid_audio" });
    expect(await errorOf(fake, sttRequest({ audio: silentWav(1, 44_100) }))).toMatchObject({
      status: 400,
      error: "invalid_audio",
    });
    expect(fake.rpc).toEqual([]);
    expect(fake.vendor).toEqual([]);
  });

  test("VS6. 빈 결과 · 아주 짧은 녹음 → 422 speech_empty(짧으면 벤더를 부르지 않음)", async () => {
    const blank = fakeVoice({ scribe: [{ status: 200, body: { text: "  ", words: [] } }] });
    expect(await errorOf(blank)).toMatchObject({ status: 422, error: "speech_empty" });
    expect(finishes(blank)[0]).toMatchObject({ p_outcome: "empty" });
    const short = fakeVoice();
    expect(await errorOf(short, sttRequest({ seconds: 0.1 }))).toMatchObject({
      status: 422,
      error: "speech_empty",
    });
    expect(short.vendor).toEqual([]);
  });

  test("VS7. 429 → speech_busy(다시 하지 않음) · 5xx → 한 번 다시 · 두 번 다 5xx면 speech_unavailable", async () => {
    const busy = fakeVoice({ scribe: [{ status: 429 }] });
    expect(await errorOf(busy)).toMatchObject({ status: 429, error: "speech_busy" });
    expect(busy.vendor).toHaveLength(1);
    expect(finishes(busy)[0]).toMatchObject({ p_outcome: "busy" });

    const recovered = fakeVoice({ scribe: [{ status: 502 }, scribeOk("네", [-0.01])] });
    const { response } = await run(recovered);
    expect(response.status).toBe(200);
    expect(recovered.vendor).toHaveLength(2);
    expect(finishes(recovered)[0]).toMatchObject({
      p_meta: expect.objectContaining({ retries: 1 }),
    });

    const down = fakeVoice({ scribe: [{ status: 500 }, { status: 503 }] });
    expect(await errorOf(down)).toMatchObject({ status: 503, error: "speech_unavailable" });
    expect(finishes(down)[0]).toMatchObject({ p_outcome: "server" });
  });

  test("VS8. 시간 초과 → speech_unavailable(다시 하지 않음) · 연결 실패는 한 번 다시", async () => {
    const slow = fakeVoice({ scribe: [{ throws: "TimeoutError" }] });
    expect(await errorOf(slow)).toMatchObject({ status: 503, error: "speech_unavailable" });
    expect(slow.vendor).toHaveLength(1);
    const flaky = fakeVoice({ scribe: [{ throws: "TypeError" }, scribeOk("네", [-0.01])] });
    expect((await run(flaky)).response.status).toBe(200);
  });

  test("VS9. 한도 초과 → 429 voice_limit(scope) · 키 없음 → 503 voice_not_configured", async () => {
    const limited = fakeVoice({
      begin: { result: "voice_limit", detail: { scope: "mission", limit: 30 } },
    });
    expect(await errorOf(limited)).toMatchObject({
      status: 429,
      error: "voice_limit",
      body: { detail: { scope: "mission", limit: 30 } },
    });
    expect(limited.vendor).toEqual([]);
    const keyless = fakeVoice({ env: voiceEnv({ ELEVENLABS_API_KEY: "" }) });
    expect(await errorOf(keyless)).toMatchObject({ status: 503, error: "voice_not_configured" });
  });
});
