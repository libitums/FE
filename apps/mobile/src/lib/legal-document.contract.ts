// 개인정보처리방침 · 이용약관을 여는 호스트 접점 어휘입니다(ADR-0033). 호스트
// `LegalDocumentModule`이 앱 위 브라우저(`SFSafariViewController`)로 엽니다.
//
// **주소는 호스트가 듭니다.** JS는 문서 이름만 넘깁니다 — 나가는 목적지가 고정 두 곳으로
// 닫혀 있습니다(ADR-0026 D4의 경계). 타입만 있습니다. 판정 · 호출은 `legal-document.ts`가 가집니다.

/** 여는 문서입니다. 호스트의 주소 표(`LegalDocumentURL.table`)와 키가 같습니다. */
export type LegalDocument = "privacy-policy" | "terms-of-use";

/**
 * 호스트가 `LegalDocumentModule`이라는 이름으로 등록합니다. 메서드는 하나입니다.
 *
 * - `open` — 문서를 띄우고, 화면이 뜬 뒤(또는 못 띄우면 곧바로) **정확히 한 번** 콜백합니다.
 */
export interface LegalDocumentModule {
  open(args: Record<string, unknown>, callback: (payload: unknown) => void): void;
}

/**
 * 콜백 결과입니다. 마지막 `malformed`만 JS 쪽에서 생깁니다 — 브리지를 건너온 값이 아는
 * 모양이 아닐 때입니다.
 */
export type LegalDocumentResult =
  | { readonly status: "opened" }
  | { readonly status: "failed" }
  | { readonly status: "invalid-arguments" }
  | { readonly status: "malformed" };

/** 모듈이 없거나 호출이 던지면 `unavailable`(콜백 0회), 부르면 `requested`입니다. */
export type LegalDocumentRequestOutcome = "requested" | "unavailable";

/** 어디서 열었는지입니다 — 로그인 화면의 안내 문구 · 설정의 항목. */
export type LegalDocumentSource = "login" | "settings";

/** 문서를 연 제품 사용 이벤트입니다. 진입(`login`) · 설정(`settings`) sink가 같은 모양으로 냅니다. */
export type LegalDocumentOpenedEvent = {
  readonly name: "legal_document_opened";
  readonly document: LegalDocument;
  readonly source: LegalDocumentSource;
};
