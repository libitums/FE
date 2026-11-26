// 미얀마어 문구표 구획 — 추천 친구 줄 · 프로필 시트 · 친구 찾기 문구(my, ADR-0162).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { SuggestedFriendsCopy } from "../screens/messenger-chat/suggested-friends.contract";

export const messengerChatSuggestedMy: SuggestedFriendsCopy = {
  language: "my",
  rowTitle: "သူငယ်ချင်းသစ်များနှင့် တွေ့ပါ",
  seeAll: "အားလုံးကြည့်ရန်",
  seeAllLabel: "သူငယ်ချင်းအားလုံး ကြည့်ရန်",
  newLabel: (name) => `${name}၊ သူငယ်ချင်းသစ်`,
  lockedLabel: (name, episode) => `${name}၊ အပိုင်း ${episode} တွင် တွေ့မည်`,
  earlyLabel: (name, episode, price) =>
    `${name}၊ အပိုင်း ${episode} တွင် တွေ့မည် သို့မဟုတ် ဒင်္ဂါး ${price} ဖြင့် ယခုပင် စာပို့နိုင်သည်`,
  sheetLabel: (name) => `${name}၊ ပရိုဖိုင်`,
  newBadge: "အသစ်",
  startChatting: "စကားစပြောရန်",
  notNow: "နောက်မှ",
  meetIn: (episode) => `အပိုင်း ${episode} တွင် တွေ့ပါမယ်`,
  lockedInfo: (name) => `ဖုန်းနံပါတ် လဲလှယ်ရန် ဇာတ်လမ်းကို ပြီးအောင်လုပ်ပါ — ${name} က အရင် စာပို့ပါမယ်။`,
  chatNow: (price) => `ယခု စာပို့ရန် · ${price}`,
  earlyButtonLabel: (price, left) =>
    `ဒင်္ဂါး ${price} ဖြင့် ယခု စာပို့ရန်၊ အချိန်အကန့်အသတ်ရှိ အထူးအစီအစဉ်${left === null ? "" : `၊ ${left.days} ရက် ${left.hours} နာရီ ကျန်သည်`}`,
  launchSpecial: (name) => `စတင်ချိန် အထူး · ${name} နှင့် စောစော တွေ့ပါ`,
  limited: "အကန့်အသတ်",
  limitedUntil: (days, hours) => `အကန့်အသတ် · ${days} ရက် ${hours} နာရီ`,
  added: (name) => `${name} ကို ချတ်သို့ ထည့်ပြီးပါပြီ`,
  addFailed: (name) => `${name} ကို ထည့်၍ မရပါ။ ထပ်စမ်းကြည့်ပါ။`,
  voice: {
    hear: "အသံနားထောင်ရန်",
    pause: "ခဏရပ်ရန်",
    resume: "ဆက်ဖွင့်ရန်",
    label: (name, phase) =>
      phase === "idle"
        ? `${name} ရဲ့ အသံကို နားထောင်ရန်`
        : phase === "playing"
          ? `${name} ရဲ့ အသံကို ခဏရပ်ရန်`
          : `${name} ရဲ့ အသံကို ဆက်ဖွင့်ရန်`,
    unavailable: "နမူနာအသံ ဖွင့်မရပါ",
  },
  adultAck: {
    title: (name) => `${name} နှင့် ပိုရင်းနှီးမလား`,
    body: (gender) =>
      gender === null
        ? "စကားပြောမှု ပိုနွေးထွေးပြီး ရင်းနှီးလာနိုင်ပါတယ်၊ တဖြည်းဖြည်း သိကျွမ်းလာတဲ့ သူငယ်ချင်းလိုပေါ့။"
        : `${gender === "female" ? "သူမ" : "သူ"} က သင့်အပေါ် ပိုနွေးထွေးပြီး ရင်းနှီးလာနိုင်ပါတယ်၊ တဖြည်းဖြည်း သိကျွမ်းလာတဲ့ သူငယ်ချင်းလိုပေါ့။`,
    safe: "အမြဲ ယဉ်ကျေးပြီး လေးစားမှု ရှိပါမယ်။ ညစ်ညမ်းသော အကြောင်းအရာ ဘယ်တော့မှ မပါပါ။",
    casual: (gender) =>
      `နောက်ပိုင်း ပေါ့ပေါ့ပါးပါး ထားချင်လား။ ${gender === null ? "ပြောလိုက်ရုံပါပဲ။" : `${gender === "female" ? "သူမ" : "သူ"} ကို ပြောလိုက်ရုံပါပဲ။`}`,
    confirm: "ကောင်းသားပဲ",
    decline: "သူငယ်ချင်းအဖြစ် အရင်ထားမယ်",
  },
  directory: {
    title: "သူငယ်ချင်း ရှာရန်",
    back: "နောက်သို့",
    all: "အားလုံး",
    fromStory: "ဇာတ်လမ်းမှ",
    sectionStory: "သင့်ဇာတ်လမ်းမှ",
    sectionNew: "သူငယ်ချင်းသစ်များ",
    chat: "စာပို့ရန်",
    chatLabel: (name) => `${name} ထံ စာပို့ရန်`,
    added: "ထည့်ပြီး",
    addedLabel: (name) => `${name}၊ ချတ်ထဲတွင် ရှိပြီ`,
    earlyLabel: (name, price) => `ဒင်္ဂါး ${price} ဖြင့် ${name} နှင့် စောစော တွေ့ရန်`,
    locked: (episode) => `အပိုင်း ${episode}`,
    lockedLabel: (name, episode) => `${name}၊ အပိုင်း ${episode} တွင် တွေ့မည်`,
    meetIn: (episode) => `အပိုင်း ${episode} တွင် တွေ့မည်`,
    moreComing: "သူငယ်ချင်းသစ်များ မကြာမီ ထပ်လာပါမယ်",
    chipLabel: (label, selected) => (selected ? `${label}၊ ရွေးထားသည်` : label),
  },
};
