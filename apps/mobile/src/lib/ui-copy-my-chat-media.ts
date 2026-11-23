// 미얀마어 문구표 구획 — 메신저 서버 사진 · 음성 문구(my, ADR-0146 「앱 연결」).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { ChatMediaCopy } from "../screens/messenger-chat/chat-media.contract";

export const messengerChatMediaMy: ChatMediaCopy = {
  notice: (notice, media, name, until) => {
    const photo = media === "photo";
    switch (notice) {
      case "blocked":
        return photo
          ? `${name} က အဲဒီမြင်ကွင်းကို မျှဝေ၍ မရပါ။ သင့် Yeopjeon ကို ပြန်အမ်းပြီးပါပြီ။`
          : `${name} က အဲဒီစာကို အသံဖမ်း၍ မရပါ။ သင့် Yeopjeon ကို ပြန်အမ်းပြီးပါပြီ။`;
      case "failed":
        return photo
          ? "ဓာတ်ပုံ မရောက်လာပါ။ သင့် Yeopjeon ကို ပြန်အမ်းပြီးပါပြီ။"
          : "အသံမက်ဆေ့ချ် မရောက်လာပါ။ သင့် Yeopjeon ကို ပြန်အမ်းပြီးပါပြီ။";
      case "limit":
        return until === null
          ? "ဒီနေ့ အကန့်အသတ် ပြည့်သွားပါပြီ။ နောက်မှ ထပ်စမ်းကြည့်ပါ။"
          : `ဒီနေ့ အကန့်အသတ် ပြည့်သွားပါပြီ။ ${until} နောက်ပိုင်း ထပ်စမ်းကြည့်ပါ။`;
      case "busy":
        return photo ? `${name} က တခြားပုံတစ်ပုံ လုပ်နေတုန်းပါ။` : `${name} က တခြားအသံမက်ဆေ့ချ်တစ်ခု ဖမ်းနေတုန်းပါ။`;
      case "no-coins":
        return "Yeopjeon မလုံလောက်ပါ။ ထပ်ဖြည့်ပြီးမှ ပြန်တောင်းဆိုပါ။";
      case "not-eligible":
        return photo ? "ဒီမက်ဆေ့ချ်ကို ဓာတ်ပုံ ပြောင်း၍ မရပါ။" : "ဒီမက်ဆေ့ချ်ကို အသံမက်ဆေ့ချ် ပြောင်း၍ မရပါ။";
      case "unavailable":
        return "ဓာတ်ပုံနှင့် အသံမက်ဆေ့ချ်ကို ယခု သုံး၍ မရသေးပါ။";
      case "sample-gift":
        return photo
          ? "ဒီတစ်ပုံ အခမဲ့ပါ! နောက်တစ်ခါ Snapshot က Yeopjeon သုံးပါမယ်။"
          : "ဒီတစ်ခါ အခမဲ့ပါ! နောက်တစ်ခါ အသံ က Yeopjeon သုံးပါမယ်။";
      default:
        return "တောင်းဆိုမှု ပို့၍ မရပါ။ ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်စမ်းကြည့်ပါ။";
    }
  },
  hint: (availability, _media, name) => {
    switch (availability) {
      case "pending":
        return `${name} လုပ်နေတုန်းပါ`;
      case "done":
        return "ဒီမက်ဆေ့ချ်အတွက် ပို့ပြီးပါပြီ";
      default:
        return `${name} ၏ နောက်မက်ဆေ့ချ်ပြီးမှ သုံးနိုင်ပါမယ်`;
    }
  },
  aiLabel: "AI ဖြင့် ဖန်တီးထားသည်",
  voiceLabel: (name, ko, en) =>
    en === "" ? `${name}: အသံမက်ဆေ့ချ်၊ ${ko}` : `${name}: အသံမက်ဆေ့ချ်၊ ${ko}၊ ${en}`,
  listVoice: "အသံမက်ဆေ့ချ်",
};
