// 브라우저 접점 — 소리 · 말하기 · 분석 전송. 컨트롤러는 이 모양만 안다(테스트는 가짜를 넣는다).
import type { AnalyticsEvent } from "../scripts/analytics.contract";
import type { SpeechFailure, TrialSfx } from "./trial-machine.contract";
import type { TrialModel } from "./trial-model.contract";
import type { TrialPageData, TrialScriptCopy } from "../components/trial/trial-components.contract";
import type { PreregLocale, TrialPreregPort } from "./trial-prereg.contract";

export type VoiceOutcome = "ended" | "failed" | "stopped";

export interface TrialAudio {
  /** 체험판 안 첫 버튼 탭 처리기 안에서 **동기로** 부른다 — AudioContext 생성 · resume · 무음 1샘플 · audioSession 'playback'. */
  unlock(): void;
  /** 이전 음성을 멈추고 낸다. 받기 · 해독 실패 · 잠금 전이면 "failed"(던지지 않음). */
  playVoice(url: string): Promise<VoiceOutcome>;
  playSfx(name: TrialSfx): void;
  /** 받아 둔다(실패는 조용히). */
  prefetch(urls: readonly string[]): void;
  stopVoice(): void;
  /**
   * 시작 뒤 멈춘 컨텍스트(suspended · interrupted — iOS 통화 · 백그라운드 · 마이크)를 깨운다. 잠금 전 · running이면 아무 일도 없고
   * 던지지 않는다. 체험판 안의 사용자 활성화(pointerdown · keydown · click)마다 부른다(선택 — 가짜 접점은 없어도 된다).
   */
  resume?(): void;
  /** 이미 해독해 둔 음성의 길이(ms) — 컷 타자 효과를 음성에 맞출 때. 모르면 null(선택 — 없으면 기본 간격). */
  voiceLengthMs?(url: string): number | null;
}

export type SpeechOutcome =
  | { readonly kind: "heard"; readonly alternatives: readonly string[] }
  | { readonly kind: "failed"; readonly reason: SpeechFailure };

export interface TrialSpeech {
  readonly support: "supported" | "unsupported";
  /** ko-KR · 한 번 · 대안 3 · 8초 상한. 진행 중이면 앞의 것을 abort. */
  listen(): Promise<SpeechOutcome>;
  /** 듣는 중이면 멈추고 그때까지의 결과로 끝낸다. */
  stop(): void;
  abort(): void;
}

/** SpeechRecognitionErrorEvent.error → 실패 까닭. 순수. */
export type SpeechFailureOf = (error: string) => SpeechFailure;
/** 결과 목록(첫 결과의 대안들) → 빈 값 뺀 대안. 순수. */
export type SpeechAlternativesOf = (
  results: ArrayLike<ArrayLike<{ readonly transcript: string }>>,
) => readonly string[];
/** 전역에서 생성자를 찾는다 — SpeechRecognition ?? webkitSpeechRecognition. */
export type SpeechSupportOf = (scope: object) => "supported" | "unsupported";

export type SendEvent = (event: AnalyticsEvent) => void;

/** 모바일 전체화면 — 둘 다 던지지 않는다. request는 한 번만 효과가 있다. */
export interface TrialFullscreen {
  request(): void;
  exit(): void;
}
/** `(pointer: coarse)` 이고 `(hover: none)`이면 참. 순수. */
export type FullscreenWanted = (env: {
  readonly coarsePointer: boolean;
  readonly noHover: boolean;
}) => boolean;
export type CreateTrialFullscreen = (scope: Window) => TrialFullscreen;

export type TrialControllerDeps = {
  readonly root: HTMLElement;
  readonly model: TrialModel;
  readonly copy: TrialScriptCopy;
  readonly audio: TrialAudio;
  readonly speech: TrialSpeech;
  readonly send: SendEvent;
  readonly reducedMotion: boolean;
  /** 없으면 전체화면을 부르지 않는다. */
  readonly fullscreen?: TrialFullscreen;
  /** 사전 등록 접점 — null · 없음이면 폼은 unavailable. */
  readonly prereg?: TrialPreregPort | null;
  readonly locale?: PreregLocale;
};
export type TrialController = { readonly dispose: () => void };
/** 페이지 스크립트의 유일한 진입 — DOM 결선 · 상태 · 부작용. */
export type InitTrial = (deps: TrialControllerDeps) => TrialController;
/** 페이지의 `<script type="application/json" id="trial-model">`을 읽는다. 없거나 깨졌으면 null. */
export type ReadTrialModel = (doc: Document) => TrialPageData | null;
export type CreateTrialAudio = (scope: Window, sfxBase: "/trial/sfx/") => TrialAudio;
export type CreateTrialSpeech = (scope: Window) => TrialSpeech;
