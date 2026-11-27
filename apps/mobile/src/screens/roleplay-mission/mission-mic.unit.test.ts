import { describe, expect, test } from "vitest";

import { missionMicMode, missionMicStep, missionMicUsable } from "./mission-mic";
import { initialMissionVoice } from "./mission-voice";
import type { MissionVoiceNotice, MissionVoiceState } from "./mission-voice.contract";

// `unit` 계층(MMIC-U1 ~): 미션 마이크 하나의 규칙 — 낭독 이름(대본형 `roleplayMicLabels`와 같은 셋), 장치 없음이면 끔,
// 누를 때 권한 단계(사전 안내 · 거부 시트 · 녹음).

const with_ = (patch: Partial<MissionVoiceState>): MissionVoiceState => ({
  ...initialMissionVoice,
  ...patch,
});

describe("missionMicMode", () => {
  test("MMIC-U1 녹음 중 stop, 받아 적는 중 speak(잠김), 확인 · 다시 말할 수 있는 실패 뒤 tryAgain", () => {
    expect(missionMicMode(initialMissionVoice)).toBe("speak");
    expect(missionMicMode(with_({ rec: "recording" }))).toBe("stop");
    expect(missionMicMode(with_({ rec: "transcribing" }))).toBe("speak");
    expect(missionMicMode(with_({ check: "heard" }))).toBe("tryAgain");
    const retry: MissionVoiceNotice[] = ["failed", "tooShort", "notHeard", "busy", "serverDown"];
    for (const notice of retry) expect(missionMicMode(with_({ notice }))).toBe("tryAgain");
    const still: MissionVoiceNotice[] = ["micDenied", "unavailable", "maxLength"];
    for (const notice of still) expect(missionMicMode(with_({ notice }))).toBe("speak");
  });

  test("MMIC-U2 장치 없음(unavailable)만 마이크를 끈다 — 권한 거부는 눌러서 시트 · 안내를 다시 본다", () => {
    expect(missionMicUsable(with_({ notice: "unavailable" }))).toBe(false);
    expect(missionMicUsable(with_({ notice: "micDenied" }))).toBe(true);
    expect(missionMicUsable(initialMissionVoice)).toBe(true);
  });
});

describe("missionMicStep", () => {
  test("MMIC-U3 묻지 않음 · 처음이면 사전 안내, 본 뒤면 녹음(시스템 창은 호스트), 거부면 거부 시트, 그 밖은 녹음", () => {
    expect(missionMicStep("ask", false)).toBe("prime");
    expect(missionMicStep("ask", true)).toBe("record");
    expect(missionMicStep("denied", false)).toBe("denied");
    expect(missionMicStep("ready", false)).toBe("record");
    // 인식기만 없는 기기 · 권한 조회가 안 되는 호스트도 녹음 — 미션은 서버가 받아 적습니다.
    expect(missionMicStep("unavailable", false)).toBe("record");
    expect(missionMicStep(null, false)).toBe("record");
  });
});
