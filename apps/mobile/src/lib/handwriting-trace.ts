// 손글씨 **따라 쓰기 견주기** 접점입니다. 호스트 앱의 `HandwritingTraceModule`을
// 감쌉니다. 접점은 모듈마다 파일 하나입니다(ADR-0017 D3) — 그래서 형제인
// `handwriting-recognition.ts`와 한 파일에 합치지 않습니다. 호스트에 모듈이 둘이고,
// 하나가 없을 때 다른 하나가 있을 수 있습니다.
//
// 획 좌표 타입은 형제 파일이 소유합니다. 여기서 다시 선언하지 않습니다 — 같은 값을
// 두 자리가 지면 어느 쪽이 정본인지 갈립니다.
//
// **왜 인식이 아니라 견주기인가.** Vision 경로는 2026-09-28 예비 관측에서 `read` +
// 빈 문자열을 냈습니다(`docs/e2e/handwriting-probe.md`). 쓰기 학습형의 판정을 그 축에
// 매달지 않기로 하고, **안내 글자를 얼마나 따라 그렸는가**를 넓이의 비로 재는 길을
// 엽니다. 이 접점이 그 길의 JS 쪽 끝입니다.

import type { Stroke } from "./handwriting-recognition";

/** 넘길 것입니다. Swift 쪽 `CompareRequest`와 키·타입이 1:1입니다. */
export type HandwritingTraceRequest = {
  readonly width: number;
  readonly height: number;
  readonly strokeWidth: number;
  readonly strokes: readonly Stroke[];
  /** 안내 글자입니다. 한 음절을 봅니다 — 여러 글자를 넣어도 막지 않지만 지표의 뜻이 흐려집니다. */
  readonly glyph: string;
  readonly fontSize: number;
  /** 빈 문자열이면 시스템 폰트로 갑니다. 어느 것이 섰는지는 결과의 `font`가 답합니다. */
  readonly fontName: string;
  /** 팽창 반경(표면 point). 「얼마나 빗나가도 따라 쓴 것으로 보는가」입니다. */
  readonly tolerance: number;
};

/**
 * 견주기 **한 번의 결과**입니다. 모듈 가용 여부를 답하지 않습니다 — 그것은 아래
 * `HandwritingTraceRequestOutcome`이 답합니다(형제 접점과 같은 규약입니다).
 *
 * ⚠ **`compared`가 「통과」가 아닙니다.** 이 union은 수를 그대로 실어 나르고 판정하지
 * 않습니다. 얼마가 통과인지는 폰트·글자 복잡도·펜 두께가 함께 정하는 수라 기기에서
 * 잡아야 하고, 그 문턱을 접점에 박으면 값이 바뀔 때마다 접점을 고치게 됩니다.
 */
export type HandwritingTraceOutcome =
  | {
      readonly status: "compared";
      /** 안내를 얼마나 채웠나. 0~1. */
      readonly coverage: number;
      /** 안내 밖으로 얼마나 안 나갔나. 0~1. */
      readonly stay: number;
      /** 그린 잉크의 픽셀 수입니다. 비가 이상할 때 분모를 눈으로 보려고 함께 옵니다. */
      readonly drawnArea: number;
      readonly guideArea: number;
      /** 실제로 선 폰트 이름입니다. 요청한 것과 다를 수 있습니다. */
      readonly font: string;
      /**
       * 안내 잉크가 실제로 놓인 상자입니다(`"x,y,w,h"`, 표면 좌표). 비어 있을 수 있습니다.
       *
       * 화면이 그리는 안내와 호스트가 재는 안내는 **다른 엔진이 배치합니다.** 둘이
       * 어긋나면 잘 따라 쓴 획이 낮은 수를 받는데, 비만 봐서는 위치 탓인지 솜씨 탓인지
       * 갈리지 않습니다. 이 상자가 그것을 수로 가릅니다.
       */
      readonly guideBox: string;
    }
  /** 획이 하나도 없었습니다. 0.0으로 채점된 것과 **다른 답**이라 사유로 옵니다. */
  | { readonly status: "empty-strokes" }
  /** 안내 글자가 한 픽셀도 안 그려졌습니다 — 글꼴·크기·글자를 봐야 합니다. */
  | { readonly status: "empty-glyph" }
  | { readonly status: "invalid-arguments" }
  | { readonly status: "failed" }
  | { readonly status: "malformed" }; // JS 쪽에서만 생깁니다

/** 요청 **한 번의 결과**입니다. 형제 접점과 같은 이유로 boolean이 아닙니다. */
export type HandwritingTraceRequestOutcome = "requested" | "unavailable";

interface HandwritingTraceModule {
  compare(args: HandwritingTraceRequest, callback: (result: unknown) => void): void;
}

// 가드의 형태와 근거는 형제 접점과 글자 그대로 같습니다 — `typeof` 가드 + `null`
// 정규화. 거기 적힌 이유(테스트 환경에 전역이 없음 · 메인 스레드에서 `undefined` ·
// `typeof null === "object"` 사각 · registerModule 전의 `null`)가 그대로 걸립니다.
function nativeModule(): HandwritingTraceModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["HandwritingTraceModule"] as
    | HandwritingTraceModule
    | undefined;
  return module ?? undefined;
}

/** 호스트에 이 모듈이 있는가입니다. 없으면 `false`이고 부수효과가 없습니다. */
export function isHandwritingTraceAvailable(): boolean {
  return nativeModule() !== undefined;
}

/**
 * 획과 안내 글자를 호스트에 넘겨 견주기를 요청합니다. 던지지 않습니다.
 *
 * 모듈이 없으면 아무 일도 하지 않고 `"unavailable"`을 돌려줍니다 — `onResult`도 부르지
 * 않습니다. 「요청이 갔는가」와 「결과가 무엇인가」가 다른 물음이라 다른 값이 답합니다.
 */
export function compareHandwritingTrace(
  request: HandwritingTraceRequest,
  onResult: (outcome: HandwritingTraceOutcome) => void,
): HandwritingTraceRequestOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  host.compare(request, (result) => onResult(handwritingTraceOutcome(result)));

  return "requested";
}

/**
 * 네이티브 콜백이 실어 보낸 값을 결과 union으로 바꿉니다. 던지지 않습니다.
 *
 * 들어오는 값은 브리지를 건너온 `unknown`이라 모양을 믿지 않습니다. **수는 문자열로
 * 건너옵니다** — Swift 쪽 페이로드가 전부 문자열인 규약이고, 여기서 한 번만 풉니다.
 */
export function handwritingTraceOutcome(payload: unknown): HandwritingTraceOutcome {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { status: "malformed" };
  }

  const record = payload as Record<string, unknown>;
  const status = record["status"];

  if (status === "compared") {
    const coverage = finiteNumber(record["coverage"]);
    const stay = finiteNumber(record["stay"]);
    const drawnArea = finiteNumber(record["drawnArea"]);
    const guideArea = finiteNumber(record["guideArea"]);
    const font = record["font"];
    const guideBox = record["guideBox"];

    // 넷 중 하나라도 수가 아니면 「견줬다」가 아니라 모양이 어그러진 것입니다.
    // 비만 받고 넓이를 버리지 않는 것은, 비가 이상할 때 분모를 봐야 원인이 갈리기
    // 때문입니다(안내가 안 그려졌나 · 획이 너무 얇았나).
    if (
      coverage === undefined ||
      stay === undefined ||
      drawnArea === undefined ||
      guideArea === undefined ||
      typeof font !== "string" ||
      typeof guideBox !== "string"
    ) {
      return { status: "malformed" };
    }

    return { status: "compared", coverage, stay, drawnArea, guideArea, font, guideBox };
  }

  if (status === "empty-strokes") {
    return { status: "empty-strokes" };
  }

  if (status === "empty-glyph") {
    return { status: "empty-glyph" };
  }

  if (status === "invalid-arguments") {
    return { status: "invalid-arguments" };
  }

  if (status === "failed") {
    return { status: "failed" };
  }

  return { status: "malformed" };
}

/**
 * 문자열로 건너온 수를 풉니다. 수가 아니거나 유한하지 않으면 `undefined`입니다.
 *
 * `Number("")`가 `0`이라 빈 문자열을 먼저 막습니다 — 호스트는 `compared`가 아닌 답에서
 * 이 자리를 빈 문자열로 채우므로, 막지 않으면 **사유가 0.0이라는 수로 둔갑합니다.**
 */
function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== "string" || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
