// 체험판 페이지 스크립트 진입입니다. 실제 접점(소리 · 말하기 · 분석)으로 컨트롤러를 띄웁니다.
// 분석은 페이지가 실은 gtag(랜딩과 같은 동의 규칙 — Analytics)에 넘기기만 하고, gtag가 없으면 아무 일도 하지 않습니다.

import type { AnalyticsEvent } from "../scripts/analytics.contract";
import { createTrialAudio } from "./trial-audio";
import { initTrial, readTrialModel } from "./trial-controller";
import { createTrialFullscreen } from "./trial-fullscreen";
import { createTrialPrereg } from "./trial-prereg-client";
import { createTrialSpeech } from "./trial-speech";

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

const send = (event: AnalyticsEvent) =>
  (window as { gtag?: Gtag }).gtag?.("event", event.name, event.params);

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

function boot(): void {
  const root = document.querySelector<HTMLElement>('[data-testid="trial"]');
  if (root === null) return;
  const data = readTrialModel(document);
  if (data === null) {
    // 모델이 없으면 시작할 수 없습니다 — 컷 1의 Next를 막고 noscript와 같은 안내를 보입니다.
    const next = root.querySelector<HTMLButtonElement>('[data-testid="trial-cuts-next"]');
    if (next !== null) next.disabled = true;
    root.querySelector("[data-trial-unavailable]")?.removeAttribute("hidden");
    return;
  }
  const audio = createTrialAudio(window, "/trial/sfx/");
  // iOS는 첫 탭 뒤에도 통화 · 백그라운드 · 마이크 사용으로 컨텍스트를 멈춥니다 — 체험판 안의 사용자 활성화마다 다시 깨웁니다.
  // 캡처 단계라 버튼 처리기(다음 음성 재생)보다 먼저 돕니다.
  const wake = () => audio.resume?.();
  for (const type of ["pointerdown", "keydown", "click"] as const) {
    root.addEventListener(type, wake, { capture: true });
  }
  initTrial({
    root,
    model: data.model,
    copy: data.copy,
    audio,
    speech: createTrialSpeech(window),
    send,
    reducedMotion: prefersReducedMotion(),
    fullscreen: createTrialFullscreen(window),
    prereg:
      data.prereg && typeof window.fetch === "function"
        ? createTrialPrereg(window.fetch.bind(window), data.prereg)
        : null,
    locale: data.locale ?? "en",
  });
}

boot();
