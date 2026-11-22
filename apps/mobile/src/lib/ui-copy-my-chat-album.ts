// 미얀마어 문구표 구획 — 앨범 · 사진 속 내 모습 · 다시 만들기 문구(my, ADR-0150).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { ChatAlbumCopy } from "../screens/messenger-chat/chat-album.contract";

const MONTHS = [
  "ဇန်နဝါရီ",
  "ဖေဖော်ဝါရီ",
  "မတ်",
  "ဧပြီ",
  "မေ",
  "ဇွန်",
  "ဇူလိုင်",
  "ဩဂုတ်",
  "စက်တင်ဘာ",
  "အောက်တိုဘာ",
  "နိုဝင်ဘာ",
  "ဒီဇင်ဘာ",
];

export const messengerChatAlbumMy: ChatAlbumCopy = {
  sidebarRow: "အယ်လ်ဘမ်",
  sidebarDescription: "ဓာတ်ပုံနှင့် အသံမက်ဆေ့ချ်များ",
  title: (name) => `${name} ၏ အယ်လ်ဘမ်`,
  back: "နောက်သို့",
  tabs: { all: "အားလုံး", photos: "ဓာတ်ပုံ", voice: "အသံ" },
  day: (day) =>
    day.kind === "today"
      ? "ဒီနေ့"
      : day.kind === "yesterday"
        ? "မနေ့က"
        : `${day.day} ${MONTHS[day.month - 1] ?? ""}`,
  drawing: "ဆွဲနေသည်…",
  recording: "အသံဖမ်းနေသည်…",
  versions: (count) => `ဗားရှင်း ${count} ခု`,
  version: (index, count) => `ဗားရှင်း ${index}/${count}`,
  pastChat: "ယခင် ချတ်မှ",
  keepNote: "ချတ်ကို ဖျက်လိုက်လည်း ဓာတ်ပုံနှင့် အသံမက်ဆေ့ချ်များ ဒီမှာ ကျန်ပါမယ်။",
  empty: (name) => `${name} ထံမှ ဓာတ်ပုံနှင့် အသံမက်ဆေ့ချ်များ ဒီမှာ ပေါ်ပါမယ်။`,
  loadFailed: "အယ်လ်ဘမ်ကို ဖွင့်၍ မရပါ။",
  tryAgain: "ထပ်စမ်းကြည့်ပါ",
  more: "နောက်ထပ်",
  photoLabel: (name, line) => (line === "" ? `${name} ထံမှ ဓာတ်ပုံ` : `${name} ထံမှ ဓာတ်ပုံ၊ ${line}`),
  voiceLabel: (name, line) =>
    line === "" ? `${name} ထံမှ အသံမက်ဆေ့ချ်` : `${name} ထံမှ အသံမက်ဆေ့ချ်၊ ${line}`,
  viewerTitle: (name, day) => `${name} · ${day}`,
  fromChat: "ချတ်မှ",
  close: "ပိတ်ရန်",
  redraw: (price) => `ပြန်ဆွဲရန် · ${price}`,
  recordAgain: (price) => `ပြန်ဖမ်းရန် · ${price}`,
  play: "ဖွင့်ရန်",
  pause: "ခဏရပ်ရန်",
  redrawTitle: "ဒီပုံကို ပြန်ဆွဲမလား",
  redrawBody: (name) => `${name} က ဒီအခိုက်အတန့်ကို ပြန်ဆွဲပေးပါမယ်။ ပုံနှစ်ပုံလုံး အယ်လ်ဘမ်ထဲမှာ ရှိနေပါမယ်။`,
  recordTitle: "အသံ ပြန်ဖမ်းမလား",
  recordBody: (name) => `${name} က ဒီစာကြောင်းကို အသံဖိုင်အသစ်ဖြင့် ပြန်ပြောပေးပါမယ်။`,
  confirmRedraw: (price) => `Yeopjeon ${price} ဖြင့် ပြန်ဆွဲရန်`,
  confirmRecord: (price) => `Yeopjeon ${price} ဖြင့် ပြန်ဖမ်းရန်`,
  balance: (coins) => `Yeopjeon ${coins} ရှိပါတယ်`,
  getCoins: "Yeopjeon ရယူရန်",
  cancel: "ပယ်ဖျက်ရန်",
  refused: (notice, media, name) => {
    const photo = media === "photo";
    switch (notice) {
      case "no-coins":
        return "Yeopjeon မလုံလောက်ပါ။";
      case "busy":
        return photo ? `${name} က တခြားပုံတစ်ပုံ ဆွဲနေတုန်းပါ။` : `${name} က တခြားမက်ဆေ့ချ်တစ်ခု အသံဖမ်းနေတုန်းပါ။`;
      case "limit":
        return "ဒီနေ့ အကန့်အသတ် ပြည့်သွားပါပြီ။ နောက်မှ ထပ်စမ်းကြည့်ပါ။";
      case "not-eligible":
        return photo ? "ဒီပုံကို ပြန်ဆွဲ၍ မရပါ။" : "ဒီမက်ဆေ့ချ်ကို ပြန်ဖမ်း၍ မရပါ။";
      default:
        return "တောင်းဆိုမှု ပို့၍ မရပါ။ ထပ်စမ်းကြည့်ပါ။";
    }
  },
  selfSection: "သင့်အကြောင်း",
  selfRow: "ဓာတ်ပုံထဲက သင်",
  selfTitle: "ဓာတ်ပုံထဲက သင်",
  selfBody: "ဇာတ်ကောင်က ဓာတ်ပုံပို့တဲ့အခါ သင်လည်း ပါလာနိုင်ပါတယ်။ သင့်မျက်နှာကို ဘယ်တော့မှ မဆွဲပါဘူး။",
  selfAsk: "ဘယ်လို ပါချင်လဲ",
  selfAskNote: "အမြဲ နောက်ကျောဘက်မှသာ၊ မျက်နှာ ဘယ်တော့မှ မပါပါ။ နောက်မှ ဆက်တင်များ › ချတ် တွင် ပြောင်းနိုင်ပါတယ်။",
  selfOptions: {
    female: { title: "အမျိုးသမီး", body: "နောက်ကျောဘက်မှ" },
    male: { title: "အမျိုးသား", body: "နောက်ကျောဘက်မှ" },
    hidden: { title: "လက်သာ", body: "သင့်လက် သို့မဟုတ် ပခုံးသာ" },
  },
  save: "သိမ်းရန်",
};
