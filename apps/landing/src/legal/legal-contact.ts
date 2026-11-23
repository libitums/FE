import type { LegalLink } from "./legal.contract";

/** 법률 문서에 적는 문의 주소입니다. 두 문서의 모든 언어판이 이 값을 씁니다. */
export const legalContactEmail = "libitum-admin@gmail.com";

/** 본문에 넣는 메일 링크 조각입니다. */
export const legalMail: LegalLink = {
  label: legalContactEmail,
  href: `mailto:${legalContactEmail}`,
};
