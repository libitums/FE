import { legalMail as mail } from "./legal-contact";
import type { LegalDocument } from "./legal.contract";
import { legalPathFor } from "./legal-paths";

/** 이용약관의 시행일입니다. 모든 언어판이 이 값을 씁니다. */
export const termsEffectiveIso = "2026-11-20";

// 이용약관(영어 · 기준본)입니다. 2026-11-20 개정 — 결제(자동 갱신 구독 · 엽전 팩)와 AI 캐릭터 대화를 담았습니다(ADR-0167 D5).
// 사실의 출처: 구독 · 엽전 팩 · 환불 처리 ADR-0144, 상점 ADR-0160, 엽전 ADR-0140, 친구 · 수위 ADR-0164. 가격은 적지 않습니다(스토어가 정본).
// 내용을 바꾸면 `terms-ko.ts`를 같은 PR에서 맞추고 시행일을 올립니다.
export const termsEn: LegalDocument = {
  id: "terms",
  language: "en",
  title: "Duru Terms of Use",
  description: "The terms that apply when you use Duru, a Korean learning app.",
  effectiveLabel: "Effective date",
  effectiveDate: "November 20, 2026",
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
          text: "You can try parts of the App without an account. To keep your progress, chat with characters, or make purchases, you sign in with one of the methods shown in the App, such as Apple or Google. You are responsible for activity under your account. Contact us if you think someone else has accessed it.",
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
      heading: "5. Chatting with AI characters",
      blocks: [
        {
          kind: "list",
          items: [
            "The characters you chat with in the App are AI, not people. Their messages, corrections, translations, pictures, and voice messages are generated automatically and may be inaccurate, incomplete, or unexpected. Do not rely on them for medical, legal, financial, or other professional advice.",
            "Chats are for practicing Korean. We apply safety checks to messages and replies, and what characters can talk about depends on your age and settings. We may block, stop, or not deliver a message or reply that breaks these checks.",
            "You agree not to use chats to create content that is illegal, sexually explicit, hateful, or harassing, to involve real people without their consent, or to try to get around the safety checks. We may limit or end chat access if you do.",
            "Some chats, pictures, and voice messages cost Yeopjeon coins or use the free messages included with your account or plan. The App shows what they cost.",
          ],
        },
      ],
    },
    {
      heading: "6. Subscriptions",
      blocks: [
        {
          kind: "list",
          items: [
            "The App offers subscriptions with monthly or yearly billing. The plans, what each includes, and the price in your currency are shown in the App and on the store's payment screen before you buy.",
            "Subscriptions renew automatically at the end of each period, and your App Store or Google Play account is charged for the next period, unless you turn off auto-renewal at least 24 hours before the current period ends.",
            "You can manage or cancel a subscription in your App Store or Google Play account settings. Deleting the App or your Duru account does not cancel it.",
            "If you cancel, you keep your plan's benefits until the end of the period you have already paid for. Payments for the current period are not refunded by us, except as described in section 8.",
            "Plan benefits may include fair-use limits shown in the App. We may change the benefits of a plan; if a change reduces what you get, we will tell you in the App before it applies to your next renewal.",
          ],
        },
      ],
    },
    {
      heading: "7. Yeopjeon coins",
      blocks: [
        {
          kind: "list",
          items: [
            "Yeopjeon coins are an in-app currency used only inside the App, for example to chat with characters or to ask for pictures and voice messages.",
            "You can buy coin packs in the App. We may also give you coins, for example for finishing lessons, as a bonus, or every month with some subscriptions.",
            "Coins are a limited license to use features in the App. They are not your property, have no cash value, cannot be exchanged for money or transferred to another account, and cannot be used outside the App.",
            "Coins are taken from your balance when you use a feature that costs them. Coins you have spent are not returned, except when the App returns them because a request failed.",
            "Purchased coins are not refundable by us and are not returned if you delete your account, except where the law requires it or as described in section 8.",
          ],
        },
      ],
    },
    {
      heading: "8. Payments and refunds",
      blocks: [
        {
          kind: "list",
          items: [
            "Purchases are processed by Apple (App Store) or Google (Google Play), under their terms. We do not receive your card details.",
            "Refund requests are handled by the store you paid through. For the App Store, request a refund at reportaproblem.apple.com. For Google Play, follow Google Play's refund process.",
            "If a store refunds a subscription, the plan ends when we are notified. If a store refunds a coin pack, we may remove the refunded coins from your balance.",
            "Nothing in these Terms limits refund or withdrawal rights you have under the consumer protection laws that apply to you.",
          ],
        },
      ],
    },
    {
      heading: "9. Changes and availability",
      blocks: [
        {
          kind: "paragraph",
          text: "We may change, suspend, or stop any part of the App. We will give notice in the App before significant changes where we can. If we change these Terms, we will post the new version with a new effective date.",
        },
      ],
    },
    {
      heading: "10. Ending your use",
      blocks: [
        {
          kind: "paragraph",
          text: "You can stop using the App and delete your account at any time. When you delete your account, your coin balance and progress are removed, and you need to cancel any subscription separately in your store account. We may suspend or end your access if you break these Terms.",
        },
      ],
    },
    {
      heading: "11. Disclaimers and liability",
      blocks: [
        {
          kind: "paragraph",
          text: 'The App is provided "as is". To the extent the law allows, we are not liable for indirect or consequential damages arising from your use of the App. Nothing in these Terms limits rights you have under consumer protection law.',
        },
      ],
    },
    {
      heading: "12. Apple and Google",
      blocks: [
        {
          kind: "paragraph",
          text: "These Terms are between you and us, not Apple or Google. Apple and Google are not responsible for the App or its content. If you downloaded the App from the App Store, Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them.",
        },
      ],
    },
    {
      heading: "13. Governing law",
      blocks: [
        {
          kind: "paragraph",
          text: "These Terms are governed by the laws of the Republic of Korea. Any dispute will be brought before the court with jurisdiction under the Civil Procedure Act of the Republic of Korea. If you are a consumer, you also keep any rights you have under the laws of the country where you live.",
        },
      ],
    },
    {
      heading: "14. Contact",
      blocks: [{ kind: "paragraph", text: ["YEONWOONG JUNG · ", mail] }],
    },
  ],
};
