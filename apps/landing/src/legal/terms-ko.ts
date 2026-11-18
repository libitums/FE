import { legalMail as mail } from "./legal-contact";
import type { LegalDocument } from "./legal.contract";
import { legalPathFor } from "./legal-paths";
import { termsEffectiveIso } from "./terms-en";

// 이용약관(한국어 번역본)입니다. 기준본은 `terms-en.ts`이고 절의 순서가 같습니다.
export const termsKo: LegalDocument = {
  id: "terms",
  language: "ko",
  title: "Duru 이용약관",
  description: "한국어 학습 앱 Duru를 이용할 때 적용되는 약관입니다.",
  effectiveLabel: "시행일",
  effectiveDate: "2026년 9월 30일",
  effectiveIso: termsEffectiveIso,
  translationNote:
    "이 문서는 영문 이용약관의 번역본입니다. 두 문서의 내용이 다르면 영문본이 우선합니다.",
  intro: [
    {
      kind: "paragraph",
      text: [
        "이 약관은 YEONWOONG JUNG(이하 「저희」)이 제공하는 Duru 앱(이하 「앱」)의 이용에 적용됩니다. 계정을 만들거나 앱을 이용하면 이 약관과 ",
        { label: "개인정보 처리방침", href: legalPathFor("privacy", "ko") },
        "에 동의하는 것입니다. 동의하지 않으면 앱을 이용하지 마세요.",
      ],
    },
  ],
  sections: [
    {
      heading: "1. 이용 자격",
      blocks: [
        {
          kind: "paragraph",
          text: "앱을 이용하려면 만 14세 이상이어야 합니다. 거주 국가에서 요구하는 최소 연령이 더 높으면 그 연령 이상이어야 합니다.",
        },
      ],
    },
    {
      heading: "2. 계정",
      blocks: [
        {
          kind: "paragraph",
          text: "Apple, Google 또는 Facebook으로 로그인합니다. 계정에서 일어나는 활동에 대한 책임은 본인에게 있습니다. 다른 사람이 계정에 접근했다고 생각되면 저희에게 알려 주세요.",
        },
      ],
    },
    {
      heading: "3. 앱 이용",
      blocks: [
        {
          kind: "paragraph",
          text: "앱은 개인적이고 비상업적인 학습을 위한 것입니다. 다음 행위를 하지 않는 데 동의합니다.",
        },
        {
          kind: "list",
          items: [
            "앱이나 그 콘텐츠를 복제 · 재판매 · 재배포하는 행위",
            "법이 허용하는 경우를 제외하고 앱을 역설계하는 행위",
            "앱이나 서버를 방해하거나 자동화된 수단으로 접근하는 행위",
          ],
        },
      ],
    },
    {
      heading: "4. 콘텐츠",
      blocks: [
        {
          kind: "paragraph",
          text: "앱의 레슨, 이야기, 캐릭터, 음성, 그림은 저희 또는 저희에게 이용을 허락한 권리자의 것입니다. 저희는 이를 앱 안에서 이용할 수 있는 제한적이고 양도할 수 없으며 철회할 수 있는 이용 허락을 드립니다.",
        },
      ],
    },
    {
      heading: "5. 젬",
      blocks: [
        {
          kind: "paragraph",
          text: "젬은 앱 안에서만 쓰는 가상 아이템입니다. 현금 가치가 없고, 돈으로 바꿀 수 없으며, 양도할 수 없습니다. 지금은 젬을 구매할 수 없습니다. 젬을 판매하게 되면 구매는 Apple이 처리하고 Apple의 약관이 적용되며, 환불은 Apple이 처리하고, 저희는 판매를 시작하기 전에 이 약관을 고칩니다.",
        },
      ],
    },
    {
      heading: "6. 변경과 제공",
      blocks: [
        {
          kind: "paragraph",
          text: "앱은 개발 중입니다. 저희는 앱의 어느 부분이든 바꾸거나 중단하거나 종료할 수 있습니다. 중요한 변경은 가능한 한 앱에서 미리 알립니다. 이 약관을 바꾸면 새 시행일과 함께 새 버전을 게시합니다.",
        },
      ],
    },
    {
      heading: "7. 이용 종료",
      blocks: [
        {
          kind: "paragraph",
          text: "언제든 앱 이용을 그만두고 계정을 삭제할 수 있습니다. 이 약관을 위반하면 저희가 이용을 정지하거나 종료할 수 있습니다.",
        },
      ],
    },
    {
      heading: "8. 보증의 부인과 책임",
      blocks: [
        {
          kind: "paragraph",
          text: "앱은 「있는 그대로」 제공됩니다. 법이 허용하는 범위에서 저희는 앱 이용으로 생긴 간접 손해나 결과적 손해에 책임을 지지 않습니다. 이 약관의 어떤 내용도 소비자 보호 법령에 따른 권리를 제한하지 않습니다.",
        },
      ],
    },
    {
      heading: "9. Apple",
      blocks: [
        {
          kind: "paragraph",
          text: "이 약관은 Apple이 아니라 이용자와 저희 사이의 약관입니다. Apple은 앱이나 그 콘텐츠에 책임을 지지 않습니다. Apple과 그 자회사는 이 약관의 제3자 수익자이며 이 약관을 집행할 수 있습니다.",
        },
      ],
    },
    {
      heading: "10. 준거법",
      blocks: [
        {
          kind: "paragraph",
          text: "이 약관에는 대한민국 법이 적용됩니다. 분쟁은 대한민국 민사소송법에 따라 관할권이 있는 법원에 제기합니다. 소비자인 경우 거주 국가의 법에 따른 권리도 그대로 유지됩니다.",
        },
      ],
    },
    {
      heading: "11. 문의",
      blocks: [{ kind: "paragraph", text: ["YEONWOONG JUNG · ", mail] }],
    },
  ],
};
