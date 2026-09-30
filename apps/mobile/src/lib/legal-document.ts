// 개인정보처리방침 · 이용약관 접점입니다. 호스트 `LegalDocumentModule`을 감쌉니다(ADR-0017 D3 —
// 모듈마다 파일 하나). 화면 · 결선은 `NativeModules`를 직접 만지지 않습니다.

import type {
  LegalDocument,
  LegalDocumentModule,
  LegalDocumentOpenedEvent,
  LegalDocumentRequestOutcome,
  LegalDocumentResult,
  LegalDocumentSource,
} from "./legal-document.contract";

const knownResultStatuses = ["opened", "failed", "invalid-arguments"] as const;

/** 호스트 페이로드(`unknown`)를 `LegalDocumentResult`로 좁힙니다. 던지지 않습니다. */
export function legalDocumentResultFrom(payload: unknown): LegalDocumentResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { status: "malformed" };
  }
  const status = (payload as Record<string, unknown>)["status"];
  if (typeof status !== "string" || !(knownResultStatuses as readonly string[]).includes(status)) {
    return { status: "malformed" };
  }
  return { status } as LegalDocumentResult;
}

/** 문서를 연 이벤트입니다. 개인식별정보를 싣지 않습니다. */
export function legalDocumentOpenedEvent(
  document: LegalDocument,
  source: LegalDocumentSource,
): LegalDocumentOpenedEvent {
  return { name: "legal_document_opened", document, source };
}

// `web-authentication.ts`와 같은 형태입니다 — `typeof` 가드 + `null` 가드 + 모듈 값 `null` 정규화.
function nativeModule(): LegalDocumentModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["LegalDocumentModule"] as
    | LegalDocumentModule
    | undefined;
  return module ?? undefined;
}

/**
 * 모듈이 없으면 `unavailable`(콜백 0회). 있으면 `host.open`을 부르고 `requested`. 결과 콜백은
 * 선택입니다 — 부르는 자리는 대개 결과를 기다리지 않습니다(띄우는 일은 호스트가 끝까지 집니다).
 */
export function openLegalDocument(
  document: LegalDocument,
  onResult?: (result: LegalDocumentResult) => void,
): LegalDocumentRequestOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }
  try {
    host.open({ document }, (payload) => onResult?.(legalDocumentResultFrom(payload)));
  } catch {
    return "unavailable";
  }
  return "requested";
}
