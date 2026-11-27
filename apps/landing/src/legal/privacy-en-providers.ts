import { legalMail as mail } from "./legal-contact";
import type { LegalSection, LegalText } from "./legal.contract";

const notice = (href: string): LegalText => [{ label: "Privacy notice", href }];

// 개인정보 처리방침(영어 · 기준본) 3절 — 처리 위탁과 국외 이전입니다. 받는 회사가 늘거나 바뀌면 이 표와
// `privacy-ko-providers.ts`의 표를 같은 PR에서 고칩니다(행의 순서와 수가 같아야 합니다 — 단위 테스트가 봅니다).
export const privacyProvidersEn: LegalSection = {
  heading: "3. Service providers and international transfers",
  blocks: [
    {
      kind: "paragraph",
      text: "We are based in the Republic of Korea and our main database is hosted in Japan. We use the service providers below to run the App and the Website. They process information on our behalf, and some of them are in other countries, so your information is transferred to and processed in the countries listed. Information is sent over encrypted connections at the time you use the related feature.",
    },
    {
      kind: "table",
      caption: "Service providers",
      head: ["Provider", "What they do", "Information", "Location", "Contact"],
      rows: [
        [
          "Supabase, Inc.",
          "Database, sign-in, file storage, and server functions",
          "Account, profile, learning records, chats and memories, purchase status, notification tokens, and feedback; pre-registration email and text recognized in the web trial",
          "Japan",
          notice("https://supabase.com/privacy"),
        ],
        [
          "Anthropic, PBC",
          "Generating the characters' replies, corrections, translations, summaries, and safety checks",
          "Your chat messages and the context needed to reply, such as earlier messages, memories, and chat settings",
          "United States",
          notice("https://www.anthropic.com/legal/privacy"),
        ],
        [
          "OpenAI, L.L.C.",
          "Generating pictures you ask a character for",
          "A description of the scene taken from the chat",
          "United States",
          notice("https://openai.com/policies/privacy-policy/"),
        ],
        [
          "ElevenLabs Inc.",
          "Generating voice messages you ask a character for",
          "The text of the character's line",
          "United States",
          notice("https://elevenlabs.io/privacy-policy"),
        ],
        [
          "RevenueCat, Inc.",
          "Keeping track of purchases and subscriptions",
          "User ID, products bought, and subscription status",
          "United States",
          notice("https://www.revenuecat.com/privacy"),
        ],
        [
          "Apple Inc.",
          "Sign in with Apple, speech recognition, delivering notifications, and App Store purchases",
          "Apple identifier; speech audio when server recognition is used; notification token and content; purchase details",
          "United States and other countries where Apple operates",
          notice("https://www.apple.com/legal/privacy/"),
        ],
        [
          "Google LLC",
          "Sign-in with Google (only if you choose it), speech recognition on Android, delivering notifications on Android, and Google Play purchases",
          "Your Google account name, email address, and profile picture; speech audio; notification token and content; purchase details",
          "United States and other countries where Google operates",
          notice("https://policies.google.com/privacy"),
        ],
        [
          "Google LLC",
          "Website analytics (Google Analytics)",
          "Website visit information",
          "United States and other countries where Google operates",
          notice("https://policies.google.com/privacy"),
        ],
        [
          "Meta Platforms, Inc.",
          "Sign-in with Facebook (only if you choose it)",
          "Your Facebook name, email address, and profile picture",
          "United States and other countries where Meta operates",
          notice("https://www.facebook.com/privacy/policy/"),
        ],
        [
          "PostHog, Inc.",
          "Usage analytics",
          "Usage information and user ID",
          "United States",
          notice("https://posthog.com/privacy"),
        ],
        [
          "Functional Software, Inc. (Sentry)",
          "Error and crash reports on Android and iOS",
          "Error details, App version, device model, and operating system version; if you are signed in, your user ID (a random internal ID). No name, email address, or IP address",
          "United States",
          notice("https://sentry.io/privacy/"),
        ],
        [
          "AB180 Inc. (Airbridge)",
          "Advertising measurement and attribution",
          "App install and usage events, device information, app-scoped identifiers, advertising ID (Android), and IDFA (iOS, only if you allow tracking)",
          "Republic of Korea",
          [{ label: "Website", href: "https://www.airbridge.io/" }],
        ],
        [
          "Vercel Inc.",
          "Website hosting",
          "IP address and technical request data",
          "United States and other countries where Vercel operates",
          notice("https://vercel.com/legal/privacy-notice"),
        ],
        [
          "Your browser's provider (for example, Google LLC for Chrome, Apple Inc. for Safari)",
          "Speech recognition in the web trial",
          "Speech audio while you speak",
          "Varies by provider",
          "See your browser's privacy notice",
        ],
      ],
    },
    {
      kind: "paragraph",
      text: "Providers keep the information only for as long as they need it to provide their service to us, and no longer than the periods in section 4, unless the law requires them to keep it longer.",
    },
    {
      kind: "paragraph",
      text: [
        "You can object to these transfers by emailing us at ",
        mail,
        ". The App cannot run without the providers that host our database and generate replies, so if you object to those transfers we will delete your account and stop them. You can avoid an optional provider by not using its feature, for example by choosing a different sign-in method or by not allowing notifications.",
      ],
    },
  ],
};
