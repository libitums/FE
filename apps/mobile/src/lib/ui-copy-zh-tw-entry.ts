// 대만 중국어(번체, zh-TW) 문구표 구획 — 진입 흐름(onboarding · languageSelect · journeyEntry · login · verificationCode) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { AuthFailureCopy } from "./auth-failure";
import type { JourneyEntryCopy } from "../screens/journey-entry/journey-entry.contract";
import type { LanguageSelectCopy } from "../screens/language-select/language-select.contract";
import type { LoginCopy } from "../screens/login/login.contract";
import type { OnboardingScreenCopy } from "../screens/onboarding/onboarding.contract";
import type { VerificationCodeCopy } from "../screens/verification-code/verification-code.contract";

// 제목은 영어처럼 「앞말 + 강조어」 둘로 나뉩니다 — 강조어가 뒤에 와야 자연스러운 어순으로 골랐습니다.
export const onboardingZhTw: OnboardingScreenCopy = {
  steps: {
    0: {
      title: "跟著",
      titleEmphasis: "故事",
      body: "跟著故事裡的日常片段，\n順便學會韓語。",
    },
    1: {
      title: "練習",
      titleEmphasis: "韓語",
      body: "練習真實的對話，\n再用小測驗複習學過的內容。",
    },
    2: {
      title: "只要",
      titleEmphasis: "5分鐘",
      body: "每天簡短的單元，輕鬆融入你的生活。\n5分鐘就能完成一個。",
    },
  },
  getStarted: "開始使用",
  progress: (ordinal, total) => `第${ordinal}步，共${total}步`,
  storyChat: {
    friend: "Doyun",
    atStore: "我在便利商店，要喝點什麼嗎？",
    water: "幫我買一瓶水，謝啦！",
    onMyWay: "好，我馬上到！",
  },
  quiz: { replay: "重播", stop: "停止", play: "播放" },
  unit: {
    title: "在美妝店購物",
    meta: "第1單元 · 5分鐘",
    status: { active: "學習中", clear: "已完成" },
  },
};

export const languageSelectZhTw: LanguageSelectCopy = {
  title: "選擇語言",
  caption: "選擇你要使用的語言",
  preview: {
    question: "你聽到了什麼？",
    meaning: "謝謝",
  },
};

export const journeyEntryZhTw: JourneyEntryCopy = {
  title: "你的旅程即將展開",
  display: "開始你的故事",
  caption: "第一次接觸韓文字母嗎？抵達首爾前，先認識幾個字母吧。",
  notice: "本服務中的部分圖片是使用 AI 技術生成",
  basics: "先學基礎",
  basicsDetail: "6個字母、3個發音，接著進入故事",
  story: "直接進入故事",
  firstSteps: {
    progress: (current, total) => `第${current}步，共${total}步`,
    lettersTitle: "認識你的第一批字母",
    lettersLead: "一個子音加一個母音，組成一個音節。",
    lettersHear: "點一下字母就能聽發音。",
    lettersNext: "把它們組合起來",
    readyTitle: "你剛剛讀懂了韓文！",
    readyMeaning: "「你也要去嗎？」",
    readyBody: "你在首爾的故事即將開始。",
    readyGo: "嗯，走吧！",
  },
};

export const loginZhTw: LoginCopy = {
  guest: "不登入帳號繼續使用",
  method: {
    phone: "繼續",
    google: "使用 Google 繼續",
    apple: "使用 Apple 登入",
    facebook: "使用 Facebook 繼續",
  },
  heading: {
    visible: {
      title: "使用手機號碼登入或註冊",
      caption: "請輸入你的手機號碼以繼續",
    },
    hidden: { title: "登入或註冊", caption: "選擇你想要的繼續方式" },
  },
  countryCode: (name, dialCode) => `國碼，${name} ${dialCode}`,
  phoneNumber: "手機號碼",
  or: "或",
  countrySheetTitle: "選擇國家",
  legal: {
    lead: "繼續即表示你同意",
    termsOfUse: "使用條款",
    and: "和",
    privacyPolicy: "隱私權政策",
  },
  // 수단 사용 불가 안내 대화상자(ADR-0111 개정 2).
  unavailable: {
    title: (method) => `暫時無法使用 ${method} 登入`,
    description:
      "我們正在將這個登入方式轉移到新系統。目前請使用 Google 繼續，或不登入帳號繼續使用。",
    descriptionWithoutGuest: "我們正在將這個登入方式轉移到新系統。目前請使用 Google 繼續。",
    close: "關閉",
  },
};

export const verificationCodeZhTw: VerificationCodeCopy = {
  title: "OTP 驗證碼",
  sentTo: "驗證碼已傳送至",
  digit: (ordinal, total) => `第${ordinal}位數，共${total}位數`,
  resendHint: "沒有收到驗證碼嗎？",
  resend: "重新傳送",
  submit: "繼續",
};

export const authFailureZhTw: AuthFailureCopy = {
  network: "無法連線。請檢查網路連線後再試一次。",
  unavailable: "發生錯誤。請再試一次。",
  unconfigured: "目前無法登入。",
  "rate-limited": "嘗試次數過多。請稍候再試一次。",
  rejected: "無法傳送驗證碼到這個號碼。請檢查號碼後再試一次。",
  "invalid-code": "驗證碼錯誤或已過期。",
  "sign-in-incomplete": "登入未完成。請再試一次。",
  unsupported: "這台裝置不支援此登入方式。",
};
