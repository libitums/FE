// 미션 마이크의 결선입니다 — 대본형 롤플레이와 같은 마이크 권한 흐름(ADR-0206: 사전 안내 → 시스템 권한 → 거부 시트 · 설정 열기)을
// main의 훅 · 시트(`useMicPermission` · `MicPermissionSheet`) 그대로 태우고, 그 아래 녹음 · 받아 적기는 미션 음성(`useMissionVoice`)이
// 맡습니다. 열 때 확인하지 않습니다 — 미션은 글로도 하므로 마이크를 처음 누를 때 사전 안내가 섭니다(대본형은 Start, 표의 「차이」).

import { micGateOf, micPrimerSeenKey } from "../../lib/mic-permission";
import type { MicGate } from "../../lib/mic-permission";
import { getSpeechStatus } from "../../lib/speech-recognition";
import { getItem } from "../../lib/storage";
import { useMicPermission } from "../../components/mic-permission/use-mic-permission";
import type { MicPermission } from "../../components/mic-permission/use-mic-permission";
import { missionMicStep } from "./mission-mic";
import type { MissionVoicePorts } from "./roleplay-mission.contract";
import { useMissionVoice } from "./use-mission-voice";
import type { HeardDecision, MissionVoiceControl } from "./use-mission-voice";

export type MissionMic = {
  readonly voice: MissionVoiceControl;
  readonly permission: MicPermission;
  /** 마이크 단추 하나 — 녹음 중이면 멈추고, 아니면 재생을 멈추고(끊고 말하기) 권한을 본 뒤 녹음합니다. */
  readonly tap: (onHeard: (decision: HeardDecision) => void) => void;
};

export function useMissionMic(ports: MissionVoicePorts, conversationId: string | null): MissionMic {
  // 거부 시트의 Continue without speaking은 시트만 닫습니다 — 글 입력은 그대로이고, 그 화면에서는 다시 띄우지 않습니다.
  const permission = useMicPermission({
    surface: "roleplay",
    checkOnOpen: false,
    onSkipSpeaking: () => undefined,
  });
  const voice = useMissionVoice(ports, conversationId, permission.onDenied);

  const tap = (onHeard: (decision: HeardDecision) => void) => {
    "background only";
    if (voice.state.rec !== "idle") {
      voice.tapMic(onHeard);
      return;
    }
    voice.stopPlayback();
    const proceed = (gate: MicGate | null) => {
      const step = missionMicStep(gate, getItem(micPrimerSeenKey) === "1");
      if (step === "prime") {
        permission.openPrime();
        return;
      }
      if (step === "denied") {
        voice.refuse("micDenied");
        permission.onDenied();
        return;
      }
      voice.tapMic(onHeard);
    };
    if (getSpeechStatus((status) => proceed(micGateOf(status))) === "unavailable") proceed(null);
  };

  return { voice, permission, tap };
}
