// 미션 마이크 하나의 순수 규칙입니다 — 말하기 · 말 멈추기 · 다시 말하기를 마이크 단추 하나가 맡습니다(대본형 롤플레이와 같은 방식,
// ADR-0206 D5 개정 ⟨마이크 하나⟩). 같은 일을 하는 글 단추(전의 「Say it again」)를 따로 두지 않습니다. UI를 import하지 않습니다.

import type { MicGate } from "../../lib/mic-permission";
import type { MissionVoiceNotice, MissionVoiceState } from "./mission-voice.contract";

/** 마이크의 낭독 이름 — 녹음 중 「Stop」, 다시 말할 수 있는 실패 · 받아 적은 글 확인 뒤 「Try again」, 그 밖 「Speak」. */
export type MissionMicMode = "speak" | "stop" | "tryAgain";

/** 곧바로 다시 말하면 풀릴 수 있는 안내 — 기기 쪽 실패 · 짧음 · 못 들음 · 붐빔 · 서버 무응답(ADR-0206 D5의 「다시 말할 수 있는 실패」). */
const RETRYABLE: ReadonlySet<MissionVoiceNotice> = new Set([
  "failed",
  "tooShort",
  "notHeard",
  "busy",
  "serverDown",
]);

export function missionMicMode(voice: MissionVoiceState): MissionMicMode {
  if (voice.rec === "recording") return "stop";
  if (voice.rec !== "idle") return "speak";
  if (voice.check !== null) return "tryAgain";
  return voice.notice !== null && RETRYABLE.has(voice.notice) ? "tryAgain" : "speak";
}

/** 녹음을 시작할 장치가 없으면(진짜 불가) 마이크를 끕니다 — 글로 이어 갑니다. 권한 거부는 끄지 않습니다(누르면 거부 시트 · 안내). */
export function missionMicUsable(voice: MissionVoiceState): boolean {
  return voice.notice !== "unavailable";
}

/**
 * 마이크를 눌렀을 때 녹음 전에 할 일 — 묻지 않은 권한이면 사전 안내(처음 한 번), 거부면 거부 시트, 그 밖은 녹음.
 * 권한 조회가 안 되는 호스트(`null`)나 인식기만 없는 기기는 녹음합니다 — 미션은 서버가 받아 적어 기기 인식기가 필요 없습니다.
 */
export function missionMicStep(
  gate: MicGate | null,
  primerSeen: boolean,
): "prime" | "denied" | "record" {
  if (gate === "ask" && !primerSeen) return "prime";
  return gate === "denied" ? "denied" : "record";
}
