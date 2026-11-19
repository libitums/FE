// 법률 문서(개인정보 처리방침 · 이용약관)의 데이터 계약입니다. 타입만 둡니다(ADR-0167).
// 본문은 `privacy-*.ts` · `terms-*.ts`가 이 모양으로 들고, `LegalPage.astro`가 그대로 그립니다.

/** 문서의 정체입니다. 주소의 마지막 조각(`/privacy/` · `/terms/`)과 같습니다. */
export type LegalDocumentId = "privacy" | "terms";

/** 본문이 있는 언어입니다. 첫째가 기준본(영어)이고, 나머지는 번역입니다. */
export type LegalLanguage = "en" | "ko";

/** 글 안의 링크 하나입니다. `href`는 `https://` · `mailto:` · `/`로 시작합니다. */
export interface LegalLink {
  label: string;
  href: string;
}

/** 한 줄의 글입니다. 링크가 섞이면 조각의 배열로 적습니다. */
export type LegalText = string | readonly (string | LegalLink)[];

export type LegalBlock =
  | { kind: "paragraph"; text: LegalText }
  /** 절 안의 작은 제목입니다(`<h3>`). */
  | { kind: "subheading"; text: string }
  | { kind: "list"; items: readonly LegalText[] }
  /** `head`와 모든 `rows`의 칸 수가 같습니다. */
  | {
      kind: "table";
      caption: string;
      head: readonly string[];
      rows: readonly (readonly LegalText[])[];
    };

export interface LegalSection {
  /** 번호를 포함한 제목입니다(`1. Information we collect`). */
  heading: string;
  blocks: readonly LegalBlock[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  language: LegalLanguage;
  /** `<h1>`이자 `<title>`의 앞부분입니다. */
  title: string;
  /** 검색 결과에 실리는 한 문장입니다. */
  description: string;
  /** 시행일 줄의 이름입니다(`Effective date`). */
  effectiveLabel: string;
  /** 그 언어로 쓴 시행일입니다(`November 20, 2026`). */
  effectiveDate: string;
  /** 기계가 읽는 시행일(`YYYY-MM-DD`)입니다. 같은 문서의 모든 언어판이 같은 값입니다. */
  effectiveIso: string;
  /** 번역본에만 싣는 「영문본이 우선한다」는 안내입니다. 기준본은 빈 문자열입니다. */
  translationNote: string;
  /** 제목 아래 첫 절 앞에 놓이는 글입니다. */
  intro: readonly LegalBlock[];
  sections: readonly LegalSection[];
}
