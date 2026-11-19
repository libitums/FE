import { legalMail as mail } from "./legal-contact";
import type { LegalDocument } from "./legal.contract";
import { legalPathFor } from "./legal-paths";

/** 이용약관의 시행일입니다. 모든 언어판이 이 값을 씁니다. */
export const termsEffectiveIso = "2026-09-30";

// 이용약관(영어 · 기준본)입니다. 2026-09-30 시행본을 Notion에서 그대로 옮겼습니다(ADR-0167 — 내용은 바꾸지 않았습니다).
// 내용을 바꾸면 `terms-ko.ts`를 같은 PR에서 맞추고 시행일을 올립니다.
export const termsEn: LegalDocument = {
  id: "terms",
  language: "en",
  title: "Duru Terms of Use",
  description: "The terms that apply when you use Duru, a Korean learning app.",
  effectiveLabel: "Effective date",
  effectiveDate: "September 30, 2026",
  effectiveIso: termsEffectiveIso,
  translationNote: "",
  intro: [
    {
      kind: "paragraph",
      text: [
        'These Terms govern your use of the Duru app (the "App") provided by YEONWOONG JUNG ("we", "us"). By creating an account or using the App, you agree to these Terms and to our ',
        { label: "Privacy Policy", href: legalPathFor("privacy", "en") },
        ". If you do not agree, do not use the App.",
      ],
    },
  ],
  sections: [
    {
      heading: "1. Eligibility",
      blocks: [
        {
          kind: "paragraph",
          text: "You must be at least 14 years old, or the minimum age required in your country if it is higher, to use the App.",
        },
      ],
    },
    {
      heading: "2. Your account",
      blocks: [
        {
          kind: "paragraph",
          text: "You sign in with Apple, Google, or Facebook. You are responsible for activity under your account. Contact us if you think someone else has accessed it.",
        },
      ],
    },
    {
      heading: "3. Using the App",
      blocks: [
        {
          kind: "paragraph",
          text: "The App is for your personal, non-commercial learning. You agree not to:",
        },
        {
          kind: "list",
          items: [
            "copy, resell, or redistribute the App or its content;",
            "reverse engineer the App except where the law allows it;",
            "interfere with the App or its servers, or access them by automated means.",
          ],
        },
      ],
    },
    {
      heading: "4. Content",
      blocks: [
        {
          kind: "paragraph",
          text: "The lessons, stories, characters, audio, and images in the App belong to us or our licensors. We give you a limited, non-transferable, revocable license to use them in the App.",
        },
      ],
    },
    {
      heading: "5. Gems",
      blocks: [
        {
          kind: "paragraph",
          text: "Gems are virtual items used only inside the App. They have no cash value, cannot be exchanged for money, and cannot be transferred. Gems cannot currently be purchased. If we start selling gems, purchases will be processed by Apple and subject to Apple's terms, refunds will be handled by Apple, and we will update these Terms before sales begin.",
        },
      ],
    },
    {
      heading: "6. Changes and availability",
      blocks: [
        {
          kind: "paragraph",
          text: "The App is in development. We may change, suspend, or stop any part of it. We will give notice in the App before significant changes where we can. If we change these Terms, we will post the new version with a new effective date.",
        },
      ],
    },
    {
      heading: "7. Ending your use",
      blocks: [
        {
          kind: "paragraph",
          text: "You can stop using the App and delete your account at any time. We may suspend or end your access if you break these Terms.",
        },
      ],
    },
    {
      heading: "8. Disclaimers and liability",
      blocks: [
        {
          kind: "paragraph",
          text: 'The App is provided "as is". To the extent the law allows, we are not liable for indirect or consequential damages arising from your use of the App. Nothing in these Terms limits rights you have under consumer protection law.',
        },
      ],
    },
    {
      heading: "9. Apple",
      blocks: [
        {
          kind: "paragraph",
          text: "These Terms are between you and us, not Apple. Apple is not responsible for the App or its content. Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them.",
        },
      ],
    },
    {
      heading: "10. Governing law",
      blocks: [
        {
          kind: "paragraph",
          text: "These Terms are governed by the laws of the Republic of Korea. Any dispute will be brought before the court with jurisdiction under the Civil Procedure Act of the Republic of Korea. If you are a consumer, you also keep any rights you have under the laws of the country where you live.",
        },
      ],
    },
    {
      heading: "11. Contact",
      blocks: [{ kind: "paragraph", text: ["YEONWOONG JUNG · ", mail] }],
    },
  ],
};
