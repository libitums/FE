// 미얀마어 문구표 구획 — 계정 · 기타(notifications ~ coinShop).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { FeedbackCopy } from "./feedback.contract";
import type {
  AppUpdateCopy,
  CoinShopCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";
import type { DownloadSheetCopy } from "./ui-copy-settings.contract";

export const notificationsMy: NotificationsCopy = {
  title: "အသိပေးချက်များ",
  emptyTitle: "အသိပေးချက် မရှိသေးပါ",
  emptyBody: "အသစ်တစ်ခုခု ရှိလာရင် ဒီမှာ အသိပေးပါမယ်။",
  deleteLabel: (message) => `${message}၊ ဖျက်ရန်`,
  destination: {
    "roleplay-list": "သရုပ်ဆောင် စာရင်း ကြည့်ရန်",
  },
};

export const settingsMy: SettingsCopy = {
  title: "ဆက်တင်များ",
  group: { account: "အကောင့်", learning: "လေ့လာမှု", accountActions: "အကောင့် လုပ်ဆောင်ချက်များ" },
  nav: {
    profile: "ပရိုဖိုင်",
    "learner-profile": "သင်ခန်းစာထဲက အမည်နှင့် နိုင်ငံ",
    language: "ဘာသာစကား",
    download: "ဒေါင်းလုဒ်",
    notifications: "အသိပေးချက်များ",
    feedback: "အကြံပြုချက် ပို့ရန်",
    "privacy-policy": "ကိုယ်ရေးအချက်အလက် မူဝါဒ",
    "terms-of-use": "အသုံးပြုမှု စည်းမျဉ်းများ",
  },
  downloads: {
    title: "ဒေါင်းလုဒ်",
    caption: "ပုံနှင့် အသံများကို ဘယ်အချိန် ဒေါင်းမလဲ ရွေးပါ။",
    mobileDataHeading: "မိုဘိုင်းဒေတာဖြင့် ဒေါင်းခြင်း",
    policy: { ask: "အမြဲမေးရန်", always: "အမြဲဒေါင်းရန်", "wifi-only": "Wi-Fi သာ" },
    offlineHeading: "အော့ဖ်လိုင်း",
    downloadAll: "အော့ဖ်လိုင်း လေ့လာရန် အားလုံး ဒေါင်းရန်",
    downloadAllCaption: "အပိုင်းတိုင်း၏ ပုံနှင့် အသံများ — အင်တာနက်မရှိဘဲ လေ့လာနိုင်ရန်။",
    downloadAllStarted: "နောက်ကွယ်တွင် ဒေါင်းနေပါတယ်။ ဆက်လေ့လာနိုင်ပါတယ်။",
    downloaded: (size) => `ဒေါင်းပြီး: ${size}`,
    episodeRow: (n, d, t) => `အပိုင်း ${n}: သင်ခန်းစာ ${t} ခုအနက် ${d} ခု`,
    episodeRowComplete: (n) => `အပိုင်း ${n}: ပြီးပါပြီ`,
    downloadRest: (n) => `အပိုင်း ${n} ၏ ကျန်ရှိသည်များ ဒေါင်းရန်`,
    confirm: {
      title: "မိုဘိုင်းဒေတာဖြင့် ဒေါင်းမလား",
      description: "အပိုင်းအားလုံး ဒေါင်းလျှင် ဒေတာ အများကြီး ကုန်နိုင်ပါတယ်။ Wi-Fi ရမှ ဒေါင်းလည်း ရပါတယ်။",
      download: "ယခု ဒေါင်းရန်",
      cancel: "ပယ်ဖျက်ရန်",
      restDescription: (n) =>
        `အပိုင်း ${n} ၏ ကျန်ရှိသည်များကို မိုဘိုင်းဒေတာဖြင့် ဒေါင်းပါမယ်။ Wi-Fi ရမှ ဒေါင်းလည်း ရပါတယ်။`,
    },
  },
  sessionOption: {
    "auto-play-audio": "အလိုအလျောက် ဖွင့်ရန်",
    "show-transcript": "စာတန်း ပြရန်",
    "show-choice-romanization": "ရွေးစရာများတွင် အသံထွက်",
    vibration: "တုန်ခါမှု",
  },
  sessionOptionDescription: {
    "show-choice-romanization": "ကိုရီးယား အဖြေတစ်ခုစီ၏ အသံထွက်ကို အပေါ်တွင် စာလုံးသေးဖြင့် ပြပါမယ်။",
    vibration: "အဖြေ မှန်/မှား ချိန်နှင့် ကီးဘုတ် နှိပ်ချိန်တွင် တုန်ခါပါမယ်။",
  },
  optionState: { on: "ဖွင့်", off: "ပိတ်" },
  action: {
    "sign-in": "အကောင့်ဝင်ရန်",
    "sign-out": "အကောင့်ထွက်ရန်",
    "delete-account": "အကောင့်ဖျက်ရန်",
  },
  signOutDialog: { title: "အကောင့်မှ ထွက်မလား", confirm: "ထွက်ရန်", cancel: "ဆက်ဝင်ထားရန်" },
  deleteDialog: {
    title: "သင့်အကောင့်ကို ဖျက်မလား",
    description: "သင့်အကောင့်နှင့် လေ့လာမှု မှတ်တမ်းကို အပြီးတိုင် ဖျက်ပါမယ်။ ပြန်ယူ၍ မရပါ။",
    confirm: "အကောင့်ဖျက်ရန်",
    cancel: "အကောင့် ဆက်ထားရန်",
  },
  deleteFailure: {
    network: "အကောင့်ကို ဖျက်၍ မရပါ။ အင်တာနက် ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်စမ်းကြည့်ပါ။",
    other: "အကောင့်ကို ဖျက်၍ မရပါ။ ထပ်စမ်းကြည့်ပါ။",
  },
  exitAnnouncement: {
    "signed-out": "အကောင့်မှ ထွက်ပြီးပါပြီ။",
    deleted: "သင့်အကောင့်ကို ဖျက်ပြီးပါပြီ။",
  },
  version: (name, build) => `ဗားရှင်း ${name} (${build})`,
};

export const appUpdateMy: AppUpdateCopy = {
  title: "ဆက်သုံးရန် Duru ကို အပ်ဒိတ်လုပ်ပါ",
  description: "ဤ Duru ဗားရှင်းကို မပံ့ပိုးတော့ပါ။ ဆက်လေ့လာရန် စတိုးမှ နောက်ဆုံးဗားရှင်းကို ရယူပါ။",
  update: "အပ်ဒိတ်",
  failure: "စတိုးကို ဖွင့်၍ မရပါ။ App Store သို့မဟုတ် Google Play မှ Duru ကို အပ်ဒိတ်လုပ်ပါ။",
};

export const feedbackMy: FeedbackCopy = {
  title: "အကြံပြုချက် ပို့ရန်",
  ratingQuestion: "Duru ကို ဘယ်လို သဘောရလဲ",
  ratingOption: {
    1: "မကောင်းဘူး",
    2: "ပိုကောင်းဖို့ လို",
    3: "အသင့်အတင့်",
    4: "ကောင်းတယ်",
    5: "အရမ်းကြိုက်",
  },
  messageLabel: "ကျွန်ုပ်တို့ကို ပြောချင်တာ ရှိသေးလား (မထည့်လည်း ရ)",
  send: "ပို့ရန်",
  sent: "ကျေးဇူးတင်ပါတယ်။ သင့်အကြံပြုချက်ကို လက်ခံရရှိပါပြီ။",
  failed: "အကြံပြုချက် ပို့၍ မရပါ။ ထပ်စမ်းကြည့်ပါ။",
  survey: {
    title: "ဒီအပိုင်းကို ဘယ်လို သဘောရလဲ",
    messageLabel: "ဘာကို ပိုကောင်းအောင် လုပ်သင့်လဲ (မထည့်လည်း ရ)",
    reasonsLabel: "ဘာက အဆင်မပြေခဲ့လဲ။ ကိုက်ညီတာ အားလုံး ရွေးပါ။",
    reasonOption: {
      "too-hard": "ခက်လွန်း",
      "too-easy": "လွယ်လွန်း",
      audio: "အသံ ပြဿနာ",
      unclear: "နားလည်ရ ခက်",
      translation: "ဘာသာပြန် အမှား",
      stuck: "ရပ်သွား သို့ app ပြဿနာ",
      "too-long": "ရှည်လွန်း",
      other: "အခြား",
    },
    otherAccessibilityLabel: "အခြား၊ စာရိုက်ရန် အကွက် ဖွင့်မည်",
    description: (episodeTitle) => `${episodeTitle} ကို ပြီးဆုံးခဲ့ပါပြီ။ ဘယ်လို ခံစားရလဲ ပြောပြပေးပါ။`,
    skip: "နောက်မှ",
  },
};

export const profileMy: ProfileCopy = {
  notProvided: "မထည့်ရသေး",
  learningLanguage: "ကိုရီးယားဘာသာ",
  title: "ပရိုဖိုင်",
  itemLabel: {
    name: "အမည်",
    "learning-language": "လေ့လာနေသော ဘာသာ",
    email: "အီးမေးလ်",
    phone: "ဖုန်းနံပါတ်",
  },
};

export const coinShopMy: CoinShopCopy = {
  digitSeparator: ",",
  title: "Yeopjeon",
  subtitle: "ကိုရီးယား ရှေးဟောင်း ကြေးဒင်္ဂါးများ",
  balanceLabel: "သင့်တွင်",
  balance: (_count, display) => `ဒင်္ဂါး ${display} ရှိပါတယ်`,
  pickTitle: "အိတ်တစ်ခု ရွေးပါ",
  pickCaption: "သင်ခန်းစာ လေ့လာရင်း ဒင်္ဂါး ရယူပါ၊ သို့မဟုတ် ဒီမှာ ထပ်ဝယ်ပါ။",
  packName: { bundle: "ဒင်္ဂါးကြိုး", pouch: "ဒင်္ဂါးအိတ်", big: "အိတ်ကြီး" },
  coinsUnit: "ဒင်္ဂါး",
  packAmount: (_count, display) => `ဒင်္ဂါး ${display}`,
  bonus: (display) => `+${display} ဘောနပ်စ်`,
  bestValue: "အတန်ဆုံး",
  buy: (price) => `${price} ဖြင့် ဝယ်ရန်`,
  storeNote: "သင့် app စတိုးအကောင့်မှတစ်ဆင့် ငွေပေးချေပါမယ်။",
  openShop: (count) => `ဒင်္ဂါး ${count}၊ ထပ်ဝယ်ရန်`,
  notice: {
    title: "ငွေပေးချေမှု မကြာမီ ရပါမယ်",
    description: "ဒင်္ဂါး ယခု ဝယ်၍ မရသေးပါ။ နောက်မှ ပြန်လာခဲ့ပါ။",
  },
  purchaseFailed: "ဝယ်ယူမှု မအောင်မြင်ပါ။ ထပ်စမ်းကြည့်ပါ။",
  purchaseWait: {
    confirming: "ဝယ်ယူမှုကို အတည်ပြုနေသည်…",
    late: "သင့်ဝယ်ယူမှု လုံခြုံပါတယ်။ ခဏအတွင်း ပေါ်လာပါမယ်။",
    added: (_count, display) => `ဒင်္ဂါး ${display} ထည့်ပြီးပါပြီ`,
    adding: "ပိုက်ဆံအိတ်ထဲ ထည့်နေသည်",
    updating: "အပ်ဒိတ်လုပ်နေသည်",
  },
};

export const downloadSheetMy: DownloadSheetCopy = {
  askTitle: (n) => `အပိုင်း ${n} ကို ဒေါင်းမလား`,
  askDescription: "ဒီအပိုင်း၏ ပုံနှင့် အသံများ ဖုန်းထဲတွင် မရှိသေးပါ။ ဒေါင်းလျှင် မိုဘိုင်းဒေတာ သုံးပါမယ်။",
  size: (size) => `${size} ခန့်`,
  downloadNow: "ယခု ဒေါင်းရန်",
  onWifi: "Wi-Fi ရမှ ဒေါင်းရန်",
  wifiOnlyTitle: (n) => `အပိုင်း ${n} ကို Wi-Fi ရမှ ဒေါင်းပါမယ်`,
  wifiOnlyDescription:
    "ဆက်တင်များတွင် Wi-Fi သာ ကို ရွေးထားပါတယ်။ ဒီတစ်ကြိမ် မိုဘိုင်းဒေတာ သုံးပါ၊ ပုံနှင့်အသံ မပါဘဲ ဖွင့်ပါ၊ သို့မဟုတ် ဆက်တင်ကို ပြောင်းပါ။",
  ok: "အိုကေ",
  offlineTitle: "အော့ဖ်လိုင်း ဖြစ်နေပါတယ်",
  offlineDescription: (n) => `အပိုင်း ${n} ကို မဒေါင်းရသေးပါ။ အင်တာနက် ပြန်ရလျှင် ဒေါင်းပါမယ်။`,
  openAnyway: "ဒီအတိုင်း ဖွင့်ရန်",
  close: "ပိတ်ရန်",
  askUnitTitle: (l) => `${l} ကို ဒေါင်းမလား`,
  askUnitDescription: "ဒီသင်ခန်းစာ၏ ပုံနှင့် အသံများ ဖုန်းထဲတွင် မရှိသေးပါ။ ဒေါင်းလျှင် မိုဘိုင်းဒေတာ သုံးပါမယ်။",
  rows: {
    common: "အတူသုံးသော ပုံနှင့် အသံများ",
    allLessons: "ဒီအပိုင်းရှိ သင်ခန်းစာအားလုံး",
    otherLessons: "အခြား သင်ခန်းစာများ",
    status: { done: "ဖုန်းထဲတွင် ရှိပြီ", pending: "ယခု ဒေါင်းနေသည်", wifi: "Wi-Fi ရမှ" },
  },
  askHint: "အကြိမ်တိုင်း မေးပါမယ်။ ဆက်တင်များ › ဒေါင်းလုဒ် တွင် ပြောင်းနိုင်ပါတယ်။",
  wifiOnlyUnitTitle: (l) => `${l} ကို Wi-Fi ရမှ ဒေါင်းပါမယ်`,
  mobileDataOnce: "ဒီတစ်ကြိမ် မိုဘိုင်းဒေတာ သုံးရန်",
  openWithout: "ပုံနှင့်အသံ မပါဘဲ ဖွင့်ရန်",
  changeSetting: "ဆက်တင် ပြောင်းရန်",
  offlineUnitDescription: (l) => `${l} ကို မဒေါင်းရသေးပါ။ အင်တာနက် ပြန်ရလျှင် ဒေါင်းပါမယ်။`,
  offlineHint: "ပုံများကို အရောင်တစ်ရောင်တည်းဖြင့် ပြပြီး နားထောင်ရမည့် မေးခွန်းများကို ကျော်ပါမယ်။",
  allCleared: {
    title: "ဒီက ဇာတ်လမ်းအားလုံး ပြီးသွားပါပြီ",
    description: "အပိုင်းသစ် ရှိနိုင်ပါတယ်။ အင်တာနက် ချိတ်ပါ၊ ကျွန်ုပ်တို့ စစ်ပေးပါမယ်။",
    offline: "အော့ဖ်လိုင်း ဖြစ်နေပါတယ်",
    lastChecked: (d) =>
      d === null
        ? "မစစ်ရသေးပါ"
        : d === 0
          ? "ဒီနေ့ နောက်ဆုံး စစ်ခဲ့သည်"
          : d === 1
            ? "မနေ့က နောက်ဆုံး စစ်ခဲ့သည်"
            : `လွန်ခဲ့သော ${d} ရက်က နောက်ဆုံး စစ်ခဲ့သည်`,
    checkNow: "ယခု စစ်ရန်",
    later: "နောက်မှ",
    autoNote: "အင်တာနက် ပြန်ရလျှင် အလိုအလျောက်လည်း စစ်ပေးပါမယ်။",
    offlineHint: "ချိတ်ဆက်မိသည်နှင့် စစ်ပေးပါမယ်။",
  },
};
