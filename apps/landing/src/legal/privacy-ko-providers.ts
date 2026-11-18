import { legalMail as mail } from "./legal-contact";
import type { LegalSection, LegalText } from "./legal.contract";

const notice = (href: string): LegalText => [{ label: "개인정보 처리방침", href }];

// 개인정보 처리방침(한국어 번역본) 3절 — 처리 위탁과 국외 이전입니다. 기준본은 `privacy-en-providers.ts`이고
// 행의 순서와 수가 같아야 합니다(단위 테스트가 봅니다).
export const privacyProvidersKo: LegalSection = {
  heading: "3. 처리 위탁과 국외 이전",
  blocks: [
    {
      kind: "paragraph",
      text: "저희는 대한민국에 있으며 주 데이터베이스는 일본에 있습니다. 앱과 웹사이트를 운영하기 위해 아래 업체의 서비스를 이용합니다. 이 업체들은 저희를 대신해 정보를 처리하고, 일부는 다른 나라에 있어서 정보가 아래 표의 국가로 이전되어 처리됩니다. 정보는 해당 기능을 이용하는 시점에 암호화된 연결로 전송됩니다.",
    },
    {
      kind: "table",
      caption: "처리 위탁 업체",
      head: ["이전받는 자", "하는 일", "이전 항목", "이전 국가", "연락처"],
      rows: [
        [
          "Supabase, Inc.",
          "데이터베이스, 로그인, 파일 보관, 서버 기능",
          "계정 · 프로필 · 학습 기록 · 대화와 기억 · 구매 상태 · 알림 토큰 · 의견, 사전 등록 이메일과 웹 체험판에서 인식된 글자",
          "일본",
          notice("https://supabase.com/privacy"),
        ],
        [
          "Anthropic, PBC",
          "캐릭터의 답변 · 교정 · 번역 · 요약 생성과 안전 검사",
          "보낸 대화 메시지와 답변에 필요한 맥락(이전 메시지, 기억, 대화 설정 등)",
          "미국",
          notice("https://www.anthropic.com/legal/privacy"),
        ],
        [
          "OpenAI, L.L.C.",
          "캐릭터에게 요청한 사진 생성(제공되는 경우)",
          "대화에서 뽑은 장면 묘사",
          "미국",
          notice("https://openai.com/policies/privacy-policy/"),
        ],
        [
          "ElevenLabs Inc.",
          "캐릭터에게 요청한 음성 메시지 생성(제공되는 경우)",
          "캐릭터 대사의 글",
          "미국",
          notice("https://elevenlabs.io/privacy-policy"),
        ],
        [
          "RevenueCat, Inc.",
          "구매와 구독 상태 관리(제공되는 경우)",
          "사용자 ID, 구매한 상품, 구독 상태",
          "미국",
          notice("https://www.revenuecat.com/privacy"),
        ],
        [
          "Apple Inc.",
          "Apple로 로그인, 음성 인식, 알림 전달, App Store 구매",
          "Apple 식별자, 서버 인식을 쓸 때의 음성, 알림 토큰과 내용, 구매 내역",
          "미국 및 Apple이 운영하는 그 밖의 국가",
          notice("https://www.apple.com/legal/privacy/"),
        ],
        [
          "Google LLC",
          "Google로 로그인(선택한 경우에만), Android 음성 인식, Android 알림 전달, Google Play 구매",
          "Google 계정 이름 · 이메일 주소 · 프로필 사진, 음성, 알림 토큰과 내용, 구매 내역",
          "미국 및 Google이 운영하는 그 밖의 국가",
          notice("https://policies.google.com/privacy"),
        ],
        [
          "Google LLC",
          "웹사이트 분석(Google Analytics)",
          "웹사이트 방문 정보",
          "미국 및 Google이 운영하는 그 밖의 국가",
          notice("https://policies.google.com/privacy"),
        ],
        [
          "Meta Platforms, Inc.",
          "Facebook으로 로그인(선택한 경우에만)",
          "Facebook 이름 · 이메일 주소 · 프로필 사진",
          "미국 및 Meta가 운영하는 그 밖의 국가",
          notice("https://www.facebook.com/privacy/policy/"),
        ],
        [
          "PostHog, Inc.",
          "이용 분석",
          "이용 정보와 사용자 ID",
          "미국",
          notice("https://posthog.com/privacy"),
        ],
        [
          "Functional Software, Inc. (Sentry)",
          "Android 오류 보고",
          "오류 내용, 앱 버전, 기기 모델, 운영체제 버전",
          "미국",
          notice("https://sentry.io/privacy/"),
        ],
        [
          "AB180 Inc. (Airbridge)",
          "광고 성과 측정과 기여 분석",
          "앱 설치와 이용 이벤트, 기기 정보, 앱 범위 식별자, 광고 ID(Android), IDFA(iOS, 추적을 허용한 경우에만)",
          "대한민국",
          [{ label: "웹사이트", href: "https://www.airbridge.io/" }],
        ],
        [
          "Vercel Inc.",
          "웹사이트 호스팅",
          "IP 주소와 기술적 요청 정보",
          "미국 및 Vercel이 운영하는 그 밖의 국가",
          notice("https://vercel.com/legal/privacy-notice"),
        ],
        [
          "브라우저 제공자(예: Chrome은 Google LLC, Safari는 Apple Inc.)",
          "웹 체험판의 음성 인식",
          "말하는 동안의 음성",
          "제공자에 따라 다름",
          "브라우저의 개인정보 처리방침 참고",
        ],
      ],
    },
    {
      kind: "paragraph",
      text: "각 업체는 저희에게 서비스를 제공하는 데 필요한 기간에만 정보를 보유하며, 법령이 더 오래 보관하도록 요구하는 경우가 아니면 4절의 기간을 넘기지 않습니다.",
    },
    {
      kind: "paragraph",
      text: [
        "이 이전을 원하지 않으면 ",
        mail,
        "로 메일을 보내 거부할 수 있습니다. 데이터베이스를 호스팅하는 업체와 답변을 생성하는 업체 없이는 앱이 동작하지 않으므로, 이 이전을 거부하면 계정을 삭제하고 이전을 중단합니다. 선택 사항인 업체는 해당 기능을 쓰지 않으면 피할 수 있습니다. 예를 들어 다른 로그인 방법을 고르거나 알림을 허용하지 않으면 됩니다.",
      ],
    },
  ],
};
