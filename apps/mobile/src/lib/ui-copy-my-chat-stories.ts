// 친구 스토리 줄 · 보기 · 대화 인용 문구(my, ADR-0177).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesMy: FriendStoriesCopy = {
  language: "my",
  // 낭독 조각 잇기 — 언어마다 구분자(감사 다국어 minor 9).
  listSeparator: "၊ ",
  labelSeparator: ": ",
  rowTitle: "စတိုရီများ",
  watchAll: "အားလုံးကြည့်ရန်",
  watchAllLabel: "စတိုရီအားလုံး ကြည့်ရန်",
  age: (age) =>
    age.unit === "now" ? "ယခုလေးတင်" : age.unit === "m" ? `${age.value} မိနစ်` : `${age.value} နာရီ`,
  seen: "ကြည့်ပြီး",
  newBadge: "အသစ်",
  friendLabel: (name, age, seen) => `${name}၏ စတိုရီ၊ ${age}${seen ? "၊ ကြည့်ပြီး" : "၊ အသစ်"}`,
  unmetLabel: (name) => `${name}၏ စတိုရီ၊ သူငယ်ချင်းသစ်`,
  findFriends: "သူငယ်ချင်း ရှာရန်",
  findFriendsLabel: "သူငယ်ချင်း ရှာရန်",
  listPreview: (line) => `စတိုရီအသစ် · ${line}`,
  listRowLabel: (name, line) => `${name}၊ စတိုရီအသစ်: ${line}။ စတိုရီ ဖွင့်မည်`,
  viewer: {
    label: (name) => `${name}၏ စတိုရီ`,
    progress: (index, count) => `စတိုရီ ${count} ခုထဲက ${index}`,
    pause: "ခဏရပ်ရန်",
    play: "ဖွင့်ရန်",
    close: "ပိတ်ရန်",
    previous: "ယခင် စတိုရီ",
    next: "နောက် စတိုရီ",
    photoLabel: (name) => `${name} ဆီက ဓာတ်ပုံ`,
    saveWord: (ko, meaning) => `${ko} · ${meaning} — စကားလုံး သိမ်းရန်`,
    saveWordLabel: (ko, meaning) => `${ko}၊ ${meaning} ကို ကျွန်ုပ်၏ စကားလုံးများထဲ သိမ်းရန်`,
    saved: (ko) => `${ko} ကို ကျွန်ုပ်၏ စကားလုံးများထဲ သိမ်းပြီး`,
    freeReply: "ပထမဆုံး ပြန်စာ အခမဲ့",
    replyPlaceholder: (name) => `${name} ကို ပြန်စာရေးရန်…`,
    replyChipLabel: (text) => `ပြန်စာ: ${text}`,
    newFriend: "သူငယ်ချင်းသစ်",
    addAndReply: "သူငယ်ချင်းထည့်ပြီး ပြန်စာရေးရန်",
    seeHowToMeet: "တွေ့ပုံ ကြည့်ရန်",
  },
  reply: {
    caption: (name) => `${name}၏ စတိုရီကို သင် ပြန်စာရေးခဲ့သည်`,
    storyMeta: (age) => (age === null ? "စတိုရီ" : `စတိုရီ · ${age}`),
    replying: (name) => `${name}၏ စတိုရီကို ပြန်စာရေးနေသည်`,
    removeQuote: "ကိုးကားချက် ဖယ်ရန်",
  },
};
