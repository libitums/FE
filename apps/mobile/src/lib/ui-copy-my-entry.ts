// 미얀마어 문구표 구획 — 진입 흐름(onboarding · languageSelect · journeyEntry · login · verificationCode).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { AuthFailureCopy } from "./auth-failure";
import type { JourneyEntryCopy } from "../screens/journey-entry/journey-entry.contract";
import type { LanguageSelectCopy } from "../screens/language-select/language-select.contract";
import type { LoginCopy } from "../screens/login/login.contract";
import type { OnboardingScreenCopy } from "../screens/onboarding/onboarding.contract";
import type { VerificationCodeCopy } from "../screens/verification-code/verification-code.contract";

// 제목은 「앞말 + 강조어」 둘로 나뉩니다 — 미얀마어 명사구는 꾸밈말이 앞에 오므로 강조어를 뒤에 두었습니다.
export const onboardingMy: OnboardingScreenCopy = {
  steps: {
    0: {
      title: "ပျော်စရာ",
      titleEmphasis: "ဇာတ်လမ်းသင်ခန်းစာ",
      body: "နေ့စဉ်ဘဝ အခိုက်အတန့်တွေကို လိုက်ကြည့်ရင်း\nကိုရီးယားစကားကို လေ့လာပါ။",
    },
    1: {
      title: "လက်တွေ့သုံး",
      titleEmphasis: "ကိုရီးယားစကား",
      body: "လက်တွေ့စကားပြောကို လေ့ကျင့်ပြီး\nတိုတိုပဟေဠိတွေနဲ့ သင်ခဲ့တာကို ပြန်စစ်ပါ။",
    },
    2: {
      title: "တစ်နေ့",
      titleEmphasis: "5 မိနစ်သာ",
      body: "နေ့တိုင်း သင်ခန်းစာတိုလေးတွေ၊ သင့်အချိန်နဲ့ ကိုက်ညီပါတယ်။\nသင်ခန်းစာတစ်ခုကို ငါးမိနစ်အတွင်း ပြီးနိုင်ပါတယ်။",
    },
  },
  getStarted: "စတင်ရန်",
  progress: (ordinal, total) => `အဆင့် ${ordinal} / ${total}`,
  storyChat: {
    friend: "Doyun",
    atStore: "ကွန်ဗီနီယန့်စတိုးရှေ့ ရောက်နေပြီ။ ဘာသောက်ချင်လဲ။",
    water: "ရေတစ်ဘူး ဝယ်ခဲ့ပေးပါ။",
    onMyWay: "ရပြီ။ အခုလာခဲ့မယ်!",
  },
  quiz: { replay: "ပြန်နားထောင်ရန်", stop: "ရပ်ရန်", play: "ဖွင့်ရန်" },
  unit: {
    title: "အလှကုန်ဆိုင်မှာ ဈေးဝယ်ခြင်း",
    meta: "သင်ခန်းစာ 1 · 5 မိနစ်",
    status: { active: "လေ့လာနေဆဲ", clear: "ပြီးပါပြီ" },
  },
};

export const languageSelectMy: LanguageSelectCopy = {
  title: "ဘာသာစကား ရွေးရန်",
  caption: "အသုံးပြုလိုသော ဘာသာစကားကို ရွေးပါ",
  preview: {
    question: "ဘာကြားခဲ့လဲ။",
    meaning: "ကျေးဇူးတင်ပါတယ်",
  },
};

export const journeyEntryMy: JourneyEntryCopy = {
  title: "ခရီးစဉ်က သင့်ကို စောင့်နေပါတယ်",
  display: "ဇာတ်လမ်း စတင်ရန်",
  caption: "ဆိုးလ်မြို့ကို လှည့်လည်ရင်း သူငယ်ချင်းသစ်တွေနဲ့ တွေ့ပြီး ကိုရီးယားစကား လေ့လာပါ။",
  notice: "ဤဝန်ဆောင်မှုရှိ ပုံအချို့ကို AI နည်းပညာဖြင့် ဖန်တီးထားပါသည်",
  start: "စတင်ရန်",
};

export const loginMy: LoginCopy = {
  guest: "အကောင့်မပါဘဲ ဆက်သွားရန်",
  method: {
    phone: "ရှေ့ဆက်ရန်",
    google: "Google ဖြင့် ဆက်သွားရန်",
    apple: "Apple ဖြင့် ဝင်ရန်",
    facebook: "Facebook ဖြင့် ဆက်သွားရန်",
  },
  heading: {
    visible: {
      title: "ဖုန်းနံပါတ်ဖြင့် ဝင်ရန် သို့မဟုတ် စာရင်းသွင်းရန်",
      caption: "ဆက်လုပ်ရန် ဖုန်းနံပါတ် ထည့်ပါ",
    },
    hidden: { title: "ဝင်ရန် သို့မဟုတ် စာရင်းသွင်းရန်", caption: "ဆက်လုပ်လိုသော နည်းလမ်းကို ရွေးပါ" },
  },
  countryCode: (name, dialCode) => `နိုင်ငံကုဒ်၊ ${name} ${dialCode}`,
  phoneNumber: "ဖုန်းနံပါတ်",
  or: "သို့မဟုတ်",
  countrySheetTitle: "နိုင်ငံ ရွေးရန်",
  legal: {
    // 미얀마어는 동사가 끝에 오므로 「동의합니다」를 앞말에 넣었습니다.
    lead: "ဆက်လုပ်ခြင်းဖြင့် အောက်ပါတို့ကို သဘောတူပါသည် —",
    termsOfUse: "အသုံးပြုမှု စည်းမျဉ်းများ",
    and: "နှင့်",
    privacyPolicy: "ကိုယ်ရေးအချက်အလက် မူဝါဒ",
  },
  // 수단 사용 불가 안내 대화상자(ADR-0111 개정 2).
  unavailable: {
    title: (method) => `${method} ဖြင့် ဝင်ခြင်းကို ယာယီ အသုံးမပြုနိုင်ပါ`,
    description: "ဤဝင်ရောက်နည်းကို ဆက်တင်အသစ်သို့ ပြောင်းနေပါသည်။ ယခုအတွက် Google ဖြင့် သို့မဟုတ် အကောင့်မပါဘဲ ဆက်သွားပါ။",
    descriptionWithoutGuest: "ဤဝင်ရောက်နည်းကို ဆက်တင်အသစ်သို့ ပြောင်းနေပါသည်။ ယခုအတွက် Google ဖြင့် ဆက်သွားပါ။",
    close: "ပိတ်ရန်",
  },
};

export const verificationCodeMy: VerificationCodeCopy = {
  title: "OTP အတည်ပြုကုဒ်",
  sentTo: "အတည်ပြုကုဒ်ကို ပို့ထားသည့် နံပါတ်",
  digit: (ordinal, total) => `ဂဏန်း ${ordinal} / ${total}`,
  resendHint: "ကုဒ် မရသေးဘူးလား။",
  resend: "ပြန်ပို့ရန်",
  submit: "ရှေ့ဆက်ရန်",
};

export const authFailureMy: AuthFailureCopy = {
  network: "ချိတ်ဆက်၍ မရပါ။ အင်တာနက်ကို စစ်ပြီး ထပ်စမ်းကြည့်ပါ။",
  unavailable: "တစ်ခုခု မှားယွင်းသွားပါသည်။ ထပ်စမ်းကြည့်ပါ။",
  unconfigured: "ယခု ဝင်ရောက်၍ မရသေးပါ။",
  "rate-limited": "ကြိုးစားမှု များလွန်းနေပါသည်။ ခဏစောင့်ပြီး ထပ်စမ်းကြည့်ပါ။",
  rejected: "ဤနံပါတ်သို့ ကုဒ်ပို့၍ မရပါ။ ဖုန်းနံပါတ်ကို စစ်ပြီး ထပ်စမ်းကြည့်ပါ။",
  "invalid-code": "ကုဒ် မှားနေသည် သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။",
  "sign-in-incomplete": "ဝင်ရောက်မှု မပြီးဆုံးသေးပါ။ ထပ်စမ်းကြည့်ပါ။",
  unsupported: "ဤစက်ပစ္စည်းတွင် ဤဝင်ရောက်နည်းကို မရနိုင်ပါ။",
};
