// 롤플레이 미션의 음성(파이프라인 문서 §6 · §10.2 ⑤ — 서버 받아 적기 · 서버 합성, 계약 `mission-voice.ts`)의 타입 전용 계약입니다.
// 둘로 나눕니다: 기기 쪽(녹음 · 재생 — 호스트 네이티브 모듈이 채울 자리, `MissionAudioDevice`)과 서버 쪽(받아 적기 · 합성 —
// `MissionSource.transcribe` · `speak`). 지금은 가짜만 있습니다(`mission-fake-voice.ts`). 구현 · JSX를 두지 않습니다.

import type {
  MissionAutoSendReason,
  MissionSttResponse,
  MissionTtsRequest,
  MissionTtsResponse,
} from "@libitums/companion-contract";

/** 녹음 하나 — 호스트가 남긴 16kHz mono 16-bit PCM WAV 파일(0.4 ~ 30초)의 자리와 길이. */
export type MissionAudioClip = {
  /** 호스트가 준 파일 자리(예: 임시 폴더의 `file://…`). 앱은 열지 않고 출처의 `transcribe`에 그대로 넘깁니다. */
  readonly uri: string;
  readonly seconds: number;
};

/** 녹음 시작의 결과 — 권한 거부 · 장치(모듈) 없음은 시작하지 않습니다. */
export type MissionRecordStart = "started" | "denied" | "unavailable";

export type MissionRecordListener = {
  /** 녹음 중 눈금(약 0.1초마다) — 지난 시간과 입력 레벨(0 ~ 1). */
  readonly onTick: (seconds: number, level: number) => void;
  /** 30초 상한에 닿아 호스트가 저절로 멈췄습니다 — 화면은 `stop`을 불러 녹음을 받습니다. */
  readonly onLimit: () => void;
};

export type MissionPlayOutcome = "started" | "unavailable";

/**
 * 기기 쪽 포트 — 녹음과 재생. 실제 구현은 호스트 네이티브 모듈이 필요합니다(아직 없음, `apps/ios` · `apps/android` 밖에서 만들 수 없음):
 * 녹음은 새 모듈(마이크 권한 · 16kHz WAV · 레벨 · 30초 상한), 재생은 오디오 주소 재생 · 멈춤 · 끝 알림.
 */
export type MissionAudioDevice = {
  readonly startRecording: (listener: MissionRecordListener) => Promise<MissionRecordStart>;
  /** 녹음을 멈추고 파일을 받습니다. 녹음 중이 아니었거나 실패하면 `null`. */
  readonly stopRecording: () => Promise<MissionAudioClip | null>;
  /** 녹음을 버립니다(보내지 않음) — 그만두기 · 판 끝 · 화면을 떠날 때. */
  readonly cancelRecording: () => void;
  /** 오디오 주소를 처음부터 재생합니다. 새 재생은 앞 재생을 대신합니다. `onEnd`는 끝까지 들었을 때 한 번. */
  readonly play: (url: string, onEnd: () => void) => MissionPlayOutcome;
  readonly stopPlayback: () => void;
};

/** 받아 적기 뒤 바로 보낼지의 서버 판단 — 계약 그대로(`ok`만 바로, 나머지는 입력 칸에서 확인). */
export type { MissionAutoSendReason };

/**
 * `mission-stt`(계약 `mission-voice.ts`)의 결과 — 200이면 계약 응답 그대로, 아니면 서버 오류 본문의 `error`(예: `speech_empty` ·
 * `speech_busy` · `voice_limit` · `speech_unavailable`). 화면은 계약의 `missionSttFailure`로 세 갈래 안내를 고릅니다. 턴은 세지 않습니다.
 */
export type MissionTranscript =
  | ({ readonly kind: "heard" } & MissionSttResponse)
  | { readonly kind: "failed"; readonly error: string };

/**
 * `mission-tts`(계약)의 요청 중 출처가 받는 몫 — `contract_version` · `conversation_id`는 출처가 붙입니다. 상대역 메시지(진입 대사 포함)는
 * 메시지 id, 힌트 예문은 그 판의 힌트 번호(`mission-hint` 응답의 `hintNo`) — 서버는 앱이 보낸 글을 합성하지 않습니다.
 */
export type MissionSpeakRequest =
  | Pick<Extract<MissionTtsRequest, { kind: "message" }>, "kind" | "message_id">
  | Pick<Extract<MissionTtsRequest, { kind: "hint" }>, "kind" | "hint_no">;

/** 합성 결과 — 200이면 계약 응답(서명된 mp3 주소 · 만료), 어느 오류든 실패(조용히 — 글자는 그대로, 대화는 이어짐). */
export type MissionSpeech =
  | ({ readonly kind: "audio" } & MissionTtsResponse)
  | { readonly kind: "failed" };

// ------------------------------------------------------------------ 음성의 화면 상태

/**
 * 입력 줄 위 안내 — 녹음 · 받아 적기 실패(문서 §6.5 문구 표). `failed`는 녹음을 시작한 뒤 기기 쪽에서 실패한 것(파일 없음 · 오류)으로
 * 대본형 롤플레이의 인식 실패와 같은 문구 · 같은 다시 말하기입니다(ADR-0206 D5). `unavailable`은 녹음을 시작하지 못함(장치 없음 — 진짜 불가).
 */
export type MissionVoiceNotice =
  | "failed"
  | "tooShort"
  | "notHeard"
  | "busy"
  | "serverDown"
  | "micDenied"
  | "maxLength"
  | "unavailable";

export type MissionPlayback = {
  /** 지금 재생(또는 합성 중)인 자리 — 메시지 id 또는 `hint`. */
  readonly key: string | null;
  readonly status: "idle" | "loading" | "playing";
};

export type MissionVoiceState = {
  readonly rec: "idle" | "recording" | "transcribing";
  readonly seconds: number;
  readonly level: number;
  readonly notice: MissionVoiceNotice | null;
  /** 받아 적은 글을 입력 칸에 넣고 확인을 부탁하는 중 — 까닭에 따라 문구가 다릅니다. */
  readonly check: "heard" | "notKorean" | null;
  readonly playback: MissionPlayback;
};

export type MissionVoiceAction =
  | { readonly type: "record-started" }
  | { readonly type: "record-tick"; readonly seconds: number; readonly level: number }
  /** 녹음을 멈추고 받아 적기로 — 30초 상한으로 멈췄으면 `limit`(안내 「30초까지」가 받아 적은 뒤에도 남음). */
  | { readonly type: "record-stopped"; readonly limit: boolean }
  | { readonly type: "record-failed"; readonly notice: MissionVoiceNotice }
  | { readonly type: "record-cancelled" }
  | { readonly type: "transcribed"; readonly check: "heard" | "notKorean" | null }
  | { readonly type: "check-cleared" }
  | { readonly type: "play-loading"; readonly key: string }
  | { readonly type: "play-started"; readonly key: string }
  | { readonly type: "play-ended"; readonly key: string }
  | { readonly type: "play-stopped" };
