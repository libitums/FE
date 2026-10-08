// Android 시스템 뒤로가기 호스트 접점 어휘입니다. 호스트 `SystemBackModule`(Android 전용)이
// `systemBackPressed` 전역 이벤트로 누름을 알리고 JS가 응답합니다. 타입만 있습니다.
// 판정 · 호출은 `system-back.ts`가 가집니다.

/** 누름마다 새 값인 10진 문자열입니다. 호스트가 만들고 JS는 그대로 돌려줍니다. */
export type SystemBackToken = string & { readonly __brand: "SystemBackToken" };

/** `handled`는 앱이 처리함, `leave`는 앱을 떠남(호스트가 태스크를 뒤로 보냅니다). */
export type SystemBackOutcome = "handled" | "leave";

/** 호스트 모듈의 모양입니다. Android에만 있습니다. */
export type SystemBackModule = {
  readonly ready: () => void;
  readonly respond: (token: string, outcome: SystemBackOutcome) => void;
};

/** 모듈이 없거나 호출이 던지면 `unavailable`, 부르면 `requested`입니다. */
export type SystemBackRequestOutcome = "requested" | "unavailable";
