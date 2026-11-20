// 미얀마어 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type {
  EpisodeIntroCopy,
  MessengerCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";
import type { StoryCallCopy } from "../screens/story-call/story-call.contract";
import type { StoryIntroCopy } from "../screens/story-intro/story-intro.contract";
import type { StoryMessengerCopy } from "../screens/story-messenger/story-messenger.contract";

export const episodeIntroMy: EpisodeIntroCopy = {
  guide: {
    map: "သင်ခန်းစာ စတင်ရန် နှိပ်ပါ!",
    continue: "ဆက်လုပ်ရန် မည်သည့်နေရာကိုမဆို နှိပ်ပါ",
  },
  skipDialog: {
    title: "ဇာတ်လမ်းကို ကျော်မလား။",
    description: "ကျော်လိုက်ပါက ဤအပိုင်း၏ ဇာတ်လမ်းကို ထပ်မပြတော့ပါ။",
    skip: "ကျော်ရန်",
    keepWatching: "ဆက်ကြည့်ရန်",
  },
};

export const messengerMy: MessengerCopy = {
  keyboard: {
    shift: "Shift",
    shiftOn: "Shift၊ ဖွင့်ထားသည်",
    backspace: "ဖျက်ရန်",
    period: "အစက်",
    space: "နေရာလွတ်",
    questionMark: "မေးခွန်းအမှတ်",
  },
};

export const visualNovelMy: VisualNovelCopy = {
  sceneProgress: (ordinal, total) => `အခန်း ${ordinal} / ${total}`,
};

export const roleplayMy: RoleplayCopy = {
  title: "သရုပ်ဆောင်",
  form: { story: "သရုပ်ဆောင်" },
  viewAll: "အားလုံးကြည့်ရန်",
  viewAllLabel: (sectionLabel) => `အားလုံးကြည့်ရန်၊ ${sectionLabel}`,
  plus: "Plus",
  plusTagline: "အလားတူ အခြေအနေများကို လေ့ကျင့်ပါ",
  plusSectionLabel: (sectionLabel) =>
    `${sectionLabel} Plus သရုပ်ဆောင်၊ ဤအပိုင်းနှင့် တူသော အခြေအနေများကို လေ့ကျင့်ပါ`,
  plusDialogTitle: "Plus သရုပ်ဆောင်",
  lockedSection: (name) => `${name}၊ သော့ခတ်ထားသည်၊ ဖွင့်ရန် ခရီးစဉ်တွင် ဤအပိုင်းကို ပြီးအောင်လုပ်ပါ`,
  premiumLock: { episode: "သော့ခတ်ထားသည်", payment: "Plus အတွက်သာ" },
  premiumNotice: (itemTitle) => `“${itemTitle}” သည် Plus သရုပ်ဆောင် ဖြစ်ပါသည်။ Plus ကို ယခု မရရှိနိုင်သေးပါ။`,
};

export const storyMessengerMy: StoryMessengerCopy = {
  back: "မြေပုံသို့",
  typing: (speaker) => `${speaker} စာရိုက်နေသည်`,
  replyTitle: "ဘယ်လို ပြန်ဖြေမလဲ။",
  closeReply: "ပိတ်ရန်",
  send: "ပို့ရန်",
  composerPlaceholder: "မက်ဆေ့ချ်",
  finish: "ဇာတ်လမ်း ပြီးဆုံးရန်",
};

export const storyIntroMy: StoryIntroCopy = {
  overline: (ordinal) => `ဇာတ်လမ်း · အပိုင်း ${ordinal}`,
  back: "မြေပုံသို့",
  skip: "ကျော်ရန်",
  start: "စတင်ရန်",
  skipDialog: {
    title: "ဇာတ်လမ်းကို ကျော်မလား။",
    description: "မြေပုံမှ အချိန်မရွေး ပြန်ကြည့်နိုင်ပါသည်။",
    skip: "ကျော်ရန်",
    keepWatching: "ဆက်ကြည့်ရန်",
  },
};

export const storyCallMy: StoryCallCopy = {
  incoming: "အဝင်ဖုန်း",
  answer: "ဖြေရန်",
  connecting: "ချိတ်ဆက်နေသည်…",
  callEnded: (clock) => `ဖုန်းပြောပြီး · ${clock}`,
  me: "ကျွန်ုပ်",
  mute: "အသံပိတ်ရန်",
  speaker: "စပီကာ",
  end: "ဖုန်းချရန်",
  back: "မြေပုံသို့",
  finish: "ဇာတ်လမ်း ပြီးဆုံးရန်",
};
