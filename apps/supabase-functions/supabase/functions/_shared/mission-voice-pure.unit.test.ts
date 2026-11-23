import { describe, expect, test } from "vitest";

import { AUTOSEND_DEFAULTS, autosendDecision, sttFeatures } from "./mission-voice-autosend.ts";
import { defaultMissionVoice, missionVoiceEnvFrom } from "./mission-voice-env.ts";
import { native, sino, spokenText } from "./mission-voice-spoken.ts";
import { checkWav, silentWav, wavInfo } from "./mission-voice-wav.ts";

const conf = (...values: number[]) => values.map((confidence) => ({ confidence }));

describe("바로 보내기 판단(autosendDecision) — 대시보드와 같은 규칙 · 문턱", () => {
  test("VA1. 대시보드 단위 테스트와 같은 사례", () => {
    const ok = sttFeatures("카드로 할게요.", conf(0.99, 0.97), 1.2);
    expect(ok).toEqual({ confMin: 0.97, confMean: 0.98, chars: 6, hangulRatio: 1, seconds: 1.2 });
    expect(autosendDecision(ok)).toEqual({ autoSend: true, reason: "ok" });
    expect(autosendDecision(sttFeatures("", [], 1)).reason).toBe("empty");
    expect(autosendDecision(sttFeatures("네", conf(0.99), 0.2)).reason).toBe("too_short");
    expect(autosendDecision(sttFeatures("I will pay by card", conf(0.99), 1.2)).reason).toBe(
      "not_korean",
    );
    expect(autosendDecision(sttFeatures("카드로 할게요", conf(0.99, 0.3), 1.2)).reason).toBe(
      "low_confidence",
    );
    const none = sttFeatures("카드로 할게요", [{ confidence: null }], 1.2);
    expect(autosendDecision(none)).toEqual({ autoSend: false, reason: "no_confidence" });
    expect(autosendDecision(none, { ...AUTOSEND_DEFAULTS, withoutConfidence: true }).autoSend).toBe(
      true,
    );
  });

  test("VA2. 실측 사례(맥미니 Scribe v3 150회, 문턱 0.85 · 0.93) — 뭉개진 소리는 확인으로, 고쳐 적기는 못 가림", () => {
    // 또렷한 초급 문장(맞음 87 중 78이 바로 보냄): 확신도 0.95 이상.
    expect(autosendDecision(sttFeatures("삼천 원이요?", conf(0.98, 0.96), 1.1)).autoSend).toBe(
      true,
    );
    // 소음 · 빠른 말로 다른 말로 적힘(22 중 0이 바로 보냄): 한 낱말이 0.85 아래.
    expect(
      autosendDecision(sttFeatures("따뜻한 물 있어요", conf(0.97, 0.71, 0.9), 1.4)).reason,
    ).toBe("low_confidence");
    // 평균만 낮은 경우도 확인(최소 0.86 · 평균 0.9).
    expect(autosendDecision(sttFeatures("영수증 주세요", conf(0.86, 0.94), 1)).reason).toBe(
      "low_confidence",
    );
    // 틀린 발음을 바른 말로 고쳐 적음(13 중 13이 바로 보냄, 확신도 0.90 ~ 1.0) — 확신도로는 못 가린다(문서 §6 한계).
    expect(autosendDecision(sttFeatures("카드로 할게요", conf(0.95, 0.99), 1.2)).autoSend).toBe(
      true,
    );
    // 영어 문장(6 중 0) · 한국어 반 영어 반.
    expect(
      autosendDecision(sttFeatures("Can I get a 라떼", conf(0.99, 0.99, 0.99, 0.99, 0.99), 1.5))
        .reason,
    ).toBe("not_korean");
    // 0.3초 녹음은 Scribe가 빈 글을 줌 → empty(핸들러는 422 speech_empty).
    expect(autosendDecision(sttFeatures("", [], 0.3)).reason).toBe("empty");
  });
});

describe("읽기 글 정규화(spokenText) — 대시보드 stt_score 숫자 규칙", () => {
  test("VN1. 개수 단위 앞 고유어 수, 그 밖 한자어 수", () => {
    expect(spokenText("1잔 주세요")).toBe("한잔 주세요");
    expect(spokenText("3,000원입니다.")).toBe("삼천원입니다.");
    expect(spokenText("4,500원이에요")).toBe("사천오백원이에요");
    expect(spokenText("아메리카노 2잔, 20개, 3시간")).toBe("아메리카노 두잔, 스무개, 세시간");
    expect(spokenText("1번째 · 2번째")).toBe("첫번째 · 두번째");
    expect(spokenText("100명")).toBe("백명");
    expect(spokenText("10500원 1, 2")).toBe("만오백원 일, 이");
    expect(spokenText("숫자 없음")).toBe("숫자 없음");
    expect([sino(0), sino(11), sino(20_000), native(31)]).toEqual(["영", "십일", "이만", "서른한"]);
  });
});

describe("WAV 검사", () => {
  test("VW1. 16kHz mono 16-bit만 · 30초(+0.5초 여유)까지", () => {
    expect(wavInfo(silentWav(1.6))).toMatchObject({
      rate: 16_000,
      channels: 1,
      bits: 16,
      seconds: 1.6,
    });
    expect(checkWav(silentWav(30.4)).ok).toBe(true);
    expect(checkWav(silentWav(30.6))).toMatchObject({ ok: false, code: "audio_too_long" });
    expect(checkWav(silentWav(1, 8000))).toMatchObject({ ok: false, code: "invalid_audio" });
    expect(checkWav(new Uint8Array(10))).toMatchObject({ ok: false, code: "invalid_audio" });
  });
});

describe("환경(missionVoiceEnvFrom)", () => {
  const base = {
    SUPABASE_URL: "https://ref.supabase.co",
    SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
  };
  const from = (extra: Record<string, string>) =>
    missionVoiceEnvFrom((name) => (({ ...base, ...extra }) as Record<string, string>)[name]);

  test("VE1. 기본값 = 실험실 검증 값 · 키 이름은 1단계와 같은 ELEVENLABS_API_KEY · 문턱 env", () => {
    const env = from({})!;
    expect(env).toMatchObject({
      elevenKey: null,
      sttModel: defaultMissionVoice.sttModel,
      ttsModel: "eleven_v4_turbo",
      defaultVoice: "l6fNdLYgoqjfTIPUeFc9",
      zeroRetention: true,
      autosend: AUTOSEND_DEFAULTS,
    });
    const tuned = from({
      ELEVENLABS_API_KEY: "k",
      COMPANION_MISSION_AUTOSEND_CONF_MIN: "0.8",
      COMPANION_MISSION_AUTOSEND_CONF_MEAN: "2",
      COMPANION_MISSION_AUTOSEND_WITHOUT_CONFIDENCE: "on",
      COMPANION_MISSION_TTS_VOICE: "../bad",
      COMPANION_MISSION_STT_ZERO_RETENTION: "off",
    })!;
    expect(tuned.elevenKey).toBe("k");
    expect(tuned.autosend).toMatchObject({ confMin: 0.8, confMean: 0.93, withoutConfidence: true });
    expect(tuned.defaultVoice).toBe("l6fNdLYgoqjfTIPUeFc9");
    expect(tuned.zeroRetention).toBe(false);
    expect(from({ SUPABASE_URL: "http://evil" })).toBeNull();
  });
});
