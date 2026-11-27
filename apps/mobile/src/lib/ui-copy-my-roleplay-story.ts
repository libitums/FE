// 미얀마어 문구표 구획 — 에피소드 롤플레이(미리보기 · 말하기 대화).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { RoleplayStoryCopy } from "../screens/roleplay-story/roleplay-story.contract";

export const roleplayStoryMy: RoleplayStoryCopy = {
  lineCount: (count) => `စကားပြော ${String(count)} ကြောင်း`,
  withCounterpart: (name) => `${name} နှင့်`,
  previewBody: (name) => `${name} နှင့်အတူ ဤအခန်းကို သရုပ်ဆောင်ပါ။ အဖြေတိုင်းကို အသံထွက် ပြောပါ။`,
  start: "သရုပ်ဆောင် စတင်ရန်",
  lineProgress: (ordinal, total) => `စာကြောင်း ${String(ordinal)} / ${String(total)}`,
  me: "ကျွန်ုပ်",
  speak: "ပြောရန်",
  stop: "ရပ်ရန်",
  listening: "နားထောင်နေသည်… ပြောပြီးရင် ထပ်နှိပ်ပါ။",
  yourLine: "သင့်စကား",
  hearIt: "နားထောင်ရန်",
  showKorean: "ကိုရီးယားလို ကြည့်ရန်",
  showHint: "အရိပ်အမြွက် ကြည့်ရန်",
  hint: (translation) => `ဤသို့ ပြောပါ: ${translation}`,
  cantSpeak: "ယခု မပြောနိုင်ပါ",
  great: "တော်လိုက်တာ",
  notQuite: "သိပ်မမှန်သေးဘူး",
  youSaid: (heard) => `သင်ပြောခဲ့သည်: ${heard}`,
  heardNothing: "သေချာ မကြားရပါ။",
  unavailable: "ယခု ပြော၍ မရပါ။ ဤစာကြောင်းကို ကျော်နိုင်ပါသည်။",
  blocked: "ဆက်တင်များတွင် ဤအက်ပ်အတွက် မိုက်ခရိုဖုန်းနှင့် အသံမှတ်သားခြင်းကို ခွင့်ပြုပါ၊ သို့မဟုတ် ဤစာကြောင်းကို ကျော်ပါ။",
  permissionTitle: "မိုက်ခရိုဖုန်း ဖွင့်ရန်",
  permissionBody: "သရုပ်ဆောင်ရာတွင် အသံထွက် ပြောရပါသည်။ ဆက်တင်များတွင် ဤအက်ပ်အတွက် မိုက်ခရိုဖုန်းနှင့် အသံမှတ်သားခြင်းကို ခွင့်ပြုပါ။",
  openSettings: "ဆက်တင်များ ဖွင့်ရန်",
  notNow: "နောက်မှ",
  unsupportedTitle: "ပြော၍ မရပါ",
  unsupportedBody: "ဤစက်တွင် ယခု အသံမှတ်သားခြင်းကို မပံ့ပိုးပါ။ အခန်းကို ကြည့်ရှုပြီး စာကြောင်းတိုင်းကို ကျော်နိုင်ပါသေးသည်။",
  startAnyway: "ဒါပေမဲ့ စတင်ရန်",
  retryHeard: "သေချာ မကြားရပါ။ မိုက်ခရိုဖုန်းကို နှိပ်ပြီး ထပ်စမ်းကြည့်ပါ။",
  playAgain: "ထပ်ကစားရန်",
};
