/** iOS · Android 호스트의 효과음 접점. 모듈이 없는 호스트(Explorer · 테스트)에서는 조용히 무동작한다. */
export type SoundEffectId =
  | "button"
  | "correct_answer"
  | "wrong_answer"
  | "lesson_complete"
  | "pass_lesson"
  | "failed_lesson"
  | "ring_bell"
  | "accept_call";

/** 호스트에 보내는 진동 종류. 호스트는 이 두 문자열만 안다(ADR-0109). */
export type HapticKind = "success" | "error";

interface SoundEffectsModule {
  play(id: SoundEffectId): void;
  stopRing(): void;
  /** 2026-11-06 추가. 옛 호스트에는 없다 — 부르기 전에 함수인지 본다. */
  haptic?(kind: HapticKind): void;
}

// 효과음 → 진동 정책 표. Record라 id가 늘면 tsc가 표 누락을 막는다.
const hapticByEffect: Readonly<Record<SoundEffectId, HapticKind | null>> = {
  correct_answer: "success",
  pass_lesson: "success",
  wrong_answer: "error",
  failed_lesson: "error",
  button: null,
  // 바로 뒤 결과 화면의 pass_lesson · failed_lesson이 판정 진동을 낸다 — 연속 두 번을 피한다.
  lesson_complete: null,
  // 앱 호출 자리가 없는 id다. 벨 진동은 호출 자리가 다시 생길 때 다시 본다.
  ring_bell: null,
  accept_call: null,
};

/** 효과음 → 진동 정책. 판정 넷만 진동하고 진행 · 조작은 하지 않는다(ADR-0109 D1). */
export function hapticFor(id: SoundEffectId): HapticKind | null {
  return hapticByEffect[id];
}

function nativeModule(): SoundEffectsModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as Record<string, unknown>)["SoundEffectsModule"] as
    | SoundEffectsModule
    | null
    | undefined;
  return module ?? undefined;
}

export function playSound(id: SoundEffectId): void {
  const module = nativeModule();
  try {
    module?.play(id);
  } catch {
    // 효과음은 필수 기능이 아니다. 재생 실패가 채점·탐색을 막지 않는다.
  }
  // 진동은 효과음의 그림자다 — 같은 자리에서, 효과음 뒤에, 정책이 정한 id에만(ADR-0109 D2).
  const kind = hapticFor(id);
  if (kind === null || typeof module?.haptic !== "function") return;
  try {
    module.haptic(kind);
  } catch {
    // 진동 실패도 채점·탐색을 막지 않는다. 효과음은 이미 나갔다.
  }
}

export function stopRing(): void {
  try {
    nativeModule()?.stopRing();
  } catch {
    // 화면 이탈은 벨 중지 실패와 무관하게 진행한다.
  }
}
