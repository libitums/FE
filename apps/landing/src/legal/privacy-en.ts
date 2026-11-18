import type { LegalDocument } from "./legal.contract";
import { privacyCollectEn } from "./privacy-en-collect";
import { privacyProvidersEn } from "./privacy-en-providers";
import { legalMail as mail } from "./legal-contact";

/** 개인정보 처리방침의 시행일입니다. 모든 언어판이 이 값을 씁니다. */
export const privacyEffectiveIso = "2026-11-25";

// 개인정보 처리방침(영어 · 기준본)입니다. 내용을 바꾸면 `privacy-ko.ts`를 같은 PR에서 맞추고 시행일을 올립니다.
export const privacyEn: LegalDocument = {
  id: "privacy",
  language: "en",
  title: "Duru Privacy Policy",
  description:
    "How Duru, a Korean learning app, collects, uses, shares, and keeps personal information.",
  effectiveLabel: "Effective date",
  effectiveDate: "November 25, 2026",
  effectiveIso: privacyEffectiveIso,
  translationNote: "",
  intro: [
    {
      kind: "paragraph",
      text: [
        'This Privacy Policy explains how YEONWOONG JUNG and Sehyun Kim (the joint operators of Duru, referred to as "we" or "us") handle personal information when you use Duru, a Korean learning app available on iOS and Android (the "App"). This policy applies to both versions of the App. It also covers our website at ',
        { label: "https://k-duru.com", href: "https://k-duru.com" },
        ' (the "Website").',
      ],
    },
  ],
  sections: [
    privacyCollectEn,
    {
      heading: "2. How we use information",
      blocks: [
        {
          kind: "list",
          items: [
            "To create and keep your account and to sign you in.",
            "To provide lessons and keep your progress across your devices.",
            "To generate the characters' replies, corrections, and translations, and to let characters remember the context of your chats.",
            "To keep chats safe: to detect harmful content, apply age-appropriate settings, and respond to reports. We may review conversations when that is needed for safety, to look into a report, or to fix a problem.",
            "To process purchases and give you what you bought.",
            "To send the notifications you allowed.",
            "To understand how the App and the Website are used and to improve lessons, screens, pages, and the quality of the characters' replies.",
            "To respond to your requests and inquiries.",
            "To improve how speaking is scored in the web trial, and to send a launch notice to people who pre-registered.",
            'To measure how our advertising performs (see "Advertising measurement" above).',
          ],
        },
        {
          kind: "paragraph",
          text: "We do not sell your personal information. We do not show ads in the App and do not use your learning records or chats to target advertising to you. We do not use your chats to train AI models.",
        },
        {
          kind: "paragraph",
          text: [
            "Automated safety checks may decline a message or pause chatting for a while. We do not use your information for automated decisions that have legal or similarly significant effects on you. If you think a safety check was wrong, contact us at ",
            mail,
            ".",
          ],
        },
      ],
    },
    privacyProvidersEn,
    {
      heading: "4. How long we keep information",
      blocks: [
        {
          kind: "list",
          items: [
            "Account information, profile information, learning records, and feedback: until you delete your account.",
            "Chats, memories, and safety check records: until you clear the chat in the App (where available) or delete your account.",
            "Pictures and voice messages made in chats: until you delete your account.",
            "Purchase records: until you delete your account, unless the law requires us to keep them longer.",
            "Notification tokens: until you sign out on that device, the token stops working, or you delete your account. Turning off notifications in your device settings stops delivery but does not by itself delete the token.",
            "Usage information: kept for up to 1 year after it is collected. After that it is no longer used for analysis.",
            "Error reports: kept for up to 90 days.",
            "Website visit information: kept for up to 14 months after it is collected.",
            "Text recognized in the web trial: deleted automatically 90 days after it is saved.",
            "Pre-registration email: until we send the launch notice and for up to 6 months after that, or until you ask us to delete it.",
          ],
        },
        {
          kind: "paragraph",
          text: "When you delete your account, we delete your account information without delay, unless we are required by law to keep it for a set period.",
        },
      ],
    },
    {
      heading: "5. Your choices and rights",
      blocks: [
        {
          kind: "list",
          items: [
            [
              "Delete your account. You can delete your account in the App at any time: go to Settings > Delete account. You can also ask us to delete it by emailing ",
              mail,
              " from the email address linked to your account, or by telling us which sign-in method you used.",
            ],
            [
              "Other requests. You can ask us to access, correct, or delete your personal information, or to stop processing it, by emailing us at ",
              mail,
              ". We will respond within 10 days.",
            ],
            "Chats. Where the App offers it, you can clear a chat, which deletes that conversation and what the character remembers from it.",
            "Notifications. You can turn notifications off at any time in your device's Settings.",
            "Usage analytics. The App does not currently offer a setting to turn off usage analytics. If you email us, we will delete the usage records linked to your account.",
            [
              "Website analytics. You can block or delete cookies in your browser settings, or install the ",
              {
                label: "Google Analytics opt-out browser add-on",
                href: "https://tools.google.com/dlpage/gaoptout",
              },
              ". The Website works the same without analytics cookies.",
            ],
            "Sign in with Apple. If you signed in with Apple, you can also stop using Sign in with Apple for the App in your Apple ID settings.",
            "Device permissions. You can revoke microphone or speech recognition permission at any time in your device's Settings.",
            [
              "Pre-registration. To remove your email address from pre-registration, email us at ",
              mail,
              " from that address.",
            ],
            "Advertising measurement. On iOS, you can allow or deny tracking when the App asks, and change it later in Settings › Privacy & Security › Tracking. On Android, you can reset or delete your advertising ID in your device settings.",
            "Web trial. You can block microphone access in your browser's site settings; the trial then lets you answer with word tiles instead.",
          ],
        },
        {
          kind: "paragraph",
          text: "Depending on where you live, you may have additional rights under your local law, such as the right to receive a copy of your information, to withdraw consent, or to complain to your data protection authority.",
        },
        {
          kind: "paragraph",
          text: "If you are in the Republic of Korea and need help with a privacy complaint, you can also contact the Personal Information Infringement Report Center (privacy.kisa.or.kr, 118), the Personal Information Dispute Mediation Committee (kopico.go.kr, 1833-6972), the Supreme Prosecutors' Office (spo.go.kr, 1301), or the Korean National Police Agency (ecrm.police.go.kr, 182).",
        },
      ],
    },
    {
      heading: "6. Security",
      blocks: [
        {
          kind: "paragraph",
          text: "We use encrypted connections and access controls offered by our service providers to protect your information. No method of transmission or storage is completely secure.",
        },
      ],
    },
    {
      heading: "7. Children",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "The App is not directed to children under 14, or under the minimum age for consent to data processing in your country if it is higher (for example, 16 in some EU countries). We do not knowingly collect personal information from children under that age. If you believe a child under that age has created an account, contact us at ",
            mail,
            " and we will delete the account and its information.",
          ],
        },
      ],
    },
    {
      heading: "8. Changes",
      blocks: [
        {
          kind: "paragraph",
          text: "If we change this policy, we will post the new version with a new effective date. If the changes are significant, we will let you know in the App.",
        },
      ],
    },
    {
      heading: "9. Contact",
      blocks: [
        {
          kind: "list",
          items: [
            "Operators: YEONWOONG JUNG and Sehyun Kim",
            "Privacy contact: Sehyun Kim",
            ["Email: ", mail],
            "App Store publisher: YEONWOONG JUNG",
            "Google Play publisher: Sehyun Kim",
          ],
        },
      ],
    },
  ],
};
