// 미션 음성의 결선입니다(파이프라인 문서 §6.1) — 마이크는 눌러 시작 · 눌러 끝, 받아 적기는 서버(`transcribe`), 받아 적은 글은
// 서버 판단(`autoSend`)으로 바로 보내거나 입력 칸에서 확인. 상대역 말은 서버 합성(`speak`) → 기기 재생, 자동 재생은 자리마다 한 번.
// 한 번에 한 목소리(대본형 롤플레이와 같은 원칙, ADR-0201 D6 적용 2 개정): 새 재생은 앞 재생을 멈추고, 녹음 중에는 재생하지 않으며,
// 마이크를 누르면 재생을 멈춥니다(끊고 말하기). 앱이 뒤로 가거나 화면을 떠나면 녹음을 버리고 재생을 멈춥니다.

import { useEffect, useLynxGlobalEventListener, useReducer, useRef } from "@lynx-js/react";

import {
  initialMissionVoice,
  MISSION_MIN_RECORD_SECONDS,
  missionVoiceReducer,
  transcriptDecision,
} from "./mission-voice";
import type { TranscriptDecision } from "./mission-voice";
import type {
  MissionAudioClip,
  MissionSpeakRequest,
  MissionVoiceAction,
  MissionVoiceNotice,
  MissionVoiceState,
} from "./mission-voice.contract";
import type { MissionVoicePorts } from "./roleplay-mission.contract";

/** 받아 적은 글을 화면에 넘깁니다 — 바로 보내기, 또는 입력 칸에 넣어 확인. */
export type HeardDecision = Exclude<TranscriptDecision, { kind: "notice" }>;

export type MissionVoiceControl = {
  readonly state: MissionVoiceState;
  /** 마이크 단추 — 녹음 중이면 멈추고 받아 적고, 아니면 재생을 멈추고(끊고 말하기) 녹음을 시작합니다. */
  readonly tapMic: (onHeard: (decision: HeardDecision) => void) => void;
  /** 녹음을 버립니다(보내지 않음). */
  readonly cancelRecording: () => void;
  /** 다시 듣기 · 힌트 예문 듣기. `key`는 재생 표시 자리(메시지 id · `hint`). */
  readonly play: (key: string, request: MissionSpeakRequest) => void;
  /** 자동 재생 — 같은 자리는 한 판에 한 번만. */
  readonly autoPlay: (key: string, request: MissionSpeakRequest) => void;
  readonly stopPlayback: () => void;
  readonly clearCheck: () => void;
  /** 녹음을 시작하지 않고 안내만 세웁니다 — 권한이 거부된 채 마이크를 눌렀을 때(`micDenied`). */
  readonly refuse: (notice: MissionVoiceNotice) => void;
};

/**
 * @param onDenied 녹음 시작이 권한 거부로 막혔을 때 — 화면이 거부 시트(ADR-0206 D2)를 띄웁니다.
 */
export function useMissionVoice(
  ports: MissionVoicePorts,
  conversationId: string | null,
  onDenied?: () => void,
): MissionVoiceControl {
  const [state, dispatch] = useReducer(missionVoiceReducer, initialMissionVoice);
  const mounted = useRef(true);
  const attempt = useRef(0);
  const playToken = useRef(0);
  const spoken = useRef(new Set<string>());
  const onHeard = useRef<((decision: HeardDecision) => void) | null>(null);
  const recording = useRef(false);
  const live = useRef({ ports, conversationId, onDenied });
  live.current = { ports, conversationId, onDenied };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      attempt.current += 1;
      playToken.current += 1;
      live.current.ports.device.cancelRecording();
      live.current.ports.device.stopPlayback();
    };
  }, []);

  const safe = (action: MissionVoiceAction) => {
    if (mounted.current) dispatch(action);
  };

  // 앱이 뒤로 가면 녹음을 버리고 재생을 멈춥니다 — 돌아와서 다시 누르면 됩니다(대본형 롤플레이와 같은 규칙).
  useLynxGlobalEventListener("appDidEnterBackground", () => {
    "background only";
    attempt.current += 1;
    playToken.current += 1;
    if (recording.current) live.current.ports.device.cancelRecording();
    recording.current = false;
    live.current.ports.device.stopPlayback();
    safe({ type: "record-cancelled" });
    safe({ type: "play-stopped" });
  });

  const transcribe = (mine: number, clip: MissionAudioClip | null) => {
    const { ports: current, conversationId: id } = live.current;
    if (attempt.current !== mine) return;
    if (clip === null || id === null) {
      safe({ type: "record-failed", notice: "failed" });
      return;
    }
    if (clip.seconds < MISSION_MIN_RECORD_SECONDS) {
      safe({ type: "record-failed", notice: "tooShort" });
      return;
    }
    current.transcribe(id, clip).then(
      (transcript) => {
        if (attempt.current !== mine || !mounted.current) return;
        const decision = transcriptDecision(transcript);
        if (decision.kind === "notice") {
          dispatch({ type: "record-failed", notice: decision.notice });
          return;
        }
        dispatch({
          type: "transcribed",
          check: decision.kind === "confirm" ? decision.check : null,
        });
        onHeard.current?.(decision);
      },
      () => {
        if (attempt.current === mine) safe({ type: "record-failed", notice: "serverDown" });
      },
    );
  };

  const stop = (limit: boolean) => {
    if (!recording.current) return;
    recording.current = false;
    const mine = attempt.current;
    safe({ type: "record-stopped", limit });
    live.current.ports.device.stopRecording().then(
      (clip) => transcribe(mine, clip),
      () => {
        if (attempt.current === mine) safe({ type: "record-failed", notice: "failed" });
      },
    );
  };

  const stopPlayback = () => {
    playToken.current += 1;
    live.current.ports.device.stopPlayback();
    safe({ type: "play-stopped" });
  };

  const play = (key: string, request: MissionSpeakRequest) => {
    const { ports: current, conversationId: id } = live.current;
    if (id === null || recording.current) return;
    playToken.current += 1;
    const token = playToken.current;
    current.device.stopPlayback();
    safe({ type: "play-loading", key });
    const ended = () => {
      if (playToken.current === token) safe({ type: "play-ended", key });
    };
    current.speak(id, request).then((speech) => {
      if (playToken.current !== token || !mounted.current) return;
      if (speech.kind === "failed") {
        ended();
        return;
      }
      const outcome = current.device.play(speech.url, ended);
      if (outcome === "started") safe({ type: "play-started", key });
      else ended();
    }, ended);
  };

  return {
    state,
    tapMic: (heard) => {
      "background only";
      if (state.rec === "transcribing") return;
      if (recording.current) {
        stop(false);
        return;
      }
      stopPlayback();
      attempt.current += 1;
      const mine = attempt.current;
      onHeard.current = heard;
      recording.current = true;
      live.current.ports.device
        .startRecording({
          onTick: (seconds, level) => {
            if (attempt.current === mine) safe({ type: "record-tick", seconds, level });
          },
          onLimit: () => {
            if (attempt.current === mine) stop(true);
          },
        })
        .then(
          (result) => {
            if (attempt.current !== mine) return;
            if (result === "started") {
              safe({ type: "record-started" });
              return;
            }
            recording.current = false;
            safe({
              type: "record-failed",
              notice: result === "denied" ? "micDenied" : "unavailable",
            });
            if (result === "denied") live.current.onDenied?.();
          },
          () => {
            if (attempt.current !== mine) return;
            recording.current = false;
            safe({ type: "record-failed", notice: "failed" });
          },
        );
    },
    cancelRecording: () => {
      "background only";
      attempt.current += 1;
      if (recording.current) live.current.ports.device.cancelRecording();
      recording.current = false;
      safe({ type: "record-cancelled" });
    },
    play: (key, request) => {
      "background only";
      play(key, request);
    },
    autoPlay: (key, request) => {
      "background only";
      if (spoken.current.has(key)) return;
      spoken.current.add(key);
      play(key, request);
    },
    stopPlayback: () => {
      "background only";
      stopPlayback();
    },
    clearCheck: () => {
      "background only";
      safe({ type: "check-cleared" });
    },
    refuse: (notice) => {
      "background only";
      safe({ type: "record-failed", notice });
    },
  };
}
